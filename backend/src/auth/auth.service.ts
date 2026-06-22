import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() }, include: { role: true } });
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
    const user = await this.prisma.user.findUnique({ where: { id: payload.id }, include: { role: true } });
    if (!user) throw new UnauthorizedException('User no longer exists');
    return this.issueSession(user);
  }

  private async issueSession(user: { id: string; organizationId: string; email: string; name: string; role: { name: string } }) {
    const payload = { id: user.id, organizationId: user.organizationId, email: user.email, role: user.role.name };
    return {
      accessToken: await this.jwt.signAsync({ ...payload, type: 'access' }, { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: '1h' }),
      refreshToken: await this.jwt.signAsync({ id: user.id, type: 'refresh' }, { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: '12h' }),
      user: { id: user.id, name: user.name, email: user.email, role: user.role.name },
    };
  }
}
