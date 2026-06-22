import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import AdminConsoleV2 from "./AdminConsole";
import AnalyticsConsole from "./AnalyticsConsole";
import type {
  AdminGroup,
  AdminUser,
  AssignmentGroup,
  Attachment,
  Branding,
  Incident,
  ReferenceData,
  RelatedItem,
  Session,
  SlaDefinition,
} from "./types";

const sessionKey = "ai-itsm-session";
const activityKey = "ai-itsm-last-activity";
const defaultBranding: Branding = { organizationName: "Nextris", portalTitle: "Nextris Sevā", welcomeMessage: "How can we help?", primaryColor: "#16a394", accentColor: "#6ee7b7", showPoweredBy: true, themeMode: "DARK" };

function Brand({ branding }: { branding: Branding }) {
  return <div className="brand">{branding.logoUrl ? <img className="brand-logo" src={branding.logoUrl} alt={`${branding.organizationName} logo`} /> : <span className="brand-mark">{branding.organizationName.slice(0, 1).toUpperCase()}</span>}<span>{branding.portalTitle || branding.organizationName}</span></div>;
}

function Login({ onLogin, branding }: { onLogin: (session: Session) => void; branding: Branding }) {
  const [email, setEmail] = useState("suraj@abc.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await api.login(email, password));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-story">
        <Brand branding={branding} />
        <div className="story-copy">
          <p className="eyebrow">AI-FIRST SERVICE OPERATIONS</p>
          <h1>
            Calm systems.
            <br />
            Clear ownership.
          </h1>
          <p>
            One place for your team to report issues, coordinate work, and keep
            services moving.
          </p>
        </div>
        <p className="version">{branding.showPoweredBy !== false ? "Powered by Nextris Sevā" : "Private service portal"}</p>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <p className="eyebrow">WELCOME BACK</p>
          <h2>{branding.welcomeMessage || "Sign in to your workspace"}</h2>
          <p className="muted">Use your organization account to continue.</p>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="privacy">
            Your session is stored only in this browser.
          </p>
        </form>
      </section>
    </main>
  );
}

