import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AttachmentStorageService } from './attachments/attachment-storage.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService, private readonly attachmentStorage: AttachmentStorageService) {}
  getHealth() {
    return { status: 'ok', service: 'ai-itsm-backend' };
  }

  async getBranding(domain?: string) {
    const organization = await this.prisma.organization.findFirst({ where: domain && !['localhost','127.0.0.1'].includes(domain) ? { domain } : undefined, select: { id: true, name: true, brandingSettings: true }, orderBy: { createdAt: 'asc' } });
    if (!organization) return { organizationName: 'Nextris', portalTitle: 'Nextris Sevā', welcomeMessage: 'How can we help?', primaryColor: '#3448c5', accentColor: '#16a394', showPoweredBy: true };
    const branding = organization.brandingSettings as Record<string, unknown>;
    return { organizationName: organization.name, ...branding, ...(branding.logoKey ? { logoUrl: `/api/branding/assets/${organization.id}/logo` } : {}), ...(branding.faviconKey ? { faviconUrl: `/api/branding/assets/${organization.id}/favicon` } : {}) };
  }

  async getBrandAsset(organizationId: string, kind: 'logo'|'favicon') {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { brandingSettings: true } });
    const branding = organization?.brandingSettings as Record<string, unknown> | undefined;
    const key = branding?.[`${kind}Key`];
    if (!organization || typeof key !== 'string') return null;
    return { body: await this.attachmentStorage.getBrandAsset(organizationId,key), contentType: String(branding?.[`${kind}ContentType`] || 'application/octet-stream') };
  }
}
