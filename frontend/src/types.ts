export interface User { id: string; name: string; email: string; role: string }
export interface Session { accessToken: string; user: User }
export interface AssignmentGroup { id: string; name: string; description?: string; members: { user: Pick<User, 'id' | 'name' | 'email'> }[] }
export interface RelatedItem { id: string; relationshipType: string; ticketId: string; ticketNumber: string; title: string; status?: string; ticketType?: string; createdAt: string }
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
}
