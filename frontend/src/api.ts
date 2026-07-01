import type { AdminCmdbSettings, AnalyticsReport, AssignmentGroup, Attachment, Branding, ChangeApprovalRule, CmdbImportPreview, CmdbLookupData, CmdbPaginatedItems, CmdbRelationship, ConfigurationItem, Incident, KnowledgeArticle, OrganizationSettings, PaginatedGroups, PaginatedKnowledgeArticles, PaginatedUsers, ReferenceData, RelatedItem, ServiceCatalogCategory, ServicePortalBanner, ServicePortalProfile, ServicePortalSettings, Session, SlaDefinition, TicketKnowledgeLink, User } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const sessionKey = 'ai-itsm-session';
const activityKey = 'ai-itsm-last-activity';
const absoluteAssetUrl = (url?: string) => url?.startsWith('/') ? `${new URL(API_URL).origin}${url}` : url;

async function request<T>(path: string, options: RequestInit = {}, token?: string, allowRefresh = true): Promise<T> {
  const isForm = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...(!isForm ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (response.status === 401 && token && allowRefresh) {
    const lastActivity = Number(localStorage.getItem(activityKey) ?? 0);
    const inactiveFor = Date.now() - lastActivity;
    if (lastActivity && inactiveFor < 60 * 60 * 1000) {
      const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (refreshed.ok) {
        const session = await refreshed.json() as Session;
        localStorage.setItem(sessionKey, JSON.stringify(session));
        return request<T>(path, options, session.accessToken, false);
      }
    }
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(activityKey);
    window.location.reload();
    throw new Error('Your session expired. Please sign in again.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  branding: async () => { const value=await request<Branding>(`/branding?domain=${encodeURIComponent(window.location.hostname)}`);return {...value,logoUrl:absoluteAssetUrl(value.logoUrl),faviconUrl:absoluteAssetUrl(value.faviconUrl)}; },
  analytics: (token:string,query:string) => request<AnalyticsReport>(`/analytics?${query}`,{},token),
  exportAnalytics: async (token:string,query:string) => { const response=await fetch(`${API_URL}/analytics/export.csv?${query}`,{headers:{authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('Could not export analytics');const module=new URLSearchParams(query).get('module')||'tickets';const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=`${module.toLowerCase()}-analytics.csv`;link.click();URL.revokeObjectURL(url); },
  login: (email: string, password: string) => request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  changePassword: (token: string, input: { currentPassword: string; newPassword: string }) => request<{ changed: boolean }>('/auth/change-password', { method: 'POST', body: JSON.stringify(input) }, token),
  incidents: (token: string) => request<Incident[]>('/incidents', {}, token),
  incident: (token: string, id: string) => request<Incident>(`/incidents/${id}`, {}, token),
  userSearch: (token: string, query: string) => request<Pick<User, 'id' | 'name' | 'email'>[]>(`/users/search?q=${encodeURIComponent(query)}`, {}, token),
  configurationItemSearch: (token: string, query: string) => request<ConfigurationItem[]>(`/configuration-items/search?q=${encodeURIComponent(query)}`, {}, token),
  cmdbLookups: (token: string, categoryId = '') => request<CmdbLookupData>(`/configuration-items/lookups${categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : ''}`, {}, token),
  cmdbItems: (token: string, query = '') => request<CmdbPaginatedItems>(`/configuration-items${query ? `?${query}` : ''}`, {}, token),
  cmdbItem: (token: string, id: string) => request<ConfigurationItem>(`/configuration-items/items/${id}`, {}, token),
  createCmdbItem: (token: string, input: object) => request<ConfigurationItem>('/configuration-items', { method: 'POST', body: JSON.stringify(input) }, token),
  updateCmdbItem: (token: string, id: string, input: object) => request<ConfigurationItem>(`/configuration-items/items/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  deactivateCmdbItem: (token: string, id: string) => request(`/configuration-items/items/${id}/deactivate`, { method: 'PATCH', body: '{}' }, token),
  cmdbRelationships: (token: string, query = '') => request<CmdbRelationship[]>(`/configuration-items/relationships/list${query ? `?${query}` : ''}`, {}, token),
  createCmdbRelationship: (token: string, input: object) => request<CmdbRelationship>('/configuration-items/relationships', { method: 'POST', body: JSON.stringify(input) }, token),
  updateCmdbRelationship: (token: string, id: string, input: object) => request<CmdbRelationship>(`/configuration-items/relationships/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  deleteCmdbRelationship: (token: string, id: string) => request(`/configuration-items/relationships/${id}`, { method: 'DELETE' }, token),
  previewCmdbImport: (token: string, rows: Record<string, string>[]) => request<CmdbImportPreview>('/configuration-items/import/preview', { method: 'POST', body: JSON.stringify({ rows }) }, token),
  confirmCmdbImport: (token: string, rows: Record<string, string>[]) => request<CmdbImportPreview>('/configuration-items/import/confirm', { method: 'POST', body: JSON.stringify({ rows }) }, token),
  createIncident: (token: string, input: object) => request<Incident>('/incidents', { method: 'POST', body: JSON.stringify(input) }, token),
  serviceCatalog: (token: string) => request<ServiceCatalogCategory[]>('/service-requests/catalog', {}, token),
  createServiceCategory: (token: string, input: object) => request('/service-requests/catalog/categories', { method: 'POST', body: JSON.stringify(input) }, token),
  updateServiceCategory: (token: string, id: string, input: object) => request(`/service-requests/catalog/categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  createServiceCatalogItem: (token: string, input: object) => request('/service-requests/catalog/items', { method: 'POST', body: JSON.stringify(input) }, token),
  updateServiceCatalogItem: (token: string, id: string, input: object) => request(`/service-requests/catalog/items/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  createServiceApprovalRule: (token: string, input: object) => request('/service-requests/catalog/approval-rules', { method: 'POST', body: JSON.stringify(input) }, token),
  updateServiceApprovalRule: (token: string, id: string, input: object) => request(`/service-requests/catalog/approval-rules/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  serviceRequests: (token: string) => request<Incident[]>('/service-requests', {}, token),
  serviceRequest: (token: string, id: string) => request<Incident>(`/service-requests/${id}`, {}, token),
  pendingServiceApprovals: (token: string) => request<Incident[]>('/service-requests/approvals/pending', {}, token),
  createServiceRequest: (token: string, input: object) => request<Incident>('/service-requests', { method: 'POST', body: JSON.stringify(input) }, token),
  updateServiceRequest: (token: string, id: string, input: object) => request<Incident>(`/service-requests/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  changeServiceRequestStatus: (token: string, id: string, status: string) => request<Incident>(`/service-requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  assignServiceRequest: (token: string, id: string, input: object) => request<Incident>(`/service-requests/${id}/assignment`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  addServiceRequestActivity: (token: string, id: string, comment: string, type: 'COMMENT' | 'WORK_NOTE') => request(`/service-requests/${id}/comments`, { method: 'POST', body: JSON.stringify({ comment, type }) }, token),
  decideServiceApproval: (token: string, requestId: string, approvalId: string, input: object) => request<Incident>(`/service-requests/${requestId}/approvals/${approvalId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  updateServiceRequestTask: (token: string, requestId: string, taskId: string, input: object) => request<Incident>(`/service-requests/${requestId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  problems: (token: string) => request<Incident[]>('/problems', {}, token),
  problem: (token: string, id: string) => request<Incident>(`/problems/${id}`, {}, token),
  createProblem: (token: string, input: object) => request<Incident>('/problems', { method: 'POST', body: JSON.stringify(input) }, token),
  updateProblem: (token: string, id: string, input: object) => request<Incident>(`/problems/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  assignProblem: (token: string, id: string, input: object) => request<Incident>(`/problems/${id}/assignment`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  changeProblemStatus: (token: string, id: string, status: string) => request<Incident>(`/problems/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  addProblemActivity: (token: string, id: string, comment: string, type: 'COMMENT' | 'WORK_NOTE') => request(`/problems/${id}/comments`, { method: 'POST', body: JSON.stringify({ comment, type }) }, token),
  createProblemTask: (token: string, id: string, input: object) => request<Incident>(`/problems/${id}/tasks`, { method: 'POST', body: JSON.stringify(input) }, token),
  updateProblemTask: (token: string, id: string, taskId: string, input: object) => request<Incident>(`/problems/${id}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  changes: (token: string) => request<Incident[]>('/changes', {}, token),
  change: (token: string, id: string) => request<Incident>(`/changes/${id}`, {}, token),
  createChange: (token: string, input: object) => request<Incident>('/changes', { method: 'POST', body: JSON.stringify(input) }, token),
  updateChange: (token: string, id: string, input: object) => request<Incident>(`/changes/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  assignChange: (token: string, id: string, input: object) => request<Incident>(`/changes/${id}/assignment`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  changeChangeStatus: (token: string, id: string, status: string) => request<Incident>(`/changes/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  addChangeActivity: (token: string, id: string, comment: string, type: 'COMMENT' | 'WORK_NOTE') => request(`/changes/${id}/comments`, { method: 'POST', body: JSON.stringify({ comment, type }) }, token),
  updateIncident: (token: string, id: string, input: object) => request<Incident>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  assignmentGroups: (token: string) => request<AssignmentGroup[]>('/assignment-groups', {}, token),
  assignIncident: (token: string, id: string, input: object) => request<Incident>(`/incidents/${id}/assignment`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  addActivity: (token: string, id: string, comment: string, type: 'COMMENT' | 'WORK_NOTE') => request(`/incidents/${id}/comments`, { method: 'POST', body: JSON.stringify({ comment, type }) }, token),
  changeStatus: (token: string, id: string, status: string) => request<Incident>(`/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  resolveIncident: (token: string, id: string, resolutionNotes: string) => request<Incident>(`/incidents/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ resolutionNotes }) }, token),
  relatedItems: (token: string, id: string) => request<RelatedItem[]>(`/tickets/${id}/related-items`, {}, token),
  addRelatedItem: (token: string, id: string, input: object) => request(`/tickets/${id}/related-items`, { method: 'POST', body: JSON.stringify(input) }, token),
  attachments: (token: string, ticketId: string) => request<Attachment[]>(`/tickets/${ticketId}/attachments`, {}, token),
  attachmentConfiguration: (token: string) => request<{enabled:boolean;provider:string|null;maxFileSizeMb:number}>('/attachments/configuration',{},token),
  uploadAttachment: (token: string, ticketId: string, file: File) => { const body=new FormData();body.append('file',file);return request<Attachment>(`/tickets/${ticketId}/attachments`,{method:'POST',body},token); },
  deleteAttachment: (token: string, ticketId: string, id: string) => request(`/tickets/${ticketId}/attachments/${id}`,{method:'DELETE'},token),
  downloadAttachment: async (token: string, ticketId: string, id: string, fileName: string) => { const response=await fetch(`${API_URL}/tickets/${ticketId}/attachments/${id}/download`,{headers:{authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('Could not download attachment');const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=fileName;link.click();URL.revokeObjectURL(url); },
  knowledgeArticles: (token: string, query = '') => request<PaginatedKnowledgeArticles>(`/knowledge${query ? `?${query}` : ''}`, {}, token),
  knowledgeArticle: (token: string, id: string) => request<KnowledgeArticle>(`/knowledge/${id}`, {}, token),
  knowledgeSearch: (token: string, query: string) => request<KnowledgeArticle[]>(`/knowledge/search?q=${encodeURIComponent(query)}`, {}, token),
  createKnowledgeArticle: (token: string, input: object) => request<KnowledgeArticle>('/knowledge', { method: 'POST', body: JSON.stringify(input) }, token),
  updateKnowledgeArticle: (token: string, id: string, input: object) => request<KnowledgeArticle>(`/knowledge/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  ticketKnowledge: (token: string, ticketId: string) => request<TicketKnowledgeLink[]>(`/tickets/${ticketId}/knowledge`, {}, token),
  linkTicketKnowledge: (token: string, ticketId: string, articleId: string) => request<TicketKnowledgeLink>(`/tickets/${ticketId}/knowledge/${articleId}`, { method: 'POST', body: '{}' }, token),
  unlinkTicketKnowledge: (token: string, ticketId: string, articleId: string) => request(`/tickets/${ticketId}/knowledge/${articleId}`, { method: 'DELETE' }, token),
  servicePortalSettings: (token: string) => request<ServicePortalSettings>('/service-portal/settings', {}, token),
  updateServicePortalSettings: (token: string, input: object) => request<ServicePortalSettings>('/service-portal/settings', { method: 'PUT', body: JSON.stringify(input) }, token),
  servicePortalBanner: (token: string) => request<ServicePortalBanner>('/service-portal/banner', {}, token),
  servicePortalKnowledge: (token: string, query = '', category = '') => request<KnowledgeArticle[]>(`/service-portal/knowledge?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`, {}, token),
  servicePortalMyIncidents: (token: string) => request<Incident[]>('/service-portal/my-incidents', {}, token),
  servicePortalMyRequests: (token: string) => request<Incident[]>('/service-portal/my-requests', {}, token),
  servicePortalProfile: (token: string) => request<ServicePortalProfile>('/service-portal/profile', {}, token),
  logout: () => request('/auth/logout', { method: 'POST' }),
  adminUsers: (token: string, page = 1, search = '') => request<PaginatedUsers>(`/admin/users?page=${page}&limit=50&search=${encodeURIComponent(search)}`, {}, token),
  adminGroups: (token: string, page = 1, search = '', active = 'all') => request<PaginatedGroups>(`/admin/groups?page=${page}&limit=20&search=${encodeURIComponent(search)}&active=${encodeURIComponent(active)}`, {}, token),
  adminReferenceData: (token: string) => request<ReferenceData>('/admin/reference-data', {}, token),
  adminCmdbSettings: (token: string) => request<AdminCmdbSettings>('/admin/cmdb-settings', {}, token),
  createCiCategory: (token: string, input: object) => request('/admin/cmdb-settings/categories', { method: 'POST', body: JSON.stringify(input) }, token),
  updateCiCategory: (token: string, id: string, input: object) => request(`/admin/cmdb-settings/categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  createCiType: (token: string, input: object) => request('/admin/cmdb-settings/types', { method: 'POST', body: JSON.stringify(input) }, token),
  updateCiType: (token: string, id: string, input: object) => request(`/admin/cmdb-settings/types/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  createCiRelationshipType: (token: string, input: object) => request('/admin/cmdb-settings/relationship-types', { method: 'POST', body: JSON.stringify(input) }, token),
  updateCiRelationshipType: (token: string, id: string, input: object) => request(`/admin/cmdb-settings/relationship-types/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  createDepartment: (token: string, input: object) => request('/admin/departments', { method: 'POST', body: JSON.stringify(input) }, token),
  updateDepartment: (token: string, id: string, input: object) => request(`/admin/departments/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  organizationSettings: async (token: string) => { const value=await request<OrganizationSettings>('/admin/organization-settings', {}, token);return {...value,branding:{...value.branding,logoUrl:absoluteAssetUrl(value.branding.logoUrl),faviconUrl:absoluteAssetUrl(value.branding.faviconUrl)}}; },
  updateOrganizationSettings: (token: string, input: object) => request('/admin/organization-settings', { method: 'PATCH', body: JSON.stringify(input) }, token),
  uploadBrandAsset: async (token: string, kind: 'logo'|'favicon', file: File) => { const body=new FormData();body.append('file',file);const value=await request<{url:string}>(`/admin/organization-settings/branding/${kind}`,{method:'POST',body},token);return {url:absoluteAssetUrl(value.url)!}; },
  removeBrandAsset: (token: string, kind: 'logo'|'favicon') => request(`/admin/organization-settings/branding/${kind}`,{method:'DELETE'},token),
  testStorageConnection: (token: string, input: object) => request<{connected:boolean;provider:string;checkedAt:string}>('/admin/organization-settings/test-storage', { method: 'POST', body: JSON.stringify(input) }, token),
  createAdminUser: (token: string, input: object) => request('/admin/users', { method: 'POST', body: JSON.stringify(input) }, token),
  updateAdminUser: (token: string, id: string, input: object) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  createAdminGroup: (token: string, input: object) => request('/admin/groups', { method: 'POST', body: JSON.stringify(input) }, token),
  updateAdminGroup: (token: string, id: string, input: object) => request(`/admin/groups/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  addGroupMember: (token: string, groupId: string, userId: string) => request(`/admin/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }, token),
  removeGroupMember: (token: string, groupId: string, userId: string) => request(`/admin/groups/${groupId}/members/${userId}`, { method: 'DELETE' }, token),
  addGroupRole: (token: string, groupId: string, roleId: string) => request(`/admin/groups/${groupId}/roles`, { method: 'POST', body: JSON.stringify({ roleId }) }, token),
  removeGroupRole: (token: string, groupId: string, roleId: string) => request(`/admin/groups/${groupId}/roles/${roleId}`, { method: 'DELETE' }, token),
  adminSlas: (token: string) => request<SlaDefinition[]>('/admin/slas', {}, token),
  adminChangeApprovalRules: (token: string) => request<ChangeApprovalRule[]>('/admin/change-approval-rules', {}, token),
  createChangeApprovalRule: (token: string, input: object) => request<ChangeApprovalRule>('/admin/change-approval-rules', { method: 'POST', body: JSON.stringify(input) }, token),
  updateChangeApprovalRule: (token: string, id: string, input: object) => request<ChangeApprovalRule>(`/admin/change-approval-rules/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  deactivateChangeApprovalRule: (token: string, id: string) => request(`/admin/change-approval-rules/${id}/deactivate`, { method: 'PATCH', body: '{}' }, token),
  createAdminSla: (token: string, input: object) => request('/admin/slas', { method: 'POST', body: JSON.stringify(input) }, token),
  deactivateAdminSla: (token: string, id: string) => request(`/admin/slas/${id}/deactivate`, { method: 'PATCH', body: '{}' }, token),
  createBusinessCalendar: (token: string, input: object) => request('/admin/calendars', { method: 'POST', body: JSON.stringify(input) }, token),
};
