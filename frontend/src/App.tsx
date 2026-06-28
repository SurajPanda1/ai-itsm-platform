import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";
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
  ServiceCatalogCategory,
  Session,
  SlaDefinition,
} from "./types";

const sessionKey = "ai-itsm-session";
const activityKey = "ai-itsm-last-activity";
const themePreferenceKey = "ai-itsm-theme-preference";
const modulePreferenceKey = "ai-itsm-active-module";
const defaultBranding: Branding = { organizationName: "Nextris", portalTitle: "Nextris Sevā", welcomeMessage: "How can we help?", primaryColor: "#16a394", accentColor: "#6ee7b7", showPoweredBy: true, themeMode: "DARK" };
type ThemePreference = "DARK" | "LIGHT" | "SYSTEM";

function resolveTheme(themeMode: ThemePreference) {
  if (themeMode === "SYSTEM") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return themeMode.toLowerCase();
}

function applyThemePreference(themeMode: ThemePreference) {
  document.documentElement.dataset.theme = resolveTheme(themeMode);
}

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

function CreateServiceRequest({
  token,
  catalog,
  onCreated,
  onClose,
}: {
  token: string;
  catalog: ServiceCatalogCategory[];
  onCreated: (i: Incident) => void;
  onClose: () => void;
}) {
  const items = catalog.flatMap((category) => category.items.map((item) => ({ ...item, categoryName: category.name })));
  const [catalogItemId, setCatalogItemId] = useState(items[0]?.id || "");
  const selectedItem = items.find((item) => item.id === catalogItemId);
  const schemaFields = Array.isArray(selectedItem?.formSchema) ? selectedItem.formSchema.filter((field): field is { key: string; label: string; type?: string; required?: boolean } => {
    if (!field || typeof field !== "object" || Array.isArray(field)) return false;
    const value = field as Record<string, unknown>;
    return typeof value.key === "string" && typeof value.label === "string";
  }) : [];
  const [form, setForm] = useState({ title: "", description: "", details: "" });
  const [requestDetails, setRequestDetails] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setRequestDetails({}); }, [catalogItemId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!catalogItemId) {
      setError("Select a catalogue item first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onCreated(await api.createServiceRequest(token, {
        catalogItemId,
        title: form.title,
        description: form.description,
        requestDetails: schemaFields.length > 0 ? requestDetails : { details: form.details },
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create service request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">SERVICE CATALOGUE</p>
            <h2>Create service request</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>×</button>
        </div>
        <label>
          Catalogue item
          <select value={catalogItemId} onChange={(e) => setCatalogItemId(e.target.value)} required>
            {items.length === 0 ? <option value="">No active catalogue items</option> : items.map((item) => (
              <option key={item.id} value={item.id}>{item.categoryName} — {item.name}</option>
            ))}
          </select>
          {selectedItem?.description && <small className="muted">{selectedItem.description}</small>}
        </label>
        <label>
          Title
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={3} maxLength={200} placeholder="What do you need?" required autoFocus />
        </label>
        <label>
          Description
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Short summary of the request" />
        </label>
        {schemaFields.length === 0 ? (
          <label>
            Request details
            <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={4} placeholder="Add access name, software, device details, business reason, etc." />
          </label>
        ) : (
          <div className="dynamic-request-fields">
            {schemaFields.map((field) => {
              const value = requestDetails[field.key] || "";
              const setValue = (next: string) => setRequestDetails({ ...requestDetails, [field.key]: next });
              return <label key={field.key}>
                {field.label}{field.required ? " *" : ""}
                {field.type === "textarea" ? (
                  <textarea rows={3} value={value} required={field.required} onChange={(e) => setValue(e.target.value)} />
                ) : (
                  <input type={field.type === "number" || field.type === "date" ? field.type : "text"} value={value} required={field.required} onChange={(e) => setValue(e.target.value)} />
                )}
              </label>;
            })}
          </div>
        )}
        {selectedItem?.defaultAssignmentGroup && <p className="muted">Routes to {selectedItem.defaultAssignmentGroup.name}</p>}
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" disabled={busy || items.length === 0}>{busy ? "Creating…" : "Create request"}</button>
        </div>
      </form>
    </div>
  );
}

function CreateProblem({ token, onCreated, onClose }: { token: string; onCreated: (i: Incident) => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", rootCause: "", workaround: "", permanentFix: "", knownError: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      onCreated(await api.createProblem(token, form));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create problem");
    } finally { setBusy(false); }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head"><div><p className="eyebrow">PROBLEM MANAGEMENT</p><h2>Create problem</h2></div><button type="button" className="icon-button" onClick={onClose}>×</button></div>
        <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={3} maxLength={200} required autoFocus /></label>
        <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></label>
        <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label>
        <label>Root cause<textarea value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} rows={3} /></label>
        <label>Workaround<textarea value={form.workaround} onChange={(e) => setForm({ ...form, workaround: e.target.value })} rows={3} /></label>
        <label>Permanent fix<textarea value={form.permanentFix} onChange={(e) => setForm({ ...form, permanentFix: e.target.value })} rows={3} /></label>
        <label className="check-row"><input type="checkbox" checked={form.knownError} onChange={(e) => setForm({ ...form, knownError: e.target.checked })} />Known error</label>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Creating…" : "Create problem"}</button></div>
      </form>
    </div>
  );
}

function CreateChange({ token, onCreated, onClose }: { token: string; onCreated: (i: Incident) => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", changeType: "NORMAL", risk: "MEDIUM", impact: "MEDIUM", plannedStart: "", plannedEnd: "", implementationPlan: "", backoutPlan: "", testPlan: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      onCreated(await api.createChange(token, { ...form, plannedStart: form.plannedStart || undefined, plannedEnd: form.plannedEnd || undefined }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create change");
    } finally { setBusy(false); }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal record-form-modal" onSubmit={submit}>
        <div className="modal-head"><div><p className="eyebrow">CHANGE MANAGEMENT</p><h2>Create change</h2></div><button type="button" className="icon-button" onClick={onClose}>{"\u00d7"}</button></div>
        <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={3} maxLength={200} required autoFocus /></label>
        <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></label>
        <div className="form-grid">
          <label>Type<select value={form.changeType} onChange={(e) => setForm({ ...form, changeType: e.target.value })}>{["STANDARD","NORMAL","EMERGENCY"].map((x)=><option key={x}>{x}</option>)}</select></label>
          <label>Risk<select value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label>
          <label>Impact<select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label>
          <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label>
          <label>Planned start<input type="datetime-local" value={form.plannedStart} onChange={(e) => setForm({ ...form, plannedStart: e.target.value })} /></label>
          <label>Planned end<input type="datetime-local" value={form.plannedEnd} onChange={(e) => setForm({ ...form, plannedEnd: e.target.value })} /></label>
        </div>
        <label>Implementation plan<textarea value={form.implementationPlan} onChange={(e) => setForm({ ...form, implementationPlan: e.target.value })} rows={3} /></label>
        <label>Backout plan<textarea value={form.backoutPlan} onChange={(e) => setForm({ ...form, backoutPlan: e.target.value })} rows={3} /></label>
        <label>Test plan<textarea value={form.testPlan} onChange={(e) => setForm({ ...form, testPlan: e.target.value })} rows={3} /></label>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Creating..." : "Create change"}</button></div>
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
  const [fullscreen, setFullscreen] = useState(false);
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
      <section className={`modal detail-modal prb-detail-modal ${fullscreen ? "fullscreen" : ""}`}>
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

