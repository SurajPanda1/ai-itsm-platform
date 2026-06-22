import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { Roles } from '../auth/roles';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest<{ user: AuthUser }>().user;
    if (!user.roles.includes(Roles.Admin)) throw new ForbiddenException('Administrator access required');
    return true;
  }
}
