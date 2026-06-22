import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { Storage } from '@google-cloud/storage';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth-user';
import { canAccessInternalTicketData } from '../common/ticket-access.policy';

type Settings = { enabled?: boolean; provider?: string; bucket?: string; region?: string; endpoint?: string; maxFileSizeMb?: number };
type UploadFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

@Injectable()
export class AttachmentStorageService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private async context(user: AuthUser, ticketId: string) {
    const [organization, ticket] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId }, select: { attachmentSettings: true } }),
      this.prisma.ticket.findFirst({ where: { id: ticketId, organizationId: user.organizationId, ...(canAccessInternalTicketData(user) ? {} : { createdById: user.id }) }, select: { id: true } }),
    ]);
    if (!ticket) throw new ForbiddenException('You cannot access this ticket');
    const settings = organization.attachmentSettings as Settings;
    if (!settings.enabled || !settings.provider || settings.provider === 'NONE' || !settings.bucket) throw new BadRequestException('Attachments are not configured for this organisation');
    return settings;
  }

  private async organizationSettings(organizationId: string) {
    const organization = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { attachmentSettings: true } });
    const settings = organization.attachmentSettings as Settings;
    if (!settings.enabled || !settings.provider || settings.provider === 'NONE' || !settings.bucket) throw new BadRequestException('Storage must be configured and enabled before uploading branding assets');
    return settings;
  }

  async putBrandAsset(organizationId: string, kind: 'logo'|'favicon', file?: UploadFile) {
    if (!file) throw new BadRequestException('Select an image to upload');
    if (!['image/png','image/jpeg','image/webp','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'].includes(file.mimetype)) throw new BadRequestException('Branding assets must be PNG, JPEG, WebP, SVG, or ICO images');
    if (file.size > 2 * 1024 * 1024) throw new BadRequestException('Branding assets cannot exceed 2 MB');
    const settings = await this.organizationSettings(organizationId);
    const extension = file.originalname.split('.').pop()?.replace(/[^a-z0-9]/gi,'').toLowerCase() || 'bin';
    const key = `${organizationId}/branding/${kind}.${extension}`;
    await this.put(settings,key,file.buffer,file.mimetype);
    return { key, contentType: file.mimetype };
  }

  async getBrandAsset(organizationId: string, key: string) {
    const settings = await this.organizationSettings(organizationId);
    return this.get(settings,key);
  }

  async removeBrandAsset(organizationId: string, key: string) {
    const settings = await this.organizationSettings(organizationId);
    await this.remove(settings,key);
  }

  async list(user: AuthUser, ticketId: string) {
    await this.context(user, ticketId);
    return this.prisma.ticketAttachment.findMany({ where: { ticketId, organizationId: user.organizationId }, select: { id: true, fileName: true, contentType: true, sizeBytes: true, createdAt: true, uploadedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async upload(user: AuthUser, ticketId: string, file?: UploadFile) {
    if (!file) throw new BadRequestException('Select a file to upload');
    const settings = await this.context(user, ticketId);
    const maxBytes = (settings.maxFileSizeMb ?? 10) * 1024 * 1024;
    if (file.size > maxBytes) throw new BadRequestException(`File exceeds the ${settings.maxFileSizeMb ?? 10} MB limit`);
    if (/\.(exe|dll|bat|cmd|ps1|sh|msi|com|scr|jar)$/i.test(file.originalname)) throw new BadRequestException('This file type is not allowed');
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${user.organizationId}/${ticketId}/${randomUUID()}-${safeName}`;
    await this.put(settings, key, file.buffer, file.mimetype || 'application/octet-stream');
    try {
      const attachment = await this.prisma.ticketAttachment.create({ data: { organizationId: user.organizationId, ticketId, uploadedById: user.id, storageKey: key, fileName: file.originalname, contentType: file.mimetype || 'application/octet-stream', sizeBytes: file.size }, select: { id: true, fileName: true, contentType: true, sizeBytes: true, createdAt: true, uploadedBy: { select: { id: true, name: true } } } });
      await this.prisma.auditLog.create({ data: { organizationId: user.organizationId, tableName: 'ticket_attachments', recordId: attachment.id, action: 'UPLOAD', newValue: { ticketId, fileName: file.originalname, sizeBytes: file.size }, changedById: user.id } });
      return attachment;
    } catch (error) { await this.remove(settings, key).catch(() => undefined); throw error; }
  }

  async download(user: AuthUser, ticketId: string, id: string) {
    const settings = await this.context(user, ticketId);
    const attachment = await this.prisma.ticketAttachment.findFirst({ where: { id, ticketId, organizationId: user.organizationId } });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return { attachment, body: await this.get(settings, attachment.storageKey) };
  }

  async delete(user: AuthUser, ticketId: string, id: string) {
    const settings = await this.context(user, ticketId);
    const attachment = await this.prisma.ticketAttachment.findFirst({ where: { id, ticketId, organizationId: user.organizationId } });
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.uploadedById !== user.id && !canAccessInternalTicketData(user)) throw new ForbiddenException('Only the uploader or service desk can delete this attachment');
    await this.remove(settings, attachment.storageKey);
    await this.prisma.$transaction([this.prisma.ticketAttachment.delete({ where: { id } }), this.prisma.auditLog.create({ data: { organizationId: user.organizationId, tableName: 'ticket_attachments', recordId: id, action: 'DELETE', oldValue: { ticketId, fileName: attachment.fileName }, changedById: user.id } })]);
    return { deleted: true };
  }

  private s3(settings: Settings) { return new S3Client({ region: settings.region || 'us-east-1', endpoint: settings.endpoint || undefined, forcePathStyle: settings.provider === 'MINIO', ...(settings.provider === 'MINIO' && this.config.get('S3_ACCESS_KEY_ID') ? { credentials: { accessKeyId: this.config.getOrThrow('S3_ACCESS_KEY_ID'), secretAccessKey: this.config.getOrThrow('S3_SECRET_ACCESS_KEY') } } : {}) }); }
  private azure(settings: Settings) { const value = this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING'); return value ? BlobServiceClient.fromConnectionString(value) : new BlobServiceClient(settings.endpoint || this.config.getOrThrow('AZURE_STORAGE_ACCOUNT_URL'), new DefaultAzureCredential()); }
  private localPath(settings: Settings, key: string) { return join(resolve(settings.bucket!), ...key.split('/')); }
  private async put(s: Settings, key: string, body: Buffer, type: string) { if (s.provider === 'S3' || s.provider === 'MINIO') await this.s3(s).send(new PutObjectCommand({ Bucket: s.bucket, Key: key, Body: body, ContentType: type })); else if (s.provider === 'AZURE_BLOB') await this.azure(s).getContainerClient(s.bucket!).getBlockBlobClient(key).uploadData(body, { blobHTTPHeaders: { blobContentType: type } }); else if (s.provider === 'GCS') await new Storage().bucket(s.bucket!).file(key).save(body, { contentType: type }); else if (s.provider === 'LOCAL') { const path = this.localPath(s,key); await mkdir(dirname(path),{recursive:true}); await writeFile(path,body); } else throw new BadRequestException('Unsupported storage provider'); }
  private async get(s: Settings, key: string) { if (s.provider === 'S3' || s.provider === 'MINIO') { const value=await this.s3(s).send(new GetObjectCommand({Bucket:s.bucket,Key:key})); return Buffer.from(await value.Body!.transformToByteArray()); } if(s.provider==='AZURE_BLOB') return this.azure(s).getContainerClient(s.bucket!).getBlockBlobClient(key).downloadToBuffer(); if(s.provider==='GCS') return (await new Storage().bucket(s.bucket!).file(key).download())[0]; if(s.provider==='LOCAL') return readFile(this.localPath(s,key)); throw new BadRequestException('Unsupported storage provider'); }
  private async remove(s: Settings, key: string) { if (s.provider === 'S3' || s.provider === 'MINIO') await this.s3(s).send(new DeleteObjectCommand({Bucket:s.bucket,Key:key})); else if(s.provider==='AZURE_BLOB') await this.azure(s).getContainerClient(s.bucket!).deleteBlob(key); else if(s.provider==='GCS') await new Storage().bucket(s.bucket!).file(key).delete({ignoreNotFound:true}); else if(s.provider==='LOCAL') await unlink(this.localPath(s,key)); }
}
