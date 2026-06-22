export interface User { id: string; name: string; email: string; roles: string[] }
export interface Branding { organizationName: string; logoUrl?: string; faviconUrl?: string; primaryColor?: string; accentColor?: string; portalTitle?: string; welcomeMessage?: string; supportEmail?: string; supportPhone?: string; showPoweredBy?: boolean; themeMode?: 'DARK'|'LIGHT'|'SYSTEM' }
export interface Attachment { id: string; fileName: string; contentType: string; sizeBytes: number; createdAt: string; uploadedBy: { id: string; name: string } }
export interface AnalyticsReport { scope:'ORGANIZATION'|'MY_GROUPS';period:{from:string;to:string};kpis:{total:number;open:number;resolved:number;critical:number;averageResponseMinutes:number|null;averageResolutionMinutes:number|null;slaMet:number;slaAtRisk:number;slaBreached:number};byStatus:{name:string;value:number}[];byPriority:{name:string;value:number}[];byGroup:{name:string;value:number}[];byAssignee:{name:string;value:number}[];trend:{date:string;created:number;resolved:number}[];aging:{name:string;value:number}[];filters:{groups:{id:string;name:string}[];priorities:{id:string;name:string}[];assignees:{id:string;name:string}[]}}
export interface Session { accessToken: string; user: User }
export interface AssignmentGroup { id: string; name: string; description?: string; members: { user: Pick<User, 'id' | 'name' | 'email'> }[] }
export interface RelatedItem { id: string; relationshipType: string; direction: 'INBOUND' | 'OUTBOUND'; ticketId: string; ticketNumber: string; title: string; status?: string; ticketType?: string; createdAt: string }
export interface AdminUser { id: string; name: string; email: string; active: boolean; departmentId?: string; directRoles: { role: { id: string; name: string } }[]; assignmentGroupMemberships: { assignmentGroup: { id: string; name: string; roles: { role: { id: string; name: string } }[] } }[] }
export interface AdminGroup { id: string; name: string; description?: string; active: boolean; manager?: { id: string; name: string }; roles: { role: { id: string; name: string } }[]; members: { user: Pick<AdminUser, 'id' | 'name' | 'email' | 'active'> }[] }
export interface ReferenceData { roles: { id: string; name: string; description?: string }[]; departments: { id: string; name: string; description?: string }[]; priorities: { id: string; name: string }[]; ticketTypes: { id: string; name: string }[]; calendars: { id: string; name: string; timezone: string; calendarType: string }[] }
export interface PaginatedUsers { data: AdminUser[]; page: number; limit: number; total: number; totalPages: number }
export interface PaginatedGroups { data: AdminGroup[]; page: number; limit: number; total: number; totalPages: number }
export interface OrganizationSettings { organizationName: string; branding: { logoUrl?: string; faviconUrl?: string; primaryColor?: string; accentColor?: string; portalTitle?: string; welcomeMessage?: string; supportEmail?: string; supportPhone?: string; timezone?: string; showPoweredBy?: boolean; themeMode?: 'DARK'|'LIGHT'|'SYSTEM' }; attachments: { enabled?: boolean; provider?: 'NONE'|'S3'|'AZURE_BLOB'|'GCS'|'MINIO'|'LOCAL'; bucket?: string; region?: string; endpoint?: string; maxFileSizeMb?: number } }
export interface SlaDefinition { id: string; name: string; version: number; active: boolean; responseTargetMinutes: number; resolutionTargetMinutes: number; priority?: { id: string; name: string }; ticketType?: { id: string; name: string }; calendar: { id: string; name: string; timezone: string; calendarType: string } }
export interface Incident {
  id: string;
  ticketNumber: string;
  title: string;
  description?: string;
  createdAt: string;
  status?: { name: string };
  priority?: { name: string };
  createdBy: Pick<User, 'id' | 'name' | 'email'>;
  assignedTo?: Pick<User, 'id' | 'name' | 'email'>;
  assignmentGroup?: { id: string; name: string };
  incident?: { impact?: string; urgency?: string; affectedService?: string; resolutionNotes?: string };
  activities: { id: string; comment: string; createdAt: string; createdBy: Pick<User, 'id' | 'name'>; activityType?: { name: string } }[];
  slas: { id: string; definitionName: string; responseDueAt: string; resolutionDueAt: string; firstRespondedAt?: string; resolvedAt?: string; status: string }[];
}
