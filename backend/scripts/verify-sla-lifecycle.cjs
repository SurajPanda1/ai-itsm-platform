const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const suffix = Date.now().toString(36).toUpperCase();
  let calendarId, definitionId, ticketId;
  try {
    const [organization, user, type, priority, status] = await Promise.all([
      prisma.organization.findFirst(), prisma.user.findFirst(), prisma.ticketType.findUnique({ where: { name: 'INCIDENT' } }), prisma.priority.findUnique({ where: { name: 'LOW' } }), prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: 'OPEN' } } }),
    ]);
    if (!organization || !user || !type || !priority || !status) throw new Error('Required reference data is missing');
    const calendar = await prisma.businessCalendar.create({ data: { organizationId: organization.id, name: `VERIFY-${suffix}`, timezone: 'Asia/Kolkata', calendarType: 'BUSINESS_HOURS', weeklySchedule: { MONDAY: [{ start: '09:00', end: '17:00' }] }, holidays: [] } }); calendarId = calendar.id;
    const definition = await prisma.slaDefinition.create({ data: { organizationId: organization.id, name: `VERIFY-${suffix}`, ticketTypeId: type.id, priorityId: priority.id, calendarId, responseTargetMinutes: 15, resolutionTargetMinutes: 60, pauseStatuses: ['AWAITING_CUSTOMER'] } }); definitionId = definition.id;
    const ticket = await prisma.ticket.create({ data: { organizationId: organization.id, createdById: user.id, ticketNumber: `TST${suffix}`.slice(0,20), title: 'Temporary SLA verification', statusId: status.id, ticketTypeId: type.id, priorityId: priority.id, incident: { create: {} } } }); ticketId = ticket.id;
    const now = new Date();
    const ticketSla = await prisma.ticketSla.create({ data: { ticketId, slaDefinitionId: definitionId, definitionName: definition.name, definitionVersion: 1, responseTargetMinutes: 15, resolutionTargetMinutes: 60, startedAt: now, responseDueAt: new Date(now.getTime()+900000), resolutionDueAt: new Date(now.getTime()+3600000), events: { create: { eventType: 'STARTED' } } } });
    await prisma.ticketSla.update({ where: { id: ticketSla.id }, data: { pausedAt: new Date(), status: 'PAUSED', events: { create: { eventType: 'PAUSED' } } } });
    await prisma.ticketSla.update({ where: { id: ticketSla.id }, data: { pausedAt: null, status: 'IN_PROGRESS', totalPausedSeconds: 60, events: { create: { eventType: 'RESUMED' } } } });
    const events = await prisma.slaEvent.count({ where: { ticketSlaId: ticketSla.id } });
    if (events !== 3) throw new Error(`Expected 3 SLA events, found ${events}`);
    console.log(JSON.stringify({ verified: true, events, cleanup: 'pending' }));
  } finally {
    if (ticketId) await prisma.ticket.delete({ where: { id: ticketId } }).catch(()=>{});
    if (definitionId) await prisma.slaDefinition.delete({ where: { id: definitionId } }).catch(()=>{});
    if (calendarId) await prisma.businessCalendar.delete({ where: { id: calendarId } }).catch(()=>{});
    await prisma.$disconnect();
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