function CreateIncident({
  token,
  onCreated,
  onClose,
}: {
  token: string;
  onCreated: (i: Incident) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    impact: "LOW",
    urgency: "LOW",
    affectedService: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [attachmentConfig, setAttachmentConfig] = useState<{enabled:boolean;maxFileSizeMb:number}|null>(null);
  useEffect(() => { api.attachmentConfiguration(token).then(setAttachmentConfig).catch(() => setAttachmentConfig(null)); }, [token]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const incident = await api.createIncident(token, form);
      for (const file of files) await api.uploadAttachment(token, incident.id, file);
      onCreated(incident);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not create incident",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">NEW RECORD</p>
            <h2>Create incident</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>
        <label>
          Title
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            minLength={3}
            maxLength={200}
            placeholder="What is not working?"
            required
            autoFocus
          />
        </label>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Add useful context, symptoms, or error messages"
            rows={4}
          />
        </label>
        <div className="form-grid">
          {(["priority", "impact", "urgency"] as const).map((field) => (
            <label key={field}>
              {field[0].toUpperCase() + field.slice(1)}
              <select
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              >
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <label>
          Affected service
          <input
            value={form.affectedService}
            onChange={(e) =>
              setForm({ ...form, affectedService: e.target.value })
            }
            placeholder="e.g. Employee portal"
          />
        </label>
        {attachmentConfig?.enabled && <label>Attachments <small className="muted">Maximum {attachmentConfig.maxFileSizeMb} MB per file</small><input type="file" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/>{files.length>0&&<small className="muted">{files.length} file{files.length===1?'':'s'} selected</small>}</label>}
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Creating…" : "Create incident"}
          </button>
        </div>
      </form>
    </div>
  );
}

function IncidentDetail({
  incident,
  token,
  groups,
  canEdit,
  canReopen,
  onUpdated,
  onClose,
}: {
  incident: Incident;
  token: string;
  groups: AssignmentGroup[];
  canEdit: boolean;
  canReopen: boolean;
  onUpdated: (value: Incident) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: incident.title,
    description: incident.description || "",
    priority: incident.priority?.name || "MEDIUM",
    impact: incident.incident?.impact || "LOW",
    urgency: incident.incident?.urgency || "LOW",
    affectedService: incident.incident?.affectedService || "",
  });
  const [groupId, setGroupId] = useState(
    incident.assignmentGroup?.id || groups[0]?.id || "",
  );
  const [assigneeId, setAssigneeId] = useState(incident.assignedTo?.id || "");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(incident.status?.name || "OPEN");
  const [resolution, setResolution] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"work-notes" | "related" | "attachments">(
    "work-notes",
  );
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [relatedNumber, setRelatedNumber] = useState("");
  const [relationType, setRelationType] = useState("CHILD_INCIDENT");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentConfig, setAttachmentConfig] = useState<{enabled:boolean;maxFileSizeMb:number}|null>(null);
  const [clock, setClock] = useState(Date.now());
  const selectedGroup = groups.find((group) => group.id === groupId);
  async function save() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      onUpdated(await api.updateIncident(token, incident.id, form));
      setEditing(false);
      setSuccess("Incident details updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }
  async function assign() {
    if (!groupId || !assigneeId) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      onUpdated(
        await api.assignIncident(token, incident.id, {
          assignmentGroupId: groupId,
          assignedToId: assigneeId,
        }),
      );
      setSuccess("Assignment updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Assignment failed");
    } finally {
      setBusy(false);
    }
  }
  async function addNote() {
    if (!note.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.addActivity(
        token,
        incident.id,
        note,
        canEdit ? "WORK_NOTE" : "COMMENT",
      );
      const refreshed = await api.incidents(token);
      const value = refreshed.find((item) => item.id === incident.id);
      if (value) onUpdated(value);
      setNote("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not add activity",
      );
    } finally {
      setBusy(false);
    }
  }
  async function updateStatus() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const updated =
        status === "RESOLVED"
          ? await api.resolveIncident(token, incident.id, resolution)
          : await api.changeStatus(token, incident.id, status);
      onUpdated(updated);
      setSuccess(
        status === "RESOLVED" ? "Incident resolved." : "Status updated.",
      );
      setResolution("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Status update failed",
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadRelated() {
    try {
      setRelatedItems(await api.relatedItems(token, incident.id));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not load related items",
      );
    }
  }
  async function addRelated() {
    if (!relatedNumber.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.addRelatedItem(token, incident.id, {
        relatedTicketNumber: relatedNumber,
        relationshipType: relationType,
      });
      setRelatedNumber("");
      await loadRelated();
      setSuccess("Related item linked.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not link ticket",
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadAttachments() { try { setAttachments(await api.attachments(token, incident.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load attachments"); } }
  async function uploadAttachment(file?: File) { if(!file)return;setBusy(true);setError("");try{await api.uploadAttachment(token,incident.id,file);await loadAttachments();setSuccess("Attachment uploaded.");}catch(reason){setError(reason instanceof Error?reason.message:"Could not upload attachment")}finally{setBusy(false)} }
  async function deleteAttachment(id:string) { setBusy(true);try{await api.deleteAttachment(token,incident.id,id);await loadAttachments();setSuccess("Attachment deleted.");}catch(reason){setError(reason instanceof Error?reason.message:"Could not delete attachment")}finally{setBusy(false)} }
  useEffect(() => {
    if (activeTab === "related" && canEdit) void loadRelated();
  }, [activeTab, canEdit, incident.id]);
  useEffect(() => { api.attachmentConfiguration(token).then(value=>{setAttachmentConfig(value);if(value.enabled)void loadAttachments()}).catch(()=>setAttachmentConfig(null)); }, [token,incident.id]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = (due: string) => {
    const milliseconds = new Date(due).getTime() - clock;
    if (milliseconds <= 0) return "Breached";
    const minutes = Math.ceil(milliseconds / 60_000);
    return minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m remaining`
      : `${minutes}m remaining`;
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="modal detail-modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{incident.ticketNumber}</p>
            <h2>{editing ? "Edit incident" : incident.title}</h2>
          </div>
          <div>
            {canEdit && !editing && (
              <button className="secondary" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
            <button type="button" className="icon-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        {success && <div className="success">{success}</div>}
        {editing ? (
          <div className="edit-form">
            <label>
              Title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <div className="form-grid">
              {(["priority", "impact", "urgency"] as const).map((field) => (
                <label key={field}>
                  {field[0].toUpperCase() + field.slice(1)}
                  <select
                    value={form[field]}
                    onChange={(e) =>
                      setForm({ ...form, [field]: e.target.value })
                    }
                  >
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <label>
              Affected service
              <input
                value={form.affectedService}
                onChange={(e) =>
                  setForm({ ...form, affectedService: e.target.value })
                }
              />
            </label>
            {error && <div className="error">{error}</div>}
            <div className="modal-actions">
              <button className="secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="primary" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="detail-meta">
              <div>
                <small>Status</small>
                <span
                  className={`badge ${incident.status?.name.toLowerCase()}`}
                >
                  {incident.status?.name.replace("_", " ")}
                </span>
              </div>
              <div>
                <small>Priority</small>
                <b
                  className={`priority ${incident.priority?.name.toLowerCase()}`}
                >
                  {incident.priority?.name}
                </b>
              </div>
              <div>
                <small>Assignment group</small>
                <b>{incident.assignmentGroup?.name || "Unassigned"}</b>
              </div>
              <div>
                <small>Assignee</small>
                <b>{incident.assignedTo?.name || "Unassigned"}</b>
              </div>
            </div>
            <div className="detail-section">
              <h3>Description</h3>
              <p>{incident.description || "No description provided."}</p>
            </div>
            <div className="operations-grid">
              <div>
                <div className="detail-section">
                  <h3>Incident details</h3>
                  <dl>
                    <dt>Affected service</dt>
                    <dd>
                      {incident.incident?.affectedService || "Not specified"}
                    </dd>
                    <dt>Impact</dt>
                    <dd>{incident.incident?.impact || "—"}</dd>
                    <dt>Urgency</dt>
                    <dd>{incident.incident?.urgency || "—"}</dd>
                    <dt>Reported by</dt>
                    <dd>{incident.createdBy.name}</dd>
                    <dt>Created</dt>
                    <dd>{new Date(incident.createdAt).toLocaleString()}</dd>
                  </dl>
                </div>
                {incident.slas?.length > 0 && (
                  <div className="detail-section">
                    <h3>SLA</h3>
                    {incident.slas.map((sla) => (
                      <div className="ticket-sla" key={sla.id}>
                        <div>
                          <b>{sla.definitionName}</b>
                          <span className={`badge ${sla.status.toLowerCase()}`}>
                            {sla.status.replace("_", " ")}
                          </span>
                        </div>
                        <small>
                          Response due{" "}
                          {new Date(sla.responseDueAt).toLocaleString()}
                        </small>
                        <small>
                          Resolution due{" "}
                          {new Date(sla.resolutionDueAt).toLocaleString()}
                        </small>
                        <strong className="sla-countdown">
                          {sla.status === "PAUSED"
                            ? "Paused"
                            : remaining(sla.resolutionDueAt)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                {canEdit && (
                  <div className="detail-section">
                    <h3>Assignment</h3>
                    <div className="assignment-row stacked">
                      <select
                        value={groupId}
                        onChange={(e) => {
                          setGroupId(e.target.value);
                          setAssigneeId("");
                        }}
                      >
                        <option value="">Select group</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                      >
                        <option value="">Select assignee</option>
                        {selectedGroup?.members.map((member) => (
                          <option key={member.user.id} value={member.user.id}>
                            {member.user.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="secondary"
                        onClick={assign}
                        disabled={!groupId || !assigneeId || busy}
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}
                {canEdit && (
                  <div className="detail-section">
                    <h3>Status</h3>
                    <div className="status-row">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled={
                          incident.status?.name === "CLOSED" && !canReopen
                        }
                      >
                        {[
                          "OPEN",
                          "IN_PROGRESS",
                          "AWAITING_CUSTOMER",
                          "RESOLVED",
                          "CLOSED",
                        ].map((value) => (
                          <option key={value} value={value}>
                            {value.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                      <button
                        className="secondary"
                        onClick={updateStatus}
                        disabled={
                          busy ||
                          (incident.status?.name === "CLOSED" && !canReopen) ||
                          (status === "RESOLVED" &&
                            resolution.trim().length < 3)
                        }
                      >
                        Update
                      </button>
                    </div>
                    {incident.status?.name === "CLOSED" && !canReopen && (
                      <p className="muted">
                        Only an administrator can reopen a closed ticket.
                      </p>
                    )}
                    {status === "RESOLVED" && (
                      <textarea
                        rows={3}
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        placeholder="Resolution notes (required)"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="detail-section">
              <div className="record-tabs">
                <button
                  className={activeTab === "work-notes" ? "active" : ""}
                  onClick={() => setActiveTab("work-notes")}
                >
                  {canEdit ? "Work Notes" : "Comments"}
                </button>
                {canEdit && (
                  <button
                    className={activeTab === "related" ? "active" : ""}
                    onClick={() => setActiveTab("related")}
                  >
                    Related Items
                  </button>
                )}
                {attachmentConfig?.enabled && <button className={activeTab === "attachments" ? "active" : ""} onClick={() => setActiveTab("attachments")}>Attachments <span>{attachments.length}</span></button>}
              </div>
              {activeTab === "work-notes" ? (
                <>
                  <div className="note-entry">
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        canEdit
                          ? "Add an internal work note…"
                          : "Add a comment…"
                      }
                    />
                    <button
                      className="primary"
                      onClick={addNote}
                      disabled={!note.trim() || busy}
                    >
                      Add {canEdit ? "work note" : "comment"}
                    </button>
                  </div>
                  <div className="activity-list">
                    {incident.activities.length === 0 ? (
                      <p className="muted">No activity yet.</p>
                    ) : (
                      incident.activities.map((activity) => (
                        <article key={activity.id}>
                          <div>
                            <b>{activity.createdBy.name}</b>
                            <span className="activity-type">
                              {activity.activityType?.name.replace("_", " ") ||
                                "ACTIVITY"}
                            </span>
                            <time>
                              {new Date(activity.createdAt).toLocaleString()}
                            </time>
                          </div>
                          <p>{activity.comment}</p>
                        </article>
                      ))
                    )}
                  </div>
                </>
              ) : activeTab === "related" ? (
                <div className="related-panel">
                  <div className="related-entry">
                    <select
                      value={relationType}
                      onChange={(e) => setRelationType(e.target.value)}
                    >
                      <option value="CHILD_INCIDENT">Child incident</option>
                      <option value="RELATED_CHANGE">Related change</option>
                      <option value="RELATED_PROBLEM">Related problem</option>
                    </select>
                    <input
                      value={relatedNumber}
                      onChange={(e) => setRelatedNumber(e.target.value)}
                      placeholder="Ticket number, e.g. CHG000001"
                    />
                    <button
                      className="secondary"
                      onClick={addRelated}
                      disabled={!relatedNumber.trim() || busy}
                    >
                      Link
                    </button>
                  </div>
                  {relatedItems.length === 0 ? (
                    <p className="muted">No related items.</p>
                  ) : (
                    <div className="related-list">
                      {relatedItems.map((item) => (
                        <article key={item.id}>
                          <b>{item.ticketNumber}</b>
                          <span>{item.title}</span>
                          <span className="badge">{item.status}</span>
                          <small>
                            {item.relationshipType.replaceAll("_", " ")}
                          </small>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ) : <div className="attachment-panel"><label className="attachment-upload">Add attachment <small>Maximum {attachmentConfig?.maxFileSizeMb||10} MB</small><input type="file" disabled={busy} onChange={e=>{void uploadAttachment(e.target.files?.[0]);e.target.value=''}}/></label>{attachments.length===0?<p className="muted">No attachments yet.</p>:<div className="attachment-list">{attachments.map(item=><article key={item.id}><div><b>{item.fileName}</b><small>{(item.sizeBytes/1024).toFixed(1)} KB · {item.uploadedBy.name} · {new Date(item.createdAt).toLocaleString()}</small></div><button className="secondary small" onClick={()=>api.downloadAttachment(token,incident.id,item.id,item.fileName)}>Download</button><button className="icon-button danger" title="Delete attachment" onClick={()=>deleteAttachment(item.id)}>×</button></article>)}</div>}</div>}
              {error && <div className="error">{error}</div>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function AdminConsole({
  token,
  onClose,
}: {
  token: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"users" | "groups" | "slas">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [slas, setSlas] = useState<SlaDefinition[]>([]);
  const [reference, setReference] = useState<ReferenceData>({
    roles: [],
    departments: [],
    priorities: [],
    ticketTypes: [],
    calendars: [],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    departmentId: "",
    temporaryPassword: "",
  });
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [newSla, setNewSla] = useState({
    name: "",
    ticketTypeId: "",
    priorityId: "",
    calendarId: "",
    responseTargetMinutes: 60,
    resolutionTargetMinutes: 480,
    pauseStatuses: ["AWAITING_CUSTOMER"],
  });
  async function load() {
    try {
      const [u, g, r, s] = await Promise.all([
        api.adminUsers(token, userPage, userSearch),
        api.adminGroups(token),
        api.adminReferenceData(token),
        api.adminSlas(token),
      ]);
      setUsers(u.data);
      setUserTotal(u.total);
      setUserTotalPages(u.totalPages);
      setGroups(g.data);
      setReference(r);
      setSlas(s);
      setNewSla((value) => ({
        ...value,
        calendarId: value.calendarId || r.calendars[0]?.id || "",
        ticketTypeId:
          value.ticketTypeId ||
          r.ticketTypes.find((type) => type.name === "INCIDENT")?.id ||
          "",
      }));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load admin data",
      );
    }
  }
  useEffect(() => {
    void load();
  }, [token, userPage, userSearch]);
  async function createUser(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createAdminUser(token, {
        ...newUser,
        departmentId: newUser.departmentId || undefined,
      });
      setNewUser({
        name: "",
        email: "",
        departmentId: "",
        temporaryPassword: "",
      });
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not create user",
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggleUser(user: AdminUser) {
    setBusy(true);
    try {
      await api.updateAdminUser(token, user.id, { active: !user.active });
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function createGroup(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createAdminGroup(token, newGroup);
      setNewGroup({ name: "", description: "" });
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not create group",
      );
    } finally {
      setBusy(false);
    }
  }
  async function addMember(groupId: string, userId: string) {
    if (!userId) return;
    setBusy(true);
    try {
      await api.addGroupMember(token, groupId, userId);
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function removeMember(groupId: string, userId: string) {
    setBusy(true);
    try {
      await api.removeGroupMember(token, groupId, userId);
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function addRole(groupId: string, roleId: string) {
    if (!roleId) return;
    setBusy(true);
    try {
      await api.addGroupRole(token, groupId, roleId);
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function removeRole(groupId: string, roleId: string) {
    setBusy(true);
    try {
      await api.removeGroupRole(token, groupId, roleId);
      await load();
    } finally {
      setBusy(false);
    }
  }
  function effectiveRoles(user: AdminUser) {
    return [
      ...new Set([
        "EMPLOYEE",
        ...user.directRoles.map((grant) => grant.role.name),
        ...user.assignmentGroupMemberships.flatMap((membership) =>
          membership.assignmentGroup.roles.map((grant) => grant.role.name),
        ),
      ]),
    ];
  }
  async function createSla(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createAdminSla(token, {
        ...newSla,
        ticketTypeId: newSla.ticketTypeId || undefined,
        priorityId: newSla.priorityId || undefined,
      });
      setNewSla((value) => ({ ...value, name: "" }));
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not create SLA",
      );
    } finally {
      setBusy(false);
    }
  }
  async function deactivateSla(id: string) {
    setBusy(true);
    try {
      await api.deactivateAdminSla(token, id);
      await load();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-overlay">
      <section className="admin-console">
        <header>
          <div>
            <p className="eyebrow">PLATFORM ADMINISTRATION</p>
            <h1>Admin Console</h1>
            <p>Manage people, resolver teams, and service targets.</p>
          </div>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="record-tabs">
          <button
            className={tab === "users" ? "active" : ""}
            onClick={() => setTab("users")}
          >
            Users
          </button>
          <button
            className={tab === "groups" ? "active" : ""}
            onClick={() => setTab("groups")}
          >
            Assignment Groups
          </button>
          <button
            className={tab === "slas" ? "active" : ""}
            onClick={() => setTab("slas")}
          >
            SLA Policies
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        {tab === "users" ? (
          <div className="admin-grid">
            <form className="admin-form" onSubmit={createUser}>
              <h2>Add user</h2>
              <p className="muted">
                New users receive Employee access. Elevated access comes from
                group membership.
              </p>
              <label>
                Name
                <input
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Department
                <select
                  value={newUser.departmentId}
                  onChange={(e) =>
                    setNewUser({ ...newUser, departmentId: e.target.value })
                  }
                >
                  <option value="">No department</option>
                  {reference.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Temporary password
                <input
                  type="password"
                  minLength={8}
                  value={newUser.temporaryPassword}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      temporaryPassword: e.target.value,
                    })
                  }
                  required
                />
              </label>
              <button className="primary" disabled={busy}>
                Create user
              </button>
            </form>
            <div className="admin-list">
              <h2>
                Users <span>{users.length}</span>
              </h2>
              {users.map((user) => (
                <article key={user.id}>
                  <div className="avatar">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <b>{user.name}</b>
                    <small>{user.email}</small>
                  </div>
                  <span className="role-pill">
                    {effectiveRoles(user).join(", ")}
                  </span>
                  <button
                    className="secondary small"
                    onClick={() => toggleUser(user)}
                    disabled={busy}
                  >
                    {user.active ? "Deactivate" : "Activate"}
                  </button>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="admin-grid">
            <form className="admin-form" onSubmit={createGroup}>
              <h2>Add assignment group</h2>
              <label>
                Name
                <input
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  rows={4}
                  value={newGroup.description}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, description: e.target.value })
                  }
                />
              </label>
              <button className="primary" disabled={busy}>
                Create group
              </button>
            </form>
            <div className="admin-list">
              <h2>
                Assignment Groups <span>{groups.length}</span>
              </h2>
              {groups.map((group) => (
                <article className="group-card" key={group.id}>
                  <div>
                    <b>{group.name}</b>
                    <small>{group.description || "No description"}</small>
                  </div>
                  <div className="member-list role-list">
                    {group.roles.map((grant) => (
                      <span key={grant.role.id}>
                        {grant.role.name}
                        <button
                          onClick={() => removeRole(group.id, grant.role.id)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      void addRole(group.id, e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Grant role…</option>
                    {reference.roles
                      .filter(
                        (role) =>
                          role.name !== "EMPLOYEE" &&
                          !group.roles.some(
                            (grant) => grant.role.id === role.id,
                          ),
                      )
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                  <div className="member-list">
                    {group.members.map((member) => (
                      <span key={member.user.id}>
                        {member.user.name}
                        <button
                          onClick={() => removeMember(group.id, member.user.id)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      void addMember(group.id, e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Add member…</option>
                    {users
                      .filter(
                        (user) =>
                          user.active &&
                          !group.members.some(
                            (member) => member.user.id === user.id,
                          ),
                      )
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                  </select>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Dashboard({ session, onLogout, branding }: { session: Session; onLogout: () => void; branding: Branding }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const canOperate = session.user.roles.some((role) =>
    ["IT_AGENT", "IT_SERVICE_MANAGER", "ADMIN"].includes(role),
  );
  const isEmployee = !canOperate;
  const isAdmin = session.user.roles.includes("ADMIN");
  const [groups, setGroups] = useState<AssignmentGroup[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [adminOpen, setAdminOpen] = useState(false);
  const [analyticsOpen,setAnalyticsOpen]=useState(false);
  useEffect(() => {
    api
      .incidents(session.accessToken)
      .then(setIncidents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session.accessToken]);
  useEffect(() => {
    if (!isEmployee)
      api
        .assignmentGroups(session.accessToken)
        .then(setGroups)
        .catch(() => setGroups([]));
  }, [isEmployee, session.accessToken]);
  const stats = useMemo(
    () => ({
      open: incidents.filter((i) => i.status?.name === "OPEN").length,
      active: incidents.filter((i) => i.status?.name === "IN_PROGRESS").length,
      critical: incidents.filter((i) => i.priority?.name === "CRITICAL").length,
    }),
    [incidents],
  );
  const visibleIncidents = useMemo(
    () =>
      incidents.filter((incident) => {
        const term = search.toLowerCase();
        const matchesText =
          !term ||
          incident.ticketNumber.toLowerCase().includes(term) ||
          incident.title.toLowerCase().includes(term) ||
          incident.assignedTo?.name.toLowerCase().includes(term);
        const matchesStatus =
          statusFilter === "ALL" || incident.status?.name === statusFilter;
        return matchesText && matchesStatus;
      }),
    [incidents, search, statusFilter],
  );
  return (
    <div className="app-shell">
      <aside>
        <Brand branding={branding} />
        <nav>
          <a className="active">
            ▦ <span>Incidents</span>
          </a>
          <a>
            ⌁ <span>Service requests</span>
          </a>
          <a>
            ◇ <span>Problems</span>
          </a>
          <a>
            ⇄ <span>Changes</span>
          </a>
          <a>
            ◫ <span>Configuration</span>
          </a>
          <a>
            □ <span>Knowledge</span>
          </a>
          {isAdmin && (
            <a className="admin-link" onClick={() => setAdminOpen(true)}>
              ⚙ <span>Admin Console</span>
            </a>
          )}
          {!isEmployee&&<a className="admin-link" onClick={()=>setAnalyticsOpen(true)}>▥ <span>Analytics Console</span></a>}
        </nav>
        <div className="user-block">
          <div className="avatar">
            {session.user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <strong>{session.user.name}</strong>
            <small>
              {session.user.roles
                .filter((role) => role !== "EMPLOYEE")
                .join(", ") || "EMPLOYEE"}
            </small>
          </div>
          <button title="Sign out" onClick={onLogout}>
            ↗
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header>
          <div>
            <p className="eyebrow">
              {isEmployee ? "EMPLOYEE SUPPORT" : "SERVICE OPERATIONS"}
            </p>
            <h1>{isEmployee ? "My incidents" : "Incidents"}</h1>
            <p>
              {isEmployee
                ? "Report issues and follow their progress."
                : "Track interruptions and restore service quickly."}
            </p>
          </div>
          <button className="primary compact" onClick={() => setCreating(true)}>
            ＋ New incident
          </button>
        </header>
        <section className="stats">
          <article>
            <span>Open</span>
            <strong>{stats.open}</strong>
            <small>Awaiting action</small>
          </article>
          <article>
            <span>In progress</span>
            <strong>{stats.active}</strong>
            <small>Work underway</small>
          </article>
          <article>
            <span>Critical</span>
            <strong>{stats.critical}</strong>
            <small>Highest priority</small>
          </article>
          <article>
            <span>Total</span>
            <strong>{incidents.length}</strong>
            <small>All incidents</small>
          </article>
        </section>
        <section className="table-card">
          <div className="table-head">
            <div>
              <h2>Incident queue</h2>
              <p>All incidents in your organization</p>
            </div>
            <div className="queue-filters">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All statuses</option>
                {[
                  "OPEN",
                  "IN_PROGRESS",
                  "AWAITING_CUSTOMER",
                  "RESOLVED",
                  "CLOSED",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <input
                className="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search incidents"
              />
            </div>
          </div>
          {loading ? (
            <div className="empty">Loading incidents…</div>
          ) : error ? (
            <div className="error table-error">{error}</div>
          ) : visibleIncidents.length === 0 ? (
            <div className="empty">
              <b>No matching incidents</b>
              <span>Try changing your search or filter.</span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Incident</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleIncidents.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <button
                          className="ticket-link"
                          onClick={() => setSelected(i)}
                        >
                          {i.ticketNumber}
                        </button>
                      </td>
                      <td>
                        <strong>{i.title}</strong>
                        <small>
                          {i.incident?.affectedService || "General service"}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`badge ${i.status?.name.toLowerCase()}`}
                        >
                          {i.status?.name.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`priority ${i.priority?.name.toLowerCase()}`}
                        >
                          ● {i.priority?.name}
                        </span>
                      </td>
                      <td>
                        {i.assignedTo?.name || (
                          <span className="muted">Unassigned</span>
                        )}
                      </td>
                      <td>{new Date(i.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      {creating && (
        <CreateIncident
          token={session.accessToken}
          onClose={() => setCreating(false)}
          onCreated={(i) => {
            setIncidents((x) => [i, ...x]);
            setCreating(false);
          }}
        />
      )}
      {selected && (
        <IncidentDetail
          incident={selected}
          token={session.accessToken}
          groups={groups}
          canEdit={canOperate}
          canReopen={isAdmin}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setSelected(updated);
            setIncidents((items) =>
              items.map((item) => (item.id === updated.id ? updated : item)),
            );
          }}
        />
      )}
      {adminOpen && (
        <AdminConsoleV2
          token={session.accessToken}
          onClose={() => setAdminOpen(false)}
        />
      )}
      {analyticsOpen&&<AnalyticsConsole token={session.accessToken} onClose={()=>setAnalyticsOpen(false)}/>}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(sessionKey) || "null",
      ) as Session | null;
      if (saved && !Array.isArray(saved.user?.roles)) {
        localStorage.removeItem(sessionKey);
        return null;
      }
      return saved;
    } catch {
      return null;
    }
  });
  const [branding, setBranding] = useState<Branding>(defaultBranding);
  useEffect(() => { api.branding().then(value => { const next = { ...defaultBranding, ...value }; setBranding(next); document.title = next.portalTitle || next.organizationName || "Nextris Sevā"; document.documentElement.style.setProperty("--brand-primary", next.primaryColor!); document.documentElement.style.setProperty("--brand-accent", next.accentColor!); document.documentElement.dataset.theme = next.themeMode === "SYSTEM" ? (window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light') : next.themeMode?.toLowerCase() || "dark"; if (next.faviconUrl) { let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]'); if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); } icon.href = next.faviconUrl; } }).catch(() => {document.documentElement.dataset.theme="dark"}); }, []);
  useEffect(() => {
    if (!session) return;
    let lastWrite = 0;
    const markActivity = () => {
      const now = Date.now();
      if (now - lastWrite > 30_000) {
        localStorage.setItem(activityKey, String(now));
        lastWrite = now;
      }
    };
    const timeout = window.setInterval(() => {
      const last = Number(localStorage.getItem(activityKey) || 0);
      if (last && Date.now() - last >= 60 * 60 * 1000) void logout();
    }, 60_000);
    ["click", "keydown", "mousemove", "scroll"].forEach((event) =>
      window.addEventListener(event, markActivity, { passive: true }),
    );
    markActivity();
    return () => {
      window.clearInterval(timeout);
      ["click", "keydown", "mousemove", "scroll"].forEach((event) =>
        window.removeEventListener(event, markActivity),
      );
    };
  }, [session]);
  function login(value: Session) {
    localStorage.setItem(sessionKey, JSON.stringify(value));
    localStorage.setItem(activityKey, String(Date.now()));
    setSession(value);
  }
  async function logout() {
    try {
      await api.logout();
    } finally {
      localStorage.removeItem(sessionKey);
      localStorage.removeItem(activityKey);
      setSession(null);
    }
  }
  return session ? <Dashboard session={session} onLogout={logout} branding={branding} /> : <Login onLogin={login} branding={branding} />;
}
