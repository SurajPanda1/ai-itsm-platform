import type { AdminGroup, AssignmentGroup, Incident, PaginatedUsers, ReferenceData, RelatedItem, Session, SlaDefinition } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const sessionKey = 'ai-itsm-session';
const activityKey = 'ai-itsm-last-activity';

async function request<T>(path: string, options: RequestInit = {}, token?: string, allowRefresh = true): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers },
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
  login: (email: string, password: string) => request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  incidents: (token: string) => request<Incident[]>('/incidents', {}, token),
  createIncident: (token: string, input: object) => request<Incident>('/incidents', { method: 'POST', body: JSON.stringify(input) }, token),
  updateIncident: (token: string, id: string, input: object) => request<Incident>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  assignmentGroups: (token: string) => request<AssignmentGroup[]>('/assignment-groups', {}, token),
  assignIncident: (token: string, id: string, input: object) => request<Incident>(`/incidents/${id}/assignment`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  addActivity: (token: string, id: string, comment: string, type: 'COMMENT' | 'WORK_NOTE') => request(`/incidents/${id}/comments`, { method: 'POST', body: JSON.stringify({ comment, type }) }, token),
  changeStatus: (token: string, id: string, status: string) => request<Incident>(`/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  resolveIncident: (token: string, id: string, resolutionNotes: string) => request<Incident>(`/incidents/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ resolutionNotes }) }, token),
  relatedItems: (token: string, id: string) => request<RelatedItem[]>(`/tickets/${id}/related-items`, {}, token),
  addRelatedItem: (token: string, id: string, input: object) => request(`/tickets/${id}/related-items`, { method: 'POST', body: JSON.stringify(input) }, token),
  logout: () => request('/auth/logout', { method: 'POST' }),
  adminUsers: (token: string, page = 1, search = '') => request<PaginatedUsers>(`/admin/users?page=${page}&limit=50&search=${encodeURIComponent(search)}`, {}, token),
  adminGroups: (token: string) => request<AdminGroup[]>('/admin/groups', {}, token),
  adminReferenceData: (token: string) => request<ReferenceData>('/admin/reference-data', {}, token),
  createAdminUser: (token: string, input: object) => request('/admin/users', { method: 'POST', body: JSON.stringify(input) }, token),
  updateAdminUser: (token: string, id: string, input: object) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  createAdminGroup: (token: string, input: object) => request('/admin/groups', { method: 'POST', body: JSON.stringify(input) }, token),
  addGroupMember: (token: string, groupId: string, userId: string) => request(`/admin/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }, token),
  removeGroupMember: (token: string, groupId: string, userId: string) => request(`/admin/groups/${groupId}/members/${userId}`, { method: 'DELETE' }, token),
  addGroupRole: (token: string, groupId: string, roleId: string) => request(`/admin/groups/${groupId}/roles`, { method: 'POST', body: JSON.stringify({ roleId }) }, token),
  removeGroupRole: (token: string, groupId: string, roleId: string) => request(`/admin/groups/${groupId}/roles/${roleId}`, { method: 'DELETE' }, token),
  adminSlas: (token: string) => request<SlaDefinition[]>('/admin/slas', {}, token),
  createAdminSla: (token: string, input: object) => request('/admin/slas', { method: 'POST', body: JSON.stringify(input) }, token),
  deactivateAdminSla: (token: string, id: string) => request(`/admin/slas/${id}/deactivate`, { method: 'PATCH', body: '{}' }, token),
};
