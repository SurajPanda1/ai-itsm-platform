export interface User { id: string; name: string; email: string; roles: string[] }
export interface Session { accessToken: string; user: User }
export interface AssignmentGroup { id: string; name: string; description?: string; members: { user: Pick<User, 'id' | 'name' | 'email'> }[] }
export interface RelatedItem { id: string; relationshipType: string; direction: 'INBOUND' | 'OUTBOUND'; ticketId: string; ticketNumber: string; title: string; status?: string; ticketType?: string; createdAt: string }
export interface AdminUser { id: string; name: string; email: string; active: boolean; departmentId?: string; directRoles: { role: { id: string; name: string } }[]; assignmentGroupMemberships: { assignmentGroup: { id: string; name: string; roles: { role: { id: string; name: string } }[] } }[] }
export interface AdminGroup { id: string; name: string; description?: string; active: boolean; manager?: { id: string; name: string }; roles: { role: { id: string; name: string } }[]; members: { user: Pick<AdminUser, 'id' | 'name' | 'email' | 'active'> }[] }
export interface ReferenceData { roles: { id: string; name: string; description?: string }[]; departments: { id: string; name: string; description?: string }[]; priorities: { id: string; name: string }[]; ticketTypes: { id: string; name: string }[]; calendars: { id: string; name: string; timezone: string; calendarType: string }[] }
export interface PaginatedUsers { data: AdminUser[]; page: number; limit: number; total: number; totalPages: number }
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
