import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { addSlaMinutes } from './sla-calendar';

@Injectable()
export class SlaService {
  constructor(private readonly prisma: PrismaService) {}

  async handleStatusChange(ticketId: string, status: string) {
    const slas = await this.prisma.ticketSla.findMany({ where: { ticketId, resolvedAt: null }, include: { definition: { include: { calendar: true } } } });
    const now = new Date();
    for (const sla of slas) {
      const pauseStatuses = Array.isArray(sla.definition.pauseStatuses) ? sla.definition.pauseStatuses as string[] : [];
      if (pauseStatuses.includes(status) && !sla.pausedAt) {
        await this.prisma.ticketSla.update({ where: { id: sla.id }, data: { pausedAt: now, status: 'PAUSED', updatedAt: now, events: { create: { eventType: 'PAUSED', eventAt: now, details: { status } } } } });
      } else if (!pauseStatuses.includes(status) && sla.pausedAt) {
        const pausedMinutes = Math.max(1, Math.ceil((now.getTime() - sla.pausedAt.getTime()) / 60_000));
        const calendar = sla.definition.calendar;
        await this.prisma.ticketSla.update({ where: { id: sla.id }, data: { pausedAt: null, totalPausedSeconds: { increment: pausedMinutes * 60 }, responseDueAt: addSlaMinutes(sla.responseDueAt, pausedMinutes, calendar), resolutionDueAt: addSlaMinutes(sla.resolutionDueAt, pausedMinutes, calendar), status: 'IN_PROGRESS', updatedAt: now, events: { create: { eventType: 'RESUMED', eventAt: now, details: { pausedMinutes } } } } });
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateActiveSlas() {
    const now = new Date();
    const slas = await this.prisma.ticketSla.findMany({ where: { resolvedAt: null, pausedAt: null, status: { in: ['IN_PROGRESS', 'AT_RISK'] } } });
    for (const sla of slas) {
      const remaining = sla.resolutionDueAt.getTime() - now.getTime();
      const threshold = Math.max(15 * 60_000, sla.resolutionTargetMinutes * 60_000 * 0.2);
      const nextStatus = remaining <= 0 ? 'BREACHED' : remaining <= threshold ? 'AT_RISK' : 'IN_PROGRESS';
      if (nextStatus !== sla.status) await this.prisma.ticketSla.update({ where: { id: sla.id }, data: { status: nextStatus, updatedAt: now, events: { create: { eventType: nextStatus, eventAt: now } } } });
    }
  }
}
