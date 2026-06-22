import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('assignment-groups')
@UseGuards(JwtAuthGuard)
export class AssignmentGroupsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.prisma.assignmentGroup.findMany({
      where: { organizationId: user.organizationId, active: true },
      select: {
        id: true,
        name: true,
        description: true,
        members: { select: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
