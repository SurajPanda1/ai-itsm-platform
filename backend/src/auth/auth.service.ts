import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './login.dto';
import { Roles } from './roles';

type EffectiveUser = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  passwordHash: string;
  directRoles: { role: { name: string } }[];
  assignmentGroupMemberships: { assignmentGroup: { roles: { role: { name: string } }[] } }[];
};

const effectiveRoleInclude = {
  directRoles: { include: { role: true } },
  assignmentGroupMemberships: {
    include: { assignmentGroup: { include: { roles: { include: { role: true } } } } },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase(), active: true }, include: effectiveRoleInclude });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueSession(user);
  }

  async refresh(refreshToken: string) {
    let payload: { id: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.config.getOrThrow<string>('JWT_SECRET') });
    } catch {
      throw new UnauthorizedException('Refresh session expired');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid refresh session');
    const user = await this.prisma.user.findUnique({ where: { id: payload.id, active: true }, include: effectiveRoleInclude });
    if (!user) throw new UnauthorizedException('User no longer exists');
    return this.issueSession(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (currentPassword === newPassword) {
      throw new UnauthorizedException('New password must be different from the current password');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId, active: true }, select: { id: true, passwordHash: true } });
    if (!user || !(await compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(newPassword, 12) } });
    return { changed: true };
  }

  private async issueSession(user: EffectiveUser) {
    const roles = new Set<string>([Roles.Employee]);
    user.directRoles.forEach((grant) => roles.add(grant.role.name));
    user.assignmentGroupMemberships.forEach((membership) =>
      membership.assignmentGroup.roles.forEach((grant) => roles.add(grant.role.name)),
    );
    const effectiveRoles = [...roles];
    const payload = { id: user.id, organizationId: user.organizationId, email: user.email, roles: effectiveRoles };
    return {
      accessToken: await this.jwt.signAsync({ ...payload, type: 'access' }, { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: '1h' }),
      refreshToken: await this.jwt.signAsync({ id: user.id, type: 'refresh' }, { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: '12h' }),
      user: { id: user.id, name: user.name, email: user.email, roles: effectiveRoles },
    };
  }
}