function ServiceRequestDetail({
  request,
  token,
  canEdit,
  canReopen,
  groups,
  currentUserId,
  onUpdated,
  onClose,
}: {
  request: Incident;
  token: string;
  canEdit: boolean;
  canReopen: boolean;
  groups: AssignmentGroup[];
  currentUserId: string;
  onUpdated: (value: Incident) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(request.status?.name || "OPEN");
  const [groupId, setGroupId] = useState(request.assignmentGroup?.id || groups[0]?.id || "");
  const [assigneeId, setAssigneeId] = useState(request.assignedTo?.id || "");
  const [note, setNote] = useState("");
  const [taskEdits, setTaskEdits] = useState<Record<string, { status: string; assignmentGroupId: string; assignedToId: string }>>({});
  const [activeTab, setActiveTab] = useState<"work-notes" | "approvals" | "tasks" | "attachments">("work-notes");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentConfig, setAttachmentConfig] = useState<{enabled:boolean;maxFileSizeMb:number}|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const selectedGroup = groups.find((group) => group.id === groupId);
  const approvals = request.serviceRequest?.approvals || [];
  const tasks = request.serviceRequest?.tasks || [];

  async function updateStatus() { setBusy(true); setError(""); try { onUpdated(await api.changeServiceRequestStatus(token, request.id, status)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Status update failed"); } finally { setBusy(false); } }
  async function decideApproval(approvalId: string, decision: "APPROVED" | "REJECTED") { setBusy(true); setError(""); try { onUpdated(await api.decideServiceApproval(token, request.id, approvalId, { decision })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update approval"); } finally { setBusy(false); } }
  async function assign() { if (!groupId || !assigneeId) return; setBusy(true); setError(""); try { onUpdated(await api.assignServiceRequest(token, request.id, { assignmentGroupId: groupId, assignedToId: assigneeId })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Assignment failed"); } finally { setBusy(false); } }
  async function addNote() { if (!note.trim()) return; setBusy(true); setError(""); try { await api.addServiceRequestActivity(token, request.id, note, canEdit ? "WORK_NOTE" : "COMMENT"); const refreshed = await api.serviceRequests(token); const value = refreshed.find((item) => item.id === request.id); if (value) onUpdated(value); setNote(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add activity"); } finally { setBusy(false); } }
  async function updateTask(taskId: string) { const value = taskEdits[taskId]; if (!value) return; setBusy(true); setError(""); try { onUpdated(await api.updateServiceRequestTask(token, request.id, taskId, { status: value.status, assignmentGroupId: value.assignmentGroupId || undefined, assignedToId: value.assignedToId || undefined })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update task"); } finally { setBusy(false); } }
  async function loadAttachments() { try { setAttachments(await api.attachments(token, request.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load attachments"); } }
  async function uploadAttachment(file?: File) { if(!file)return;setBusy(true);setError("");try{await api.uploadAttachment(token,request.id,file);await loadAttachments();}catch(reason){setError(reason instanceof Error?reason.message:"Could not upload attachment")}finally{setBusy(false)} }
  async function deleteAttachment(id:string) { setBusy(true);try{await api.deleteAttachment(token,request.id,id);await loadAttachments();}catch(reason){setError(reason instanceof Error?reason.message:"Could not delete attachment")}finally{setBusy(false)} }
  useEffect(() => { api.attachmentConfiguration(token).then(value=>{setAttachmentConfig(value);if(value.enabled)void loadAttachments()}).catch(()=>setAttachmentConfig(null)); }, [token,request.id]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className={`modal detail-modal record-form-modal ${fullscreen ? "fullscreen" : ""}`}>
        <div className="modal-head record-head">
          <div><p className="eyebrow">{request.ticketNumber}</p><h2>{request.title}</h2></div>
          <div className="modal-head-actions"><button type="button" className="icon-button" title={fullscreen ? "Exit full screen" : "Full screen"} onClick={() => setFullscreen((value) => !value)}>{"\u2197"}</button><button type="button" className="icon-button" title="Close" onClick={onClose}>{"\u00d7"}</button></div>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="detail-section request-description"><h3>Description</h3><p>{request.description || "No description provided."}</p></div>
        <div className="record-two-column">
          <div className="record-main-stack">
            <div className="detail-section compact-fields"><h3>Request information</h3><dl><dt>Created</dt><dd>{new Date(request.createdAt).toLocaleString()}</dd><dt>Status</dt><dd><span className={`badge ${(request.status?.name || "OPEN").toLowerCase()}`}>{(request.status?.name || "OPEN").replaceAll("_", " ")}</span></dd><dt>Catalogue Item</dt><dd>{request.serviceRequest?.catalogItem?.name || "Service request"}</dd><dt>Requested By</dt><dd>{request.createdBy.name}</dd></dl></div>
          </div>
          <aside className="record-side-stack">
            <div className="detail-section"><h3>Assignment</h3>{canEdit ? <div className="assignment-row stacked"><select value={groupId} onChange={(e) => { setGroupId(e.target.value); setAssigneeId(""); }}><option value="">Select group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">Select assignee</option>{selectedGroup?.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select><button className="secondary" onClick={assign} disabled={!groupId || !assigneeId || busy}>Assign</button></div> : <dl><dt>Group</dt><dd>{request.assignmentGroup?.name || "Unassigned"}</dd><dt>Assignee</dt><dd>{request.assignedTo?.name || "Unassigned"}</dd></dl>}</div>
            {canEdit && <div className="detail-section"><h3>Status</h3><div className="status-row"><select value={status} onChange={(e) => setStatus(e.target.value)} disabled={request.status?.name === "CLOSED" && !canReopen}>{["OPEN", "IN_PROGRESS", "AWAITING_CUSTOMER", "RESOLVED", "CLOSED"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><button className="secondary" onClick={updateStatus} disabled={busy || (request.status?.name === "CLOSED" && !canReopen)}>Update</button></div>{request.status?.name === "CLOSED" && !canReopen && <p className="muted">Only an administrator can reopen a closed ticket.</p>}</div>}
          </aside>
        </div>
        {request.slas?.length > 0 && <div className="detail-section"><h3>SLA</h3>{request.slas.map((sla) => <div className="ticket-sla" key={sla.id}><div><b>{sla.definitionName}</b><span className={`badge ${sla.status.toLowerCase()}`}>{sla.status.replace("_", " ")}</span></div><small>Response due {new Date(sla.responseDueAt).toLocaleString()}</small><small>Resolution due {new Date(sla.resolutionDueAt).toLocaleString()}</small></div>)}</div>}
        <div className="detail-section record-tab-shell">
          <div className="record-tabs"><button className={activeTab === "work-notes" ? "active" : ""} onClick={() => setActiveTab("work-notes")}>{canEdit ? "Work Notes" : "Comments"}</button><button className={activeTab === "approvals" ? "active" : ""} onClick={() => setActiveTab("approvals")}>Approvals <span>{approvals.length}</span></button><button className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")}>Tasks <span>{tasks.length}</span></button>{attachmentConfig?.enabled && <button className={activeTab === "attachments" ? "active" : ""} onClick={() => setActiveTab("attachments")}>Attachments <span>{attachments.length}</span></button>}</div>
          {activeTab === "work-notes" && <><div className="note-entry"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={canEdit ? "Add an internal work note..." : "Add a comment..."} /><button className="primary" onClick={addNote} disabled={!note.trim() || busy}>Add {canEdit ? "work note" : "comment"}</button></div><div className="activity-list">{request.activities.length === 0 ? <p className="muted">No activity yet.</p> : request.activities.map((activity) => <article key={activity.id}><div><b>{activity.createdBy.name}</b><span className="activity-type">{activity.activityType?.name.replace("_", " ") || "ACTIVITY"}</span><time>{new Date(activity.createdAt).toLocaleString()}</time></div><p>{activity.comment}</p></article>)}</div></>}
          {activeTab === "approvals" && <div className="approval-step-list">{approvals.length === 0 ? <p className="muted">No approvals required for this request.</p> : approvals.map((approval) => <article key={approval.id}><b>Step {approval.sequence}</b><div><strong>{approval.approvalType.replace("_", " ")}</strong><small>{approval.approver?.name || "Approver pending"}</small></div>{approval.status === "PENDING" && (canEdit || approval.approver?.id === currentUserId) ? <span className="approval-actions"><button className="secondary small" disabled={busy} onClick={() => decideApproval(approval.id, "APPROVED")}>Approve</button><button className="secondary small" disabled={busy} onClick={() => decideApproval(approval.id, "REJECTED")}>Reject</button></span> : <span className={`badge ${approval.status.toLowerCase()}`}>{approval.status}</span>}</article>)}</div>}
          {activeTab === "tasks" && <div className="related-list task-card-list">{tasks.length === 0 ? <p className="muted">No tasks created for this request.</p> : tasks.map((task) => { const edit = taskEdits[task.id] || { status: task.status, assignmentGroupId: task.assignmentGroup?.id || "", assignedToId: task.assignedTo?.id || "" }; const taskGroup = groups.find((group) => group.id === edit.assignmentGroupId); return <article key={task.id}><button className="link-button task-number-link" type="button">{task.taskNumber}</button><div><strong>{task.title}</strong>{task.description && <small>{task.description}</small>}<small>{task.assignmentGroup?.name || "No group"} - {task.assignedTo?.name || "Unassigned"}</small></div>{canEdit ? <div className="task-edit-row"><select value={edit.status} onChange={(e) => setTaskEdits({ ...taskEdits, [task.id]: { ...edit, status: e.target.value } })}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select><select value={edit.assignmentGroupId} onChange={(e) => setTaskEdits({ ...taskEdits, [task.id]: { ...edit, assignmentGroupId: e.target.value, assignedToId: "" } })}><option value="">No group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><select value={edit.assignedToId} onChange={(e) => setTaskEdits({ ...taskEdits, [task.id]: { ...edit, assignedToId: e.target.value } })}><option value="">Unassigned</option>{taskGroup?.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select><button className="secondary small" disabled={busy} onClick={() => updateTask(task.id)}>Save</button></div> : <span className={`badge ${task.status.toLowerCase()}`}>{task.status}</span>}</article>; })}</div>}
          {activeTab === "attachments" && <div className="attachment-panel"><label className="attachment-upload">Add attachment <small>Maximum {attachmentConfig?.maxFileSizeMb||10} MB</small><input type="file" disabled={busy} onChange={e=>{void uploadAttachment(e.target.files?.[0]);e.target.value=''}}/></label>{attachments.length===0?<p className="muted">No attachments yet.</p>:<div className="attachment-list">{attachments.map(item=><article key={item.id}><div><b>{item.fileName}</b><small>{(item.sizeBytes/1024).toFixed(1)} KB - {item.uploadedBy.name} - {new Date(item.createdAt).toLocaleString()}</small></div><button className="secondary small" onClick={()=>api.downloadAttachment(token,request.id,item.id,item.fileName)}>Download</button><button className="icon-button danger" title="Delete attachment" onClick={()=>deleteAttachment(item.id)}>{"\u00d7"}</button></article>)}</div>}</div>}
        </div>
      </section>
    </div>
  );
}

function ProblemDetail({ problem, token, canEdit, canReopen, groups, onUpdated, onClose }: { problem: Incident; token: string; canEdit: boolean; canReopen: boolean; groups: AssignmentGroup[]; onUpdated: (value: Incident) => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: problem.title, description: problem.description || "", priority: problem.priority?.name || "MEDIUM", rootCause: problem.problem?.rootCause || "", workaround: problem.problem?.workaround || "", permanentFix: problem.problem?.permanentFix || "", knownError: problem.problem?.knownError || false });
  const [status, setStatus] = useState(problem.status?.name || "OPEN");
  const [groupId, setGroupId] = useState(problem.assignmentGroup?.id || groups[0]?.id || "");
  const [assigneeId, setAssigneeId] = useState(problem.assignedTo?.id || "");
  const [note, setNote] = useState("");
  const [activeTab, setActiveTab] = useState<"work-notes" | "tasks" | "related" | "risk">("work-notes");
  const [taskDraft, setTaskDraft] = useState({ title: "", description: "", assignmentGroupId: "", assignedToId: "" });
  const [taskEdits, setTaskEdits] = useState<Record<string, { status: string; assignmentGroupId: string; assignedToId: string }>>({});
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [relatedNumber, setRelatedNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const selectedGroup = groups.find((group) => group.id === groupId);
  const activities = [...problem.activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const tasks = problem.problem?.tasks || [];
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || tasks[0];
  const fieldValue = (value?: string | null) => value?.trim() || "Not documented";
  async function save() { setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.updateProblem(token, problem.id, form)); setSuccess("Problem details updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update problem"); } finally { setBusy(false); } }
  async function updateStatus() { setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.changeProblemStatus(token, problem.id, status)); setSuccess("Status updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update status"); } finally { setBusy(false); } }
  async function assign() { if(!groupId||!assigneeId)return; setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.assignProblem(token, problem.id, { assignmentGroupId: groupId, assignedToId: assigneeId })); setSuccess("Assignment updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Assignment failed"); } finally { setBusy(false); } }
  async function addNote() { if(!note.trim())return; setBusy(true); setError(""); try { await api.addProblemActivity(token, problem.id, note, canEdit ? "WORK_NOTE" : "COMMENT"); const refreshed = await api.problems(token); const value = refreshed.find((item)=>item.id===problem.id); if(value) onUpdated(value); setNote(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add activity"); } finally { setBusy(false); } }
  async function createTask() { if(!taskDraft.title.trim())return; setBusy(true); setError(""); setSuccess(""); try { const updated = await api.createProblemTask(token, problem.id, { ...taskDraft, assignmentGroupId: taskDraft.assignmentGroupId || undefined, assignedToId: taskDraft.assignedToId || undefined }); onUpdated(updated); setSelectedTaskId(updated.problem?.tasks?.at(-1)?.id || ""); setTaskDraft({ title: "", description: "", assignmentGroupId: "", assignedToId: "" }); setSuccess("PTask opened."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create problem task"); } finally { setBusy(false); } }
  async function updateTask(taskId: string) { const value = taskEdits[taskId]; if(!value)return; setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.updateProblemTask(token, problem.id, taskId, { status: value.status, assignmentGroupId: value.assignmentGroupId || undefined, assignedToId: value.assignedToId || undefined })); setSuccess("PTask updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update problem task"); } finally { setBusy(false); } }
  async function loadRelated() { try { setRelatedItems(await api.relatedItems(token, problem.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load related incidents"); } }
  async function addRelated() { if(!relatedNumber.trim())return; setBusy(true); setError(""); setSuccess(""); try { await api.addRelatedItem(token, problem.id, { relatedTicketNumber: relatedNumber, relationshipType: "CHILD_INCIDENT" }); setRelatedNumber(""); await loadRelated(); setSuccess("Related incident linked."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not link related incident"); } finally { setBusy(false); } }
  useEffect(() => { if(activeTab === "related") void loadRelated(); }, [activeTab, problem.id]);
  useEffect(() => { if(!selectedTaskId && tasks.length) setSelectedTaskId(tasks[0].id); }, [problem.id, tasks.length]);
  return <div className="modal-backdrop" onMouseDown={(e)=>e.target===e.currentTarget&&onClose()}><section className={`modal detail-modal record-form-modal ${fullscreen ? "fullscreen" : ""}`}>
    <div className="modal-head record-head"><div><p className="eyebrow">{problem.ticketNumber}</p><h2>{problem.title}</h2><p className="muted">{problem.title}</p></div><div className="modal-head-actions"><button type="button" className="icon-button" title={fullscreen ? "Exit full screen" : "Full screen"} onClick={() => setFullscreen((value) => !value)}>{"\u2197"}</button><button type="button" className="icon-button" title="Close" onClick={onClose}>{"\u00d7"}</button></div></div>
    {success&&<div className="success">{success}</div>}{error&&<div className="error">{error}</div>}
    <div className="record-two-column">
      <div className="record-main-stack"><div className="detail-section problem-form-fields"><h3>Problem details</h3>{canEdit ? <><label>Title<input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></label><label>Description<textarea rows={4} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label><label>Impact<textarea rows={3} disabled placeholder="Impact field will be added with PRB risk fields."/></label><label>Root Cause<textarea rows={4} value={form.rootCause} onChange={(e)=>setForm({...form,rootCause:e.target.value})}/></label><label>Workaround<textarea rows={3} value={form.workaround} onChange={(e)=>setForm({...form,workaround:e.target.value})}/></label><label>Permanent Fix<textarea rows={4} value={form.permanentFix} onChange={(e)=>setForm({...form,permanentFix:e.target.value})}/></label><label className="check-row"><input type="checkbox" checked={form.knownError} onChange={(e)=>setForm({...form,knownError:e.target.checked})}/>Risk accepted</label><button className="primary" disabled={busy} onClick={save}>Save problem</button></> : <dl className="compact-fields"><dt>Description</dt><dd>{fieldValue(problem.description)}</dd><dt>Impact</dt><dd>Not documented</dd><dt>Root Cause</dt><dd>{fieldValue(problem.problem?.rootCause)}</dd><dt>Workaround</dt><dd>{fieldValue(problem.problem?.workaround)}</dd><dt>Permanent Fix</dt><dd>{fieldValue(problem.problem?.permanentFix)}</dd><dt>Risk Accepted</dt><dd>{problem.problem?.knownError ? "Yes" : "No"}</dd></dl>}</div></div>
      <aside className="record-side-stack"><div className="detail-section compact-fields"><h3>Record info</h3><dl><dt>Created By</dt><dd>{problem.createdBy.name}</dd><dt>Opened On</dt><dd>{new Date(problem.createdAt).toLocaleString()}</dd><dt>Priority</dt><dd>{problem.priority?.name || form.priority}</dd><dt>Status</dt><dd><span className={`badge ${(problem.status?.name || "OPEN").toLowerCase()}`}>{(problem.status?.name || "OPEN").replaceAll("_", " ")}</span></dd><dt>Problem Type</dt><dd>Reactive</dd><dt>Configuration Item</dt><dd>Not linked</dd></dl></div>{canEdit&&<div className="detail-section"><h3>Assignment</h3><div className="assignment-row stacked"><select value={groupId} onChange={(e)=>{setGroupId(e.target.value);setAssigneeId("");}}><option value="">Select group</option>{groups.map((g)=><option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={assigneeId} onChange={(e)=>setAssigneeId(e.target.value)}><option value="">Select assignee</option>{selectedGroup?.members.map((m)=><option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}</select><button className="secondary" disabled={!groupId||!assigneeId||busy} onClick={assign}>Update assignment</button></div></div>}{canEdit&&<div className="detail-section"><h3>Status</h3><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="AWAITING_CUSTOMER">Awaiting customer</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select><button className="secondary" disabled={busy} onClick={updateStatus}>Update status</button>{problem.status?.name==="CLOSED"&&!canReopen&&<p className="muted">Only an administrator can reopen a closed problem.</p>}</div>}</aside>
    </div>
    <div className="detail-section record-tab-shell"><div className="record-tabs"><button className={activeTab==="work-notes"?"active":""} onClick={()=>setActiveTab("work-notes")}>Work Notes</button><button className={activeTab==="tasks"?"active":""} onClick={()=>setActiveTab("tasks")}>Problem Tasks <span>{tasks.length}</span></button><button className={activeTab==="related"?"active":""} onClick={()=>setActiveTab("related")}>Related Incidents <span>{relatedItems.length}</span></button><button className={activeTab==="risk"?"active":""} onClick={()=>setActiveTab("risk")}>Risk</button></div>
      {activeTab==="work-notes"&&<><div className="note-entry"><textarea rows={3} value={note} onChange={(e)=>setNote(e.target.value)} placeholder={canEdit ? "Add an internal work note..." : "Add a comment..."}/><button className="primary" disabled={!note.trim()||busy} onClick={addNote}>Add {canEdit ? "work note" : "comment"}</button></div><div className="activity-list">{activities.length ? activities.map((a)=><article key={a.id}><div><b>{a.createdBy.name}</b><span className="activity-type">{a.activityType?.name?.replace("_", " ")||"ACTIVITY"}</span><time>{new Date(a.createdAt).toLocaleString()}</time></div><p>{a.comment}</p></article>) : <p className="muted">No activity yet.</p>}</div></>}
      {activeTab==="tasks"&&<div className="problem-task-workspace">{canEdit&&<div className="admin-helper-grid"><input placeholder="Task title" value={taskDraft.title} onChange={(e)=>setTaskDraft({...taskDraft,title:e.target.value})}/><input placeholder="Task description" value={taskDraft.description} onChange={(e)=>setTaskDraft({...taskDraft,description:e.target.value})}/><select value={taskDraft.assignmentGroupId} onChange={(e)=>setTaskDraft({...taskDraft,assignmentGroupId:e.target.value,assignedToId:""})}><option value="">No group</option>{groups.map((g)=><option key={g.id} value={g.id}>{g.name}</option>)}</select><button className="secondary small" onClick={createTask} disabled={busy}>Open PTask</button></div>}{tasks.length ? <div className="problem-task-layout"><div className="problem-task-list">{tasks.map((task)=><button key={task.id} className={`problem-task-card ${selectedTask?.id===task.id?"active":""}`} type="button" onClick={()=>setSelectedTaskId(task.id)}><strong>{task.taskNumber}</strong><span>{task.title}</span><small>{task.status.replaceAll("_", " ")}</small></button>)}</div>{selectedTask&&(()=>{ const edit=taskEdits[selectedTask.id]||{status:selectedTask.status,assignmentGroupId:selectedTask.assignmentGroup?.id||"",assignedToId:selectedTask.assignedTo?.id||""}; const taskGroup=groups.find((g)=>g.id===edit.assignmentGroupId); return <div className="problem-task-detail"><div className="task-detail-head"><div><p className="eyebrow">{selectedTask.taskNumber}</p><h3>{selectedTask.title}</h3></div><span className={`badge ${selectedTask.status.toLowerCase()}`}>{selectedTask.status.replaceAll("_", " ")}</span></div>{selectedTask.description&&<p>{selectedTask.description}</p>}<dl className="compact-fields"><dt>Assignment Group</dt><dd>{selectedTask.assignmentGroup?.name||"No group"}</dd><dt>Assigned To</dt><dd>{selectedTask.assignedTo?.name||"Unassigned"}</dd><dt>Created</dt><dd>{new Date(selectedTask.createdAt).toLocaleString()}</dd></dl>{canEdit&&<div className="task-edit-row"><select value={edit.status} onChange={(e)=>setTaskEdits({...taskEdits,[selectedTask.id]:{...edit,status:e.target.value}})}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select><select value={edit.assignmentGroupId} onChange={(e)=>setTaskEdits({...taskEdits,[selectedTask.id]:{...edit,assignmentGroupId:e.target.value,assignedToId:""}})}><option value="">No group</option>{groups.map((g)=><option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={edit.assignedToId} onChange={(e)=>setTaskEdits({...taskEdits,[selectedTask.id]:{...edit,assignedToId:e.target.value}})}><option value="">Unassigned</option>{taskGroup?.members.map((m)=><option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}</select><button className="secondary small" onClick={()=>updateTask(selectedTask.id)} disabled={busy}>Save PTask</button></div>}</div>; })()}</div> : <p className="muted">No PTasks opened yet.</p>}</div>}
      {activeTab==="related"&&<div className="related-panel">{canEdit&&<div className="related-entry"><input value={relatedNumber} onChange={(e)=>setRelatedNumber(e.target.value)} placeholder="Incident number, e.g. INC000001"/><button className="secondary" onClick={addRelated} disabled={!relatedNumber.trim()||busy}>Link child incident</button></div>}{relatedItems.length===0?<p className="muted">No related incidents linked.</p>:<div className="related-list">{relatedItems.filter((item)=>item.relationshipType==="CHILD_INCIDENT").map((item)=><article key={item.id}><button className="link-button task-number-link" type="button">{item.ticketNumber}</button><span>{item.title}</span><span className="badge">{item.status}</span><small>{new Date(item.createdAt).toLocaleString()}</small></article>)}</div>}</div>}
      {activeTab==="risk"&&<div className="risk-summary"><p className="muted">Risk Owner, Risk Accepted Till, and Risk Acceptance Summary will become editable after PRB risk fields are added to the database.</p></div>}
    </div>
  </section></div>;
}

function ChangeDetail({ change, token, canEdit, canReopen, groups, onUpdated, onClose }: { change: Incident; token: string; canEdit: boolean; canReopen: boolean; groups: AssignmentGroup[]; onUpdated: (value: Incident) => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: change.title, description: change.description || "", priority: change.priority?.name || "MEDIUM", changeType: change.change?.changeType || "NORMAL", risk: change.change?.risk || "MEDIUM", impact: change.change?.impact || "MEDIUM", plannedStart: change.change?.plannedStart?.slice(0, 16) || "", plannedEnd: change.change?.plannedEnd?.slice(0, 16) || "", implementationPlan: change.change?.implementationPlan || "", backoutPlan: change.change?.backoutPlan || "", testPlan: change.change?.testPlan || "" });
  const [status, setStatus] = useState(change.status?.name || "OPEN");
  const [groupId, setGroupId] = useState(change.assignmentGroup?.id || groups[0]?.id || "");
  const [assigneeId, setAssigneeId] = useState(change.assignedTo?.id || "");
  const [note, setNote] = useState("");
  const [activeTab, setActiveTab] = useState<"work-notes" | "related" | "plans">("work-notes");
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [relatedNumber, setRelatedNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const selectedGroup = groups.find((group) => group.id === groupId);
  const activities = [...change.activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  async function save() { setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.updateChange(token, change.id, { ...form, plannedStart: form.plannedStart || undefined, plannedEnd: form.plannedEnd || undefined })); setSuccess("Change details updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update change"); } finally { setBusy(false); } }
  async function updateStatus() { setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.changeChangeStatus(token, change.id, status)); setSuccess("Status updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update status"); } finally { setBusy(false); } }
  async function assign() { if(!groupId||!assigneeId)return; setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.assignChange(token, change.id, { assignmentGroupId: groupId, assignedToId: assigneeId })); setSuccess("Assignment updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Assignment failed"); } finally { setBusy(false); } }
  async function addNote() { if(!note.trim())return; setBusy(true); setError(""); try { await api.addChangeActivity(token, change.id, note, canEdit ? "WORK_NOTE" : "COMMENT"); const refreshed = await api.changes(token); const value = refreshed.find((item)=>item.id===change.id); if(value) onUpdated(value); setNote(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add activity"); } finally { setBusy(false); } }
  async function loadRelated() { try { setRelatedItems(await api.relatedItems(token, change.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load related items"); } }
  async function addRelated() { if(!relatedNumber.trim())return; setBusy(true); setError(""); setSuccess(""); try { await api.addRelatedItem(token, change.id, { relatedTicketNumber: relatedNumber, relationshipType: "RELATED_CHANGE" }); setRelatedNumber(""); await loadRelated(); setSuccess("Related item linked."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not link related item"); } finally { setBusy(false); } }
  useEffect(() => { if(activeTab === "related") void loadRelated(); }, [activeTab, change.id]);
  return <div className="modal-backdrop" onMouseDown={(e)=>e.target===e.currentTarget&&onClose()}><section className={`modal detail-modal record-form-modal ${fullscreen ? "fullscreen" : ""}`}>
    <div className="modal-head record-head"><div><p className="eyebrow">{change.ticketNumber}</p><h2>{change.title}</h2><p className="muted">{change.change?.changeType || "NORMAL"} change</p></div><div className="modal-head-actions"><button type="button" className="icon-button" title={fullscreen ? "Exit full screen" : "Full screen"} onClick={() => setFullscreen((value) => !value)}>{"\u2197"}</button><button type="button" className="icon-button" title="Close" onClick={onClose}>{"\u00d7"}</button></div></div>
    {success&&<div className="success">{success}</div>}{error&&<div className="error">{error}</div>}
    <div className="record-two-column">
      <div className="record-main-stack"><div className="detail-section problem-form-fields"><h3>Change details</h3>{canEdit ? <><label>Title<input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></label><label>Description<textarea rows={4} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label><div className="form-grid"><label>Type<select value={form.changeType} onChange={(e)=>setForm({...form,changeType:e.target.value})}>{["STANDARD","NORMAL","EMERGENCY"].map((x)=><option key={x}>{x}</option>)}</select></label><label>Risk<select value={form.risk} onChange={(e)=>setForm({...form,risk:e.target.value})}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label><label>Impact<select value={form.impact} onChange={(e)=>setForm({...form,impact:e.target.value})}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label><label>Priority<select value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value})}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label><label>Planned start<input type="datetime-local" value={form.plannedStart} onChange={(e)=>setForm({...form,plannedStart:e.target.value})}/></label><label>Planned end<input type="datetime-local" value={form.plannedEnd} onChange={(e)=>setForm({...form,plannedEnd:e.target.value})}/></label></div><button className="primary" disabled={busy} onClick={save}>Save change</button></> : <p>{change.description || "No description provided."}</p>}</div></div>
      <aside className="record-side-stack"><div className="detail-section compact-fields"><h3>Record info</h3><dl><dt>Requested By</dt><dd>{change.change?.requestedBy?.name || change.createdBy.name}</dd><dt>Opened On</dt><dd>{new Date(change.createdAt).toLocaleString()}</dd><dt>Priority</dt><dd>{change.priority?.name || form.priority}</dd><dt>Status</dt><dd><span className={`badge ${(change.status?.name || "OPEN").toLowerCase()}`}>{(change.status?.name || "OPEN").replaceAll("_", " ")}</span></dd><dt>Risk</dt><dd>{change.change?.risk || form.risk}</dd><dt>Impact</dt><dd>{change.change?.impact || form.impact}</dd></dl></div>{canEdit&&<div className="detail-section"><h3>Assignment</h3><div className="assignment-row stacked"><select value={groupId} onChange={(e)=>{setGroupId(e.target.value);setAssigneeId("");}}><option value="">Select group</option>{groups.map((g)=><option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={assigneeId} onChange={(e)=>setAssigneeId(e.target.value)}><option value="">Select assignee</option>{selectedGroup?.members.map((m)=><option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}</select><button className="secondary" disabled={!groupId||!assigneeId||busy} onClick={assign}>Update assignment</button></div></div>}{canEdit&&<div className="detail-section"><h3>Status</h3><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="AWAITING_CUSTOMER">Awaiting customer</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select><button className="secondary" disabled={busy} onClick={updateStatus}>Update status</button>{change.status?.name==="CLOSED"&&!canReopen&&<p className="muted">Only an administrator can reopen a closed change.</p>}</div>}</aside>
    </div>
    <div className="detail-section record-tab-shell"><div className="record-tabs"><button className={activeTab==="work-notes"?"active":""} onClick={()=>setActiveTab("work-notes")}>Work Notes</button><button className={activeTab==="plans"?"active":""} onClick={()=>setActiveTab("plans")}>Plans</button><button className={activeTab==="related"?"active":""} onClick={()=>setActiveTab("related")}>Related Items <span>{relatedItems.length}</span></button></div>{activeTab==="work-notes"&&<><div className="note-entry"><textarea rows={3} value={note} onChange={(e)=>setNote(e.target.value)} placeholder={canEdit ? "Add an internal work note..." : "Add a comment..."}/><button className="primary" disabled={!note.trim()||busy} onClick={addNote}>Add {canEdit ? "work note" : "comment"}</button></div><div className="activity-list">{activities.length ? activities.map((a)=><article key={a.id}><div><b>{a.createdBy.name}</b><span className="activity-type">{a.activityType?.name?.replace("_", " ")||"ACTIVITY"}</span><time>{new Date(a.createdAt).toLocaleString()}</time></div><p>{a.comment}</p></article>) : <p className="muted">No activity yet.</p>}</div></>}{activeTab==="plans"&&<div className="change-plan-grid">{["implementationPlan","backoutPlan","testPlan"].map((key)=><label key={key}>{key==="implementationPlan"?"Implementation plan":key==="backoutPlan"?"Backout plan":"Test plan"}<textarea rows={4} disabled={!canEdit} value={form[key as "implementationPlan"|"backoutPlan"|"testPlan"]} onChange={(e)=>setForm({...form,[key]:e.target.value})}/></label>)}{canEdit&&<button className="primary" disabled={busy} onClick={save}>Save plans</button>}</div>}{activeTab==="related"&&<div className="related-panel">{canEdit&&<div className="related-entry"><input value={relatedNumber} onChange={(e)=>setRelatedNumber(e.target.value)} placeholder="Ticket number, e.g. INC000001 or PRB000001"/><button className="secondary" onClick={addRelated} disabled={!relatedNumber.trim()||busy}>Link item</button></div>}{relatedItems.length===0?<p className="muted">No related items linked.</p>:<div className="related-list">{relatedItems.map((item)=><article key={item.id}><button className="link-button task-number-link" type="button">{item.ticketNumber}</button><span>{item.title}</span><span className="badge">{item.status}</span><small>{item.relationshipType.replaceAll("_"," ")}</small></article>)}</div>}</div>}</div>
  </section></div>;
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

function Dashboard({ session, onLogout, branding, themePreference, onThemePreferenceChange }: { session: Session; onLogout: () => void; branding: Branding; themePreference: ThemePreference; onThemePreferenceChange: (value: ThemePreference) => void }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [serviceRequests, setServiceRequests] = useState<Incident[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<Incident[]>([]);
  const [problems, setProblems] = useState<Incident[]>([]);
  const [changes, setChanges] = useState<Incident[]>([]);
  const [catalog, setCatalog] = useState<ServiceCatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [creatingProblem, setCreatingProblem] = useState(false);
  const [creatingChange, setCreatingChange] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Incident | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Incident | null>(null);
  const [selectedChange, setSelectedChange] = useState<Incident | null>(null);
  const [activeModule, setActiveModule] = useState<"INCIDENTS" | "REQUESTS" | "APPROVALS" | "PROBLEMS" | "CHANGES">(() => {
    const saved = localStorage.getItem(modulePreferenceKey);
    return saved === "REQUESTS" || saved === "APPROVALS" || saved === "PROBLEMS" || saved === "CHANGES" ? saved : "INCIDENTS";
  });
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
    setLoading(true);
    Promise.all([
      api.incidents(session.accessToken),
      api.serviceRequests(session.accessToken),
      api.pendingServiceApprovals(session.accessToken),
      api.problems(session.accessToken),
      api.changes(session.accessToken),
      api.serviceCatalog(session.accessToken),
    ])
      .then(([incidentValues, requestValues, approvalValues, problemValues, changeValues, catalogValues]) => {
        setIncidents(incidentValues);
        setServiceRequests(requestValues);
        setApprovalRequests(approvalValues);
        setProblems(problemValues);
        setChanges(changeValues);
        setCatalog(catalogValues);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session.accessToken]);
  useEffect(() => {
    localStorage.setItem(modulePreferenceKey, activeModule);
  }, [activeModule]);
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
  const requestStats = useMemo(
    () => ({
      open: serviceRequests.filter((i) => !["RESOLVED", "CLOSED"].includes(i.status?.name || "")).length,
      inProgress: serviceRequests.filter((i) => i.status?.name === "IN_PROGRESS").length,
      total: serviceRequests.length,
      catalogItems: catalog.reduce((total, category) => total + category.items.length, 0),
    }),
    [catalog, serviceRequests],
  );
  const problemStats = useMemo(
    () => ({
      open: problems.filter((i) => !["RESOLVED", "CLOSED"].includes(i.status?.name || "")).length,
      inProgress: problems.filter((i) => i.status?.name === "IN_PROGRESS").length,
      knownErrors: problems.filter((i) => i.problem?.knownError).length,
      total: problems.length,
    }),
    [problems],
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
  const visibleServiceRequests = useMemo(
    () =>
      serviceRequests.filter((request) => {
        const term = search.toLowerCase();
        const matchesText =
          !term ||
          request.ticketNumber.toLowerCase().includes(term) ||
          request.title.toLowerCase().includes(term) ||
          request.serviceRequest?.catalogItem?.name.toLowerCase().includes(term);
        const matchesStatus =
          statusFilter === "ALL" || request.status?.name === statusFilter;
        return matchesText && matchesStatus;
      }),
    [serviceRequests, search, statusFilter],
  );
  const visibleProblems = useMemo(
    () =>
      problems.filter((problem) => {
        const term = search.toLowerCase();
        const matchesText =
          !term ||
          problem.ticketNumber.toLowerCase().includes(term) ||
          problem.title.toLowerCase().includes(term) ||
          problem.problem?.rootCause?.toLowerCase().includes(term);
        const matchesStatus =
          statusFilter === "ALL" || problem.status?.name === statusFilter;
        return matchesText && matchesStatus;
      }),
    [problems, search, statusFilter],
  );
  const visibleChanges = useMemo(
    () =>
      changes.filter((change) => {
        const term = search.toLowerCase();
        const matchesText =
          !term ||
          change.ticketNumber.toLowerCase().includes(term) ||
          change.title.toLowerCase().includes(term) ||
          change.change?.changeType?.toLowerCase().includes(term);
        const matchesStatus =
          statusFilter === "ALL" || change.status?.name === statusFilter;
        return matchesText && matchesStatus;
      }),
    [changes, search, statusFilter],
  );
  const changeStats = useMemo(
    () => ({
      open: changes.filter((i) => !["RESOLVED", "CLOSED"].includes(i.status?.name || "")).length,
      inProgress: changes.filter((i) => i.status?.name === "IN_PROGRESS").length,
      highRisk: changes.filter((i) => ["HIGH", "CRITICAL"].includes(i.change?.risk || "")).length,
      total: changes.length,
    }),
    [changes],
  );
  const visibleApprovalRequests = useMemo(
    () =>
      approvalRequests.filter((request) => {
        const term = search.toLowerCase();
        const matchesText =
          !term ||
          request.ticketNumber.toLowerCase().includes(term) ||
          request.title.toLowerCase().includes(term) ||
          request.serviceRequest?.catalogItem?.name.toLowerCase().includes(term);
        const matchesStatus =
          statusFilter === "ALL" || request.status?.name === statusFilter;
        return matchesText && matchesStatus;
      }),
    [approvalRequests, search, statusFilter],
  );
  const queueItems = activeModule === "REQUESTS" ? visibleServiceRequests : activeModule === "APPROVALS" ? visibleApprovalRequests : activeModule === "PROBLEMS" ? visibleProblems : activeModule === "CHANGES" ? visibleChanges : visibleIncidents;
  return (
    <div className="app-shell">
      <aside>
        <Brand branding={branding} />
        <nav>
          <a className={activeModule === "INCIDENTS" ? "active" : ""} onClick={() => setActiveModule("INCIDENTS")}>
            ▦ <span>Incidents</span>
          </a>
          <a className={activeModule === "REQUESTS" ? "active" : ""} onClick={() => setActiveModule("REQUESTS")}>
            ⌁ <span>Service requests</span>
          </a>
          <a className={activeModule === "APPROVALS" ? "active" : ""} onClick={() => setActiveModule("APPROVALS")}>
            ↗ <span>Approvals</span>
          </a>
          <a className={activeModule === "PROBLEMS" ? "active" : ""} onClick={() => setActiveModule("PROBLEMS")}>
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
        <div className="user-block simple-user-block">
          <div className="avatar">
            {session.user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <strong>{session.user.name}</strong>
            <button className="sign-out-link" title="Sign out" onClick={onLogout}>Sign out</button>
          </div>
        </div>
      </aside>
      <main className="workspace">
        <header>
          <div>
            <p className="eyebrow">
              {isEmployee ? "EMPLOYEE SUPPORT" : "SERVICE OPERATIONS"}
            </p>
            <h1>{activeModule === "REQUESTS" ? (isEmployee ? "My service requests" : "Service requests") : activeModule === "APPROVALS" ? "My approvals" : activeModule === "PROBLEMS" ? "Problems" : activeModule === "CHANGES" ? "Changes" : (isEmployee ? "My incidents" : "Incidents")}</h1>
            <p>
              {activeModule === "REQUESTS"
                ? "Browse catalogue requests and track fulfilment."
                : activeModule === "APPROVALS"
                ? "Review service requests waiting for your decision."
                : activeModule === "PROBLEMS"
                ? "Investigate recurring issues, document root cause, and coordinate PTasks."
                : activeModule === "CHANGES"
                ? "Plan, assess, and coordinate controlled changes."
                : isEmployee
                ? "Report issues and follow their progress."
                : "Track interruptions and restore service quickly."}
            </p>
          </div>
          <button className="primary compact" onClick={() => activeModule === "REQUESTS" ? setCreatingRequest(true) : activeModule === "PROBLEMS" ? setCreatingProblem(true) : activeModule === "CHANGES" ? setCreatingChange(true) : setCreating(true)}>
            {activeModule === "REQUESTS" ? "＋ New request" : activeModule === "PROBLEMS" ? "＋ New problem" : "＋ New incident"}
          </button>
        </header>
        <section className="stats">
          <article>
            <span>Open</span>
            <strong>{activeModule === "REQUESTS" ? requestStats.open : activeModule === "APPROVALS" ? approvalRequests.length : activeModule === "PROBLEMS" ? problemStats.open : activeModule === "CHANGES" ? changeStats.open : stats.open}</strong>
            <small>Awaiting action</small>
          </article>
          <article>
            <span>In progress</span>
            <strong>{activeModule === "REQUESTS" ? requestStats.inProgress : activeModule === "APPROVALS" ? approvalRequests.filter((i) => i.status?.name === "AWAITING_APPROVAL").length : activeModule === "PROBLEMS" ? problemStats.inProgress : activeModule === "CHANGES" ? changeStats.inProgress : stats.active}</strong>
            <small>Work underway</small>
          </article>
          <article>
            <span>{activeModule === "REQUESTS" ? "Catalogue items" : activeModule === "APPROVALS" ? "Pending" : activeModule === "PROBLEMS" ? "Known errors" : activeModule === "CHANGES" ? "High risk" : "Critical"}</span>
            <strong>{activeModule === "REQUESTS" ? requestStats.catalogItems : activeModule === "APPROVALS" ? approvalRequests.length : activeModule === "PROBLEMS" ? problemStats.knownErrors : activeModule === "CHANGES" ? changeStats.highRisk : stats.critical}</strong>
            <small>{activeModule === "REQUESTS" ? "Available request types" : activeModule === "APPROVALS" ? "Decisions assigned to you" : activeModule === "PROBLEMS" ? "Documented known errors" : activeModule === "CHANGES" ? "High or critical risk" : "Highest priority"}</small>
          </article>
          <article>
            <span>Total</span>
            <strong>{activeModule === "REQUESTS" ? requestStats.total : activeModule === "APPROVALS" ? approvalRequests.length : activeModule === "PROBLEMS" ? problemStats.total : activeModule === "CHANGES" ? changeStats.total : incidents.length}</strong>
            <small>{activeModule === "REQUESTS" ? "All requests" : activeModule === "APPROVALS" ? "Awaiting you" : activeModule === "PROBLEMS" ? "All problems" : activeModule === "CHANGES" ? "All changes" : "All incidents"}</small>
          </article>
        </section>
        <section className="table-card">
          <div className="table-head">
            <div>
              <h2>{activeModule === "REQUESTS" ? "Request queue" : activeModule === "APPROVALS" ? "Approval queue" : activeModule === "PROBLEMS" ? "Problem queue" : activeModule === "CHANGES" ? "Change queue" : "Incident queue"}</h2>
              <p>{activeModule === "REQUESTS" ? "Service requests for your scope" : activeModule === "APPROVALS" ? "Service requests assigned to you for approval" : activeModule === "PROBLEMS" ? "Problems for investigation and root cause tracking" : activeModule === "CHANGES" ? "Changes for planning, approval, and execution" : "All incidents in your organization"}</p>
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
                placeholder={activeModule === "REQUESTS" || activeModule === "APPROVALS" ? "Search requests" : activeModule === "PROBLEMS" ? "Search problems" : activeModule === "CHANGES" ? "Search changes" : "Search incidents"}
              />
            </div>
          </div>
          {loading ? (
            <div className="empty">{activeModule === "REQUESTS" ? "Loading requests…" : activeModule === "PROBLEMS" ? "Loading problems…" : "Loading incidents…"}</div>
          ) : error ? (
            <div className="error table-error">{error}</div>
          ) : queueItems.length === 0 ? (
            <div className="empty">
              <b>{activeModule === "REQUESTS" ? "No matching requests" : activeModule === "APPROVALS" ? "No pending approvals" : activeModule === "PROBLEMS" ? "No matching problems" : activeModule === "CHANGES" ? "No matching changes" : "No matching incidents"}</b>
              <span>Try changing your search or filter.</span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>{activeModule === "REQUESTS" || activeModule === "APPROVALS" ? "Request" : activeModule === "PROBLEMS" ? "Problem" : activeModule === "CHANGES" ? "Change" : "Incident"}</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {queueItems.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <button
                          className="ticket-link"
                          onClick={() => activeModule === "REQUESTS" || activeModule === "APPROVALS" ? setSelectedRequest(i) : activeModule === "PROBLEMS" ? setSelectedProblem(i) : activeModule === "CHANGES" ? setSelectedChange(i) : setSelected(i)}
                        >
                          {i.ticketNumber}
                        </button>
                      </td>
                      <td>
                        <strong>{i.title}</strong>
                        <small>
                          {activeModule === "REQUESTS" || activeModule === "APPROVALS" ? i.serviceRequest?.catalogItem?.name || "Service request" : activeModule === "PROBLEMS" ? i.problem?.knownError ? "Known error" : "Root cause investigation" : activeModule === "CHANGES" ? `${i.change?.changeType || "NORMAL"} change - ${i.change?.risk || "MEDIUM"} risk` : i.incident?.affectedService || "General service"}
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
      {creatingRequest && (
        <CreateServiceRequest
          token={session.accessToken}
          catalog={catalog}
          onClose={() => setCreatingRequest(false)}
          onCreated={(request) => {
            setServiceRequests((x) => [request, ...x]);
            setCreatingRequest(false);
            setActiveModule("REQUESTS");
          }}
        />
      )}
      {creatingProblem && (
        <CreateProblem
          token={session.accessToken}
          onClose={() => setCreatingProblem(false)}
          onCreated={(problem) => {
            setProblems((x) => [problem, ...x]);
            setCreatingProblem(false);
            setActiveModule("PROBLEMS");
          }}
        />
      )}

      {creatingChange && (
        <CreateChange
          token={session.accessToken}
          onClose={() => setCreatingChange(false)}
          onCreated={(change) => {
            setChanges((x) => [change, ...x]);
            setCreatingChange(false);
            setActiveModule("CHANGES");
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
      {selectedRequest && (
        <ServiceRequestDetail
          request={selectedRequest}
          token={session.accessToken}
          canEdit={canOperate}
          canReopen={isAdmin}
          groups={groups}
          currentUserId={session.user.id}
          onClose={() => setSelectedRequest(null)}
          onUpdated={(updated) => {
            setSelectedRequest(updated);
            setServiceRequests((items) =>
              items.map((item) => (item.id === updated.id ? updated : item)),
            );
          }}
        />
      )}
      {selectedProblem && (
        <ProblemDetail
          problem={selectedProblem}
          token={session.accessToken}
          canEdit={canOperate}
          canReopen={isAdmin}
          groups={groups}
          onClose={() => setSelectedProblem(null)}
          onUpdated={(updated) => {
            setSelectedProblem(updated);
            setProblems((items) =>
              items.map((item) => (item.id === updated.id ? updated : item)),
            );
          }}
        />
      )}

      {selectedChange && (
        <ChangeDetail
          change={selectedChange}
          token={session.accessToken}
          canEdit={canOperate}
          canReopen={isAdmin}
          groups={groups}
          onClose={() => setSelectedChange(null)}
          onUpdated={(updated) => {
            setSelectedChange(updated);
            setChanges((items) =>
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
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem(themePreferenceKey) as ThemePreference | null;
    return saved && ["DARK", "LIGHT", "SYSTEM"].includes(saved) ? saved : "DARK";
  });
  useEffect(() => { api.branding().then(value => { const next = { ...defaultBranding, ...value }; setBranding(next); document.title = next.portalTitle || next.organizationName || "Nextris Sevā"; document.documentElement.style.setProperty("--brand-primary", next.primaryColor!); document.documentElement.style.setProperty("--brand-accent", next.accentColor!); applyThemePreference(themePreference); if (next.faviconUrl) { let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]'); if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); } icon.href = next.faviconUrl; } }).catch(() => {applyThemePreference(themePreference)}); }, [themePreference]);
  useEffect(() => {
    applyThemePreference(themePreference);
    localStorage.setItem(themePreferenceKey, themePreference);
    if (themePreference !== "SYSTEM") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyThemePreference("SYSTEM");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [themePreference]);
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
  return session ? <Dashboard session={session} onLogout={logout} branding={branding} themePreference={themePreference} onThemePreferenceChange={setThemePreference} /> : <Login onLogin={login} branding={branding} />;
}
