import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('search')
  search(@CurrentUser() user: AuthUser, @Query('q') q = '') {
    const term = q.trim();
    return this.prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
              ],
            }
          : { id: user.id }),
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }
}
