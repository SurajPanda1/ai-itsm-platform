import { BadRequestException } from '@nestjs/common';

export function validateTicketRelationship(parentId: string, relatedId: string, duplicate: boolean) {
  if (parentId === relatedId) throw new BadRequestException('A ticket cannot be related to itself');
  if (duplicate) throw new BadRequestException('This ticket relationship already exists');
}
