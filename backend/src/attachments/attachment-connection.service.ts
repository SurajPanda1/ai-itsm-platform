import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { Storage } from '@google-cloud/storage';
import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

export type StorageConnection = { provider?: string; bucket?: string; region?: string; endpoint?: string };

@Injectable()
export class AttachmentConnectionService {
  constructor(private readonly config: ConfigService) {}

  async test(input: StorageConnection) {
    const provider = input.provider ?? 'NONE';
    if (!input.bucket) throw new BadRequestException(provider === 'LOCAL' ? 'Storage path is required' : 'Bucket or container is required');
    try {
      if (provider === 'S3' || provider === 'MINIO') {
        const client = new S3Client({ region: input.region || 'us-east-1', endpoint: input.endpoint || undefined, forcePathStyle: provider === 'MINIO', ...(provider === 'MINIO' && this.config.get('S3_ACCESS_KEY_ID') ? { credentials: { accessKeyId: this.config.getOrThrow('S3_ACCESS_KEY_ID'), secretAccessKey: this.config.getOrThrow('S3_SECRET_ACCESS_KEY') } } : {}) });
        await client.send(new HeadBucketCommand({ Bucket: input.bucket }));
      } else if (provider === 'AZURE_BLOB') {
        const connectionString = this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING');
        const accountUrl = input.endpoint || this.config.get<string>('AZURE_STORAGE_ACCOUNT_URL');
        if (!connectionString && !accountUrl) throw new BadRequestException('Set AZURE_STORAGE_CONNECTION_STRING or provide the Azure storage account URL');
        const service = connectionString ? BlobServiceClient.fromConnectionString(connectionString) : new BlobServiceClient(accountUrl!, new DefaultAzureCredential());
        await service.getContainerClient(input.bucket).getProperties();
      } else if (provider === 'GCS') {
        await new Storage().bucket(input.bucket).getMetadata();
      } else if (provider === 'LOCAL') {
        const path = resolve(input.bucket);
        await mkdir(path, { recursive: true });
        await access(path, constants.R_OK | constants.W_OK);
      } else {
        throw new BadRequestException('Select a storage provider first');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const reason = error instanceof Error ? error.message : 'Unknown provider error';
      throw new BadGatewayException(`Could not connect to ${provider} storage: ${reason}`);
    }
    return { connected: true, provider, checkedAt: new Date().toISOString() };
  }
}
