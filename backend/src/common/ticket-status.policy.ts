import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';

export function enforceClosedTicketPolicy(
  user: AuthUser,
  currentStatus: string | undefined,
  nextStatus: string,
) {
  const isReopening = currentStatus === 'CLOSED' && nextStatus !== 'CLOSED';
  if (isReopening && user.role !== 'ADMIN') {
    throw new ForbiddenException('Only an administrator can reopen a closed ticket');
  }
}
