export interface User { id: string; name: string; email: string; roles: string[] }
export interface Branding { organizationName: string; logoUrl?: string; faviconUrl?: string; primaryColor?: string; accentColor?: string; portalTitle?: string; welcomeMessage?: string; supportEmail?: string; supportPhone?: string; showPoweredBy?: boolean; themeMode?: 'DARK'|'LIGHT'|'SYSTEM' }
export interface Attachment { id: string; fileName: string; contentType: string; sizeBytes: number; createdAt: string; uploadedBy: { id: string; name: string } }
export interface KnowledgeArticle { id: string; articleNumber: string; title: string; category: string; status: 'DRAFT'|'PUBLISHED'|'ARCHIVED'; visibility?: 'EMPLOYEES'|'IT_AGENTS'|'IT_MANAGERS'|'ADMINS'; summary?: string; content?: string; keywords?: string; createdAt: string; updatedAt: string; publishedAt?: string; createdBy?: Pick<User, 'id' | 'name' | 'email'>; updatedBy?: Pick<User, 'id' | 'name' | 'email'> }
export interface PaginatedKnowledgeArticles { data: KnowledgeArticle[]; page: number; limit: number; total: number; totalPages: number }
export interface TicketKnowledgeLink { id: string; linkedAt: string; linkedBy: Pick<User, 'id' | 'name'>; article: Pick<KnowledgeArticle, 'id' | 'articleNumber' | 'title' | 'category' | 'status' | 'summary'> }
export interface AnalyticsReport { scope:'ORGANIZATION'|'MY_GROUPS';module?:'INCIDENT'|'SERVICE_REQUEST'|'PROBLEM'|'CHANGE';period:{from:string;to:string};kpis:{total:number;open:number;resolved:number;critical:number;averageResponseMinutes:number|null;averageResolutionMinutes:number|null;slaMet:number;slaAtRisk:number;slaBreached:number};byStatus:{name:string;value:number}[];byPriority:{name:string;value:number}[];byGroup:{name:string;value:number}[];byAssignee:{name:string;value:number}[];trend:{date:string;created:number;resolved:number}[];aging:{name:string;value:number}[];filters:{groups:{id:string;name:string}[];priorities:{id:string;name:string}[];assignees:{id:string;name:string}[]}}
export interface Session { accessToken: string; user: User }
export interface AssignmentGroup { id: string; name: string; description?: string; members: { user: Pick<User, 'id' | 'name' | 'email'> }[] }
export interface ServiceApprovalRule { id: string; sequence: number; approvalType: 'MANAGER'|'GROUP'|'SPECIFIC_USER'; approvalGroupId?: string; specificApproverId?: string; active: boolean; approvalGroup?: { id: string; name: string }; specificApprover?: Pick<User, 'id' | 'name' | 'email'> }
export interface ChangeApprovalRule { id: string; sequence: number; approvalType: 'MANAGER'|'GROUP'|'SPECIFIC_USER'|'CAB'|'SECURITY'|'ITAM'; approvalGroupId?: string; specificApproverId?: string; active: boolean; approvalGroup?: { id: string; name: string }; specificApprover?: Pick<User, 'id' | 'name' | 'email'> }
export interface ConfigurationItem { id: string; ciNumber?: string; name: string; ciType?: string; category?: { id: string; name: string }; type?: { id: string; name: string }; status?: { id: string; name: string }; owner?: Pick<User, 'id' | 'name' | 'email'>; environment?: string; criticality?: string; description?: string; active?: boolean; relationshipCount?: number; parents?: CmdbCiRelation[]; children?: CmdbCiRelation[]; relatedIncidents?: CmdbRelatedTicket[]; relatedProblems?: CmdbRelatedTicket[]; relatedChanges?: CmdbRelatedTicket[]; openRelationshipCount?: number }
export interface CmdbCategory { id: string; name: string; description?: string; active?: boolean }
export interface CmdbType { id: string; name: string; description?: string; active?: boolean; categoryId: string; category?: CmdbCategory }
export interface CmdbRelationshipTypeLookup { id: string; name: string; description?: string; active?: boolean }
export interface CmdbLookupData { categories: CmdbCategory[]; types: CmdbType[]; statuses: { id: string; name: string }[]; relationshipTypes: CmdbRelationshipTypeLookup[] }
export interface AdminCmdbSettings { categories: CmdbCategory[]; types: CmdbType[]; relationshipTypes: CmdbRelationshipTypeLookup[] }
export interface CmdbPaginatedItems { data: ConfigurationItem[]; page: number; limit: number; total: number; totalPages: number }
export interface CmdbRelationship { id: string; parentCi: Pick<ConfigurationItem, 'id' | 'name' | 'ciNumber'>; relationshipType: { id: string; name: string }; childCi: Pick<ConfigurationItem, 'id' | 'name' | 'ciNumber'>; status: string; description?: string; createdBy: { id: string; name: string }; createdAt: string; updatedAt: string }
export interface CmdbCiRelation { id: string; relationshipType: string; status: string; ci: Pick<ConfigurationItem, 'id' | 'name' | 'ciNumber'> }
export interface CmdbRelatedTicket { id: string; ticketNumber: string; title: string; status?: string; assignmentGroup?: { id: string; name: string } }
export interface CmdbImportPreviewRow { rowNumber: number; raw: Record<string, string>; valid: boolean; errors: string[]; normalized: Record<string, string> }
export interface CmdbImportPreview { totalRows: number; validRows: number; failedRows: number; createdRecords?: number; skippedRecords?: number; rows?: CmdbImportPreviewRow[]; errors: { rowNumber: number; reason: string }[] }
export interface RequestTask { id: string; taskNumber: string; title: string; description?: string; status: string; createdAt: string; assignmentGroup?: { id: string; name: string }; assignedTo?: Pick<User, 'id' | 'name' | 'email'> }
export interface ProblemTask { id: string; taskNumber: string; title: string; description?: string; status: string; createdAt: string; assignmentGroup?: { id: string; name: string }; assignedTo?: Pick<User, 'id' | 'name' | 'email'> }
export interface ServiceApproval { id: string; sequence: number; approvalType: string; status: string; approver?: Pick<User, 'id' | 'name' | 'email'>; decisionComment?: string; decidedAt?: string }
export interface ChangeApproval { id: string; sequence: number; approvalType: string; status: string; approver?: Pick<User, 'id' | 'name' | 'email'>; decisionComment?: string; decidedAt?: string }
export interface ServiceCatalogItem { id: string; name: string; description?: string; formSchema?: unknown[]; taskTemplates?: unknown[]; approvalRules?: ServiceApprovalRule[]; defaultAssignmentGroup?: { id: string; name: string } }
export interface ServiceCatalogCategory { id: string; name: string; description?: string; items: ServiceCatalogItem[] }
export interface RelatedItem { id: string; relationshipType: string; direction: 'INBOUND' | 'OUTBOUND'; ticketId: string; ticketNumber: string; title: string; status?: string; ticketType?: string; assignmentGroup?: string; createdAt: string }
export interface AdminUser { id: string; name: string; email: string; phone?: string; active: boolean; departmentId?: string; managerId?: string; managerRequiredExempt?: boolean; manager?: { id: string; name: string; email: string }; directRoles: { role: { id: string; name: string } }[]; assignmentGroupMemberships: { assignmentGroup: { id: string; name: string; roles: { role: { id: string; name: string } }[] } }[] }
export interface AdminGroup { id: string; name: string; description?: string; email?: string; phone?: string; groupType?: 'FULFILLMENT'|'APPROVAL'|'BOTH'; active: boolean; manager?: { id: string; name: string; email?: string }; roles: { role: { id: string; name: string } }[]; members: { user: Pick<AdminUser, 'id' | 'name' | 'email' | 'active'> }[] }
export interface ReferenceData { roles: { id: string; name: string; description?: string }[]; departments: { id: string; name: string; description?: string }[]; priorities: { id: string; name: string }[]; ticketTypes: { id: string; name: string }[]; calendars: { id: string; name: string; timezone: string; calendarType: string }[] }
export interface PaginatedUsers { data: AdminUser[]; page: number; limit: number; total: number; totalPages: number }
export interface PaginatedGroups { data: AdminGroup[]; page: number; limit: number; total: number; totalPages: number }
export interface OrganizationSettings { organizationName: string; branding: { logoUrl?: string; faviconUrl?: string; primaryColor?: string; accentColor?: string; portalTitle?: string; welcomeMessage?: string; supportEmail?: string; supportPhone?: string; timezone?: string; showPoweredBy?: boolean; themeMode?: 'DARK'|'LIGHT'|'SYSTEM' }; attachments: { enabled?: boolean; provider?: 'NONE'|'S3'|'AZURE_BLOB'|'GCS'|'MINIO'|'LOCAL'; bucket?: string; region?: string; endpoint?: string; maxFileSizeMb?: number } }
export interface ServicePortalSettings { organizationId?: string; portalEnabled: boolean; portalName: string; welcomeMessage: string; defaultLandingPage: 'HOME'|'MY_INCIDENTS'|'MY_REQUESTS'|'KNOWLEDGE'; knowledgeEnabled: boolean; allowKbSearch: boolean; allowKbRatings: boolean; bannerEnabled: boolean; bannerMessage: string; bannerBackgroundColor: string; bannerTextColor: string; bannerPriority: 'INFORMATION'|'WARNING'|'CRITICAL'; allowIncidentCreation: boolean; allowServiceRequests: boolean; allowEmployeeCloseTicket: boolean; showRecentTickets: boolean; showMyRequests: boolean; createdAt?: string; updatedAt?: string }
export interface ServicePortalBanner { enabled: boolean; message?: string; backgroundColor?: string; textColor?: string; priority?: string }
export interface ServicePortalProfile { id: string; name: string; email: string; phone?: string; department?: { id: string; name: string }; manager?: Pick<User, 'id' | 'name' | 'email'>; language?: string }
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
  configurationItem?: ConfigurationItem;
  incident?: { impact?: string; urgency?: string; affectedService?: string; resolutionNotes?: string; createdFor?: Pick<User, 'id' | 'name' | 'email'> };
  serviceRequest?: { requestDetails?: Record<string, unknown>; requestedFor?: Pick<User, 'id' | 'name' | 'email'>; catalogItem?: { id: string; name: string; category?: { id: string; name: string }; approvalRules?: ServiceApprovalRule[] }; approvals?: ServiceApproval[]; tasks?: RequestTask[] };
  problem?: { rootCause?: string; workaround?: string; permanentFix?: string; impact?: string; impactDetails?: string; risk?: string; knownError?: boolean; riskAccepted?: boolean; riskOwnerId?: string; riskOwner?: Pick<User, 'id' | 'name' | 'email'>; riskAcceptedUntil?: string; riskAcceptanceSummary?: string; resolvedAt?: string; tasks?: ProblemTask[] };
  change?: { changeType?: string; risk?: string; impact?: string; plannedStart?: string; plannedEnd?: string; implementationPlan?: string; rollbackPlan?: string; testPlan?: string; actualStart?: string; actualEnd?: string; requestedBy?: Pick<User, 'id' | 'name' | 'email'>; approvals?: ChangeApproval[] };
  activities: { id: string; comment: string; createdAt: string; createdBy: Pick<User, 'id' | 'name'>; activityType?: { name: string } }[];
  slas: { id: string; definitionName: string; responseDueAt: string; resolutionDueAt: string; firstRespondedAt?: string; resolvedAt?: string; status: string }[];
}
