import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { serviceDeskRoles } from '../auth/roles';
@Injectable()
export class AnalyticsGuard implements CanActivate {
  canActivate(context: ExecutionContext) { const user=context.switchToHttp().getRequest<{user:AuthUser}>().user;if(!user.roles.some(role=>serviceDeskRoles.includes(role)))throw new ForbiddenException('Analytics access requires a service desk role');return true; }
}
