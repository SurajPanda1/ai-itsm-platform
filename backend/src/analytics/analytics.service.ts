import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth-user';
import { Roles } from '../auth/roles';

export type AnalyticsFilters={from?:string;to?:string;status?:string;priorityId?:string;groupId?:string;assigneeId?:string;module?:string};
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma:PrismaService){}
  async report(user:AuthUser,filters:AnalyticsFilters){
    const to=filters.to?new Date(`${filters.to}T23:59:59.999Z`):new Date();const from=filters.from?new Date(`${filters.from}T00:00:00.000Z`):new Date(to.getTime()-29*86400000);
    const unrestricted=user.roles.includes(Roles.Admin)||user.roles.includes(Roles.ServiceManager);
    const memberships=unrestricted?[]:await this.prisma.assignmentGroupMember.findMany({where:{userId:user.id},select:{assignmentGroupId:true}});
    const groupIds=memberships.map(value=>value.assignmentGroupId);
    const ticketTypeName=filters.module==='SERVICE_REQUEST'?'SERVICE_REQUEST':'INCIDENT';
    const where:Prisma.TicketWhereInput={organizationId:user.organizationId,ticketType:{name:ticketTypeName},createdAt:{gte:from,lte:to},...(unrestricted?{}:{assignmentGroupId:{in:groupIds}}),...(filters.status?{status:{name:filters.status}}:{}),...(filters.priorityId?{priorityId:filters.priorityId}:{}),...(filters.groupId?{assignmentGroupId:filters.groupId}:{}),...(filters.assigneeId?{assignedToId:filters.assigneeId}:{})};
    const [tickets,groups,priorities,assignees]=await Promise.all([
      this.prisma.ticket.findMany({where,select:{id:true,ticketNumber:true,title:true,createdAt:true,status:{select:{name:true}},priority:{select:{id:true,name:true}},assignmentGroup:{select:{id:true,name:true}},assignedTo:{select:{id:true,name:true}},incident:{select:{resolvedAt:true}},slas:{select:{status:true,startedAt:true,firstRespondedAt:true,resolvedAt:true,totalPausedSeconds:true}}},orderBy:{createdAt:'desc'}}),
      this.prisma.assignmentGroup.findMany({where:{organizationId:user.organizationId,active:true,...(unrestricted?{}:{id:{in:groupIds}})},select:{id:true,name:true},orderBy:{name:'asc'}}),
      this.prisma.priority.findMany({select:{id:true,name:true},orderBy:{level:'asc'}}),
      this.prisma.user.findMany({where:{organizationId:user.organizationId,active:true,...(unrestricted?{}:{assignmentGroupMemberships:{some:{assignmentGroupId:{in:groupIds}}}})},select:{id:true,name:true},orderBy:{name:'asc'}}),
    ]);
    const resolved=tickets.filter(t=>['RESOLVED','CLOSED'].includes(t.status?.name||''));
    const slaRecords=tickets.flatMap(t=>t.slas);const responseMinutes=slaRecords.filter(s=>s.firstRespondedAt).map(s=>(s.firstRespondedAt!.getTime()-s.startedAt.getTime())/60000);const resolutionMinutes=slaRecords.filter(s=>s.resolvedAt).map(s=>(s.resolvedAt!.getTime()-s.startedAt.getTime()-s.totalPausedSeconds*1000)/60000);const average=(values:number[])=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;
    const trend=new Map<string,{date:string;created:number;resolved:number}>();for(let cursor=new Date(from);cursor<=to;cursor=new Date(cursor.getTime()+86400000)){const date=cursor.toISOString().slice(0,10);trend.set(date,{date,created:0,resolved:0})}tickets.forEach(t=>{const created=trend.get(t.createdAt.toISOString().slice(0,10));if(created)created.created++;const date=t.incident?.resolvedAt?.toISOString().slice(0,10);if(date&&trend.has(date))trend.get(date)!.resolved++});
    const now=Date.now();const open=tickets.filter(t=>!['RESOLVED','CLOSED'].includes(t.status?.name||''));const ageDays=(date:Date)=>(now-date.getTime())/86400000;
    const by=(key:(ticket:typeof tickets[number])=>string)=>Object.entries(tickets.reduce<Record<string,number>>((result,ticket)=>{const value=key(ticket);result[value]=(result[value]||0)+1;return result},{})).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
    return {scope:unrestricted?'ORGANIZATION':'MY_GROUPS',module:ticketTypeName,period:{from:from.toISOString(),to:to.toISOString()},kpis:{total:tickets.length,open:open.length,resolved:resolved.length,critical:tickets.filter(t=>t.priority?.name==='CRITICAL').length,averageResponseMinutes:average(responseMinutes),averageResolutionMinutes:average(resolutionMinutes),slaMet:slaRecords.filter(s=>s.status==='MET').length,slaAtRisk:slaRecords.filter(s=>s.status==='AT_RISK').length,slaBreached:slaRecords.filter(s=>s.status==='BREACHED').length},byStatus:by(t=>t.status?.name||'UNKNOWN'),byPriority:by(t=>t.priority?.name||'Unspecified'),byGroup:by(t=>t.assignmentGroup?.name||'Unassigned'),byAssignee:by(t=>t.assignedTo?.name||'Unassigned'),trend:[...trend.values()],aging:[{name:'0-2 days',value:open.filter(t=>ageDays(t.createdAt)<3).length},{name:'3-7 days',value:open.filter(t=>ageDays(t.createdAt)>=3&&ageDays(t.createdAt)<8).length},{name:'8-14 days',value:open.filter(t=>ageDays(t.createdAt)>=8&&ageDays(t.createdAt)<15).length},{name:'15+ days',value:open.filter(t=>ageDays(t.createdAt)>=15).length}],filters:{groups,priorities,assignees},tickets};
  }
  async csv(user:AuthUser,filters:AnalyticsFilters){const report=await this.report(user,filters);const quote=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;return ['Number,Title,Status,Priority,Assignment Group,Assignee,Created,Resolved',...report.tickets.map(t=>[t.ticketNumber,t.title,t.status?.name,t.priority?.name,t.assignmentGroup?.name,t.assignedTo?.name,t.createdAt.toISOString(),t.incident?.resolvedAt?.toISOString()].map(quote).join(','))].join('\n');}
}
