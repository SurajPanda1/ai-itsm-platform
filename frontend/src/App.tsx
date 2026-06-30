import { Fragment, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import AdminConsoleV2 from "./AdminConsole";
import AnalyticsConsole from "./AnalyticsConsole";
import type {
  AdminGroup,
  AdminUser,
  AssignmentGroup,
  Attachment,
  Branding,
  CmdbImportPreview,
  CmdbLookupData,
  CmdbRelationship,
  ConfigurationItem,
  Incident,
  KnowledgeArticle,
  ProblemTask,
  ReferenceData,
  RelatedItem,
  RequestTask,
  ServiceCatalogCategory,
  ServicePortalBanner,
  ServicePortalProfile,
  ServicePortalSettings,
  Session,
  SlaDefinition,
  TicketKnowledgeLink,
  User,
} from "./types";

const sessionKey = "ai-itsm-session";
const activityKey = "ai-itsm-last-activity";
const themePreferenceKey = "ai-itsm-theme-preference";
const modulePreferenceKey = "ai-itsm-active-module";
const defaultBranding: Branding = { organizationName: "Nextris", portalTitle: "Nextris Sevā", welcomeMessage: "How can we help?", primaryColor: "#16a394", accentColor: "#6ee7b7", showPoweredBy: true, themeMode: "DARK" };
const relationshipLabel = (value: string) => ({
  CHILD_INCIDENT: "Child incident",
  PARENT_INCIDENT: "Parent incident",
  RELATED_CHANGE: "Related change",
  RELATED_PROBLEM: "Related problem",
  RELATED_INCIDENT: "Related incident",
  CAUSED_BY_CHANGE: "Caused by change",
  CAUSED_INCIDENT: "Caused incident",
  IMPLEMENTED_BY_CHANGE: "Implemented by change",
  IMPLEMENTS: "Implements",
}[value] || value.replaceAll("_", " ").toLowerCase());
type ThemePreference = "DARK" | "LIGHT" | "SYSTEM";
type RequestQueueItem = { kind: "request"; ticket: Incident } | { kind: "request-task"; ticket: Incident; task: RequestTask };
type ProblemQueueItem = { kind: "problem"; ticket: Incident } | { kind: "problem-task"; ticket: Incident; task: ProblemTask };
const problemStatusOptions = ["OPEN", "ASSESS", "ROOT_CAUSE_ANALYSIS", "FIX", "RESOLVED", "CLOSED"];
const changeStatusOptions = ["NEW", "PLAN", "APPROVAL", "CAB", "SCHEDULED", "IMPLEMENT", "VALIDATE", "CLOSED"];
const isOngoingTicket = (ticket: Incident) => !["RESOLVED", "CLOSED"].includes(ticket.status?.name || "");
const isOngoingChange = (ticket: Incident) => ticket.status?.name !== "CLOSED";
const formatShortDate = (value?: string) => value ? new Date(value).toLocaleDateString() : "-";

function UserSearchPicker({
  token,
  label,
  selected,
  onSelect,
}: {
  token: string;
  label: string;
  selected: Pick<User, "id" | "name" | "email"> | null;
  onSelect: (user: Pick<User, "id" | "name" | "email"> | null) => void;
}) {
  const [query, setQuery] = useState(selected?.name || "");
  const [results, setResults] = useState<Pick<User, "id" | "name" | "email">[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);

  useEffect(() => {
    if (!hasTyped || selected || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      api.userSearch(token, query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [token, query, selected, hasTyped]);
  useEffect(() => {
    setQuery(selected?.name || "");
    setResults([]);
    setLoading(false);
    setHasTyped(false);
  }, [selected]);

  return (
    <label className="user-search-picker">
      {label}
      <input
        value={query}
        required
        onChange={(event) => {
          setQuery(event.target.value);
          setHasTyped(true);
          onSelect(null);
        }}
        placeholder="Search by name or email"
      />
      {!selected && hasTyped && <small className="muted">{loading ? "Searching..." : "Type at least 2 characters to search."}</small>}
      {!selected && hasTyped && results.length > 0 && (
        <div className="user-search-results">
          {results.map((user) => (
            <button
              type="button"
              key={user.id}
              onClick={() => {
                onSelect(user);
                setQuery(user.name);
                setResults([]);
                setHasTyped(false);
              }}
            >
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

function ConfigurationItemPicker({
  token,
  selected,
  onSelect,
}: {
  token: string;
  selected: ConfigurationItem | null;
  onSelect: (item: ConfigurationItem | null) => void;
}) {
  const [query, setQuery] = useState(selected?.name || "");
  const [results, setResults] = useState<ConfigurationItem[]>([]);
  const [hasTyped, setHasTyped] = useState(false);
  useEffect(() => {
    if (!hasTyped || selected || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      api.configurationItemSearch(token, query)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [token, query, selected, hasTyped]);
  useEffect(() => {
    setQuery(selected?.name || "");
    setResults([]);
    setHasTyped(false);
  }, [selected]);

  return (
    <label className="user-search-picker">
      Configuration Item
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setHasTyped(true);
          onSelect(null);
        }}
        placeholder="Search CI by name or type"
      />
      {!selected && hasTyped && <small className="muted">Optional. Type at least 2 characters to search.</small>}
      {!selected && hasTyped && results.length > 0 && (
        <div className="user-search-results">
          {results.map((item) => (
            <button type="button" key={item.id} onClick={() => { onSelect(item); setQuery(item.name); setResults([]); setHasTyped(false); }}>
              <strong>{item.name}</strong>
              <span>{item.ciType || "Configuration item"}</span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

function CompactCiSearchPicker({
  token,
  label,
  selected,
  onSelect,
}: {
  token: string;
  label: string;
  selected: Pick<ConfigurationItem, "id" | "name" | "ciNumber" | "ciType"> | null;
  onSelect: (item: Pick<ConfigurationItem, "id" | "name" | "ciNumber" | "ciType"> | null) => void;
}) {
  const [query, setQuery] = useState(selected?.ciNumber ? `${selected.ciNumber} - ${selected.name}` : selected?.name || "");
  const [results, setResults] = useState<ConfigurationItem[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const text = query.trim();
    if (selected || text.length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      api.configurationItemSearch(token, text)
        .then((items) => {
          setResults(items);
          setOpen(items.length > 0);
        })
        .catch(() => {
          setResults([]);
          setOpen(false);
        });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [token, query, selected]);
  useEffect(() => {
    setQuery(selected?.ciNumber ? `${selected.ciNumber} - ${selected.name}` : selected?.name || "");
  }, [selected]);
  return (
    <label className="compact-ci-picker">
      {label}
      <input
        value={query}
        onFocus={() => setOpen(results.length > 0)}
        onChange={(event) => {
          setQuery(event.target.value);
          onSelect(null);
          setOpen(true);
        }}
        placeholder="Search CI number or name"
      />
      {open && !selected && results.length > 0 && (
        <div className="compact-ci-menu">
          {results.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                onSelect(item);
                setQuery(item.ciNumber ? `${item.ciNumber} - ${item.name}` : item.name);
                setOpen(false);
                setResults([]);
              }}
            >
              <strong>{item.ciNumber || item.name}</strong>
              <span>{item.ciNumber ? item.name : item.ciType || "Configuration item"}</span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

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

function AttachmentPanel({ attachments, enabled, maxFileSizeMb, busy, onUpload, onDownload, onDelete }: { attachments: Attachment[]; enabled?: boolean; maxFileSizeMb?: number; busy: boolean; onUpload: (file?: File) => void; onDownload: (item: Attachment) => void; onDelete: (id: string) => void }) {
  if (!enabled) return <p className="muted">Attachments are configured but not active for this tenant yet.</p>;
  return <div className="attachment-panel"><label className="attachment-upload">Add attachment <small>Maximum {maxFileSizeMb || 10} MB</small><input type="file" disabled={busy} onChange={(e)=>{onUpload(e.target.files?.[0]);e.target.value='';}}/></label>{attachments.length===0?<p className="muted">No attachments yet.</p>:<div className="attachment-list">{attachments.map(item=><article key={item.id}><div><b>{item.fileName}</b><small>{(item.sizeBytes/1024).toFixed(1)} KB · {item.uploadedBy.name} · {new Date(item.createdAt).toLocaleString()}</small></div><button className="secondary small" onClick={()=>onDownload(item)}>Download</button><button className="icon-button danger" title="Delete attachment" onClick={()=>onDelete(item.id)}>×</button></article>)}</div>}</div>;
}

function KnowledgeSearchModal({ token, ticketId, defaultQuery, onClose, onUsed }: { token: string; ticketId: string; defaultQuery: string; onClose: () => void; onUsed: () => Promise<void> | void }) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<KnowledgeArticle[]>([]);
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      api.knowledgeSearch(token, query)
        .then(setResults)
        .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not search knowledge"))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [token, query]);
  async function useArticle() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api.linkTicketKnowledge(token, ticketId, selected.id);
      await onUsed();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not use knowledge article");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section className="modal knowledge-modal">
        <div className="modal-head">
          <div><p className="eyebrow">Knowledge Base</p><h2>Search Knowledge Base</h2></div>
          <button className="icon-button" onClick={onClose}>×</button>
        </div>
        {error && <div className="banner error">{error}</div>}
        {!selected ? (
          <>
            <input className="search full" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, content, category, or keywords" />
            <div className="knowledge-results">
              {loading ? <p className="muted">Searching…</p> : results.length === 0 ? <p className="muted">No published articles found.</p> : results.map((article) => (
                <button key={article.id} type="button" onClick={() => setSelected(article)}>
                  <strong>{article.title}</strong>
                  <small>{article.articleNumber} · {article.category} · {article.status}</small>
                </button>
              ))}
            </div>
          </>
        ) : (
          <article className="knowledge-article-view">
            <button className="secondary small" onClick={() => setSelected(null)}>Back to results</button>
            <p className="eyebrow">{selected.articleNumber} · {selected.category}</p>
            <h2>{selected.title}</h2>
            {selected.summary && <p className="knowledge-summary">{selected.summary}</p>}
            <div className="knowledge-content">{selected.content || "No article content added yet."}</div>
            {selected.keywords && <small className="muted">Keywords: {selected.keywords}</small>}
            <div className="modal-actions">
              <button className="secondary" onClick={onClose}>Cancel</button>
              <button className="primary" disabled={busy} onClick={useArticle}>{busy ? "Linking…" : "Use this KB"}</button>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}

function KnowledgeUsedPanel({ token, ticket, canUse, onTicketRefresh }: { token: string; ticket: Incident; canUse: boolean; onTicketRefresh: () => Promise<void> }) {
  const [links, setLinks] = useState<TicketKnowledgeLink[]>([]);
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [error, setError] = useState("");
  async function loadLinks() {
    try { setLinks(await api.ticketKnowledge(token, ticket.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load knowledge links"); }
  }
  useEffect(() => { void loadLinks(); }, [token, ticket.id]);
  async function openArticle(id: string) {
    setError("");
    try { setArticle(await api.knowledgeArticle(token, id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open knowledge article"); }
  }
  async function onUsed() {
    await loadLinks();
    await onTicketRefresh();
  }
  return (
    <div className="knowledge-reference-line">
      <span>Knowledge article</span>
      {error && <div className="banner error">{error}</div>}
      {links.length === 0 ? <small className="muted">None linked</small> : (
        <div className="knowledge-link-list compact">{links.map((link) => (
          <button key={link.id} type="button" onClick={() => openArticle(link.article.id)}>
            <strong>{link.article.articleNumber} - {link.article.title}</strong>
          </button>
        ))}</div>
      )}
      {canUse && <button className="secondary small" onClick={() => setSearchOpen(true)}>Search KB</button>}
      {searchOpen && <KnowledgeSearchModal token={token} ticketId={ticket.id} defaultQuery={ticket.title} onClose={() => setSearchOpen(false)} onUsed={onUsed} />}
      {article && <div className="modal-backdrop"><section className="modal knowledge-modal"><div className="modal-head"><div><p className="eyebrow">{article.articleNumber} · {article.category}</p><h2>{article.title}</h2></div><button className="icon-button" onClick={() => setArticle(null)}>×</button></div>{article.summary && <p className="knowledge-summary">{article.summary}</p>}<div className="knowledge-content">{article.content || "No article content added yet."}</div></section></div>}
    </div>
  );
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
  currentUser,
  onCreated,
  onClose,
}: {
  token: string;
  currentUser: Pick<User, "id" | "name" | "email">;
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
  const [createdFor, setCreatedFor] = useState<Pick<User, "id" | "name" | "email"> | null>(currentUser);
  const [configurationItem, setConfigurationItem] = useState<ConfigurationItem | null>(null);
  const [attachmentConfig, setAttachmentConfig] = useState<{enabled:boolean;maxFileSizeMb:number}|null>(null);
  useEffect(() => { api.attachmentConfiguration(token).then(setAttachmentConfig).catch(() => setAttachmentConfig(null)); }, [token]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    if (!createdFor) {
      setError("Created for is required.");
      setBusy(false);
      return;
    }
    try {
      const incident = await api.createIncident(token, { ...form, createdForId: createdFor.id, configurationItemId: configurationItem?.id });
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
        <div className="readonly-field-grid">
          <div>
            <span>Opened by</span>
            <strong>{currentUser.name}</strong>
          </div>
        </div>
        <UserSearchPicker token={token} label="Created for" selected={createdFor} onSelect={setCreatedFor} />
        <ConfigurationItemPicker token={token} selected={configurationItem} onSelect={setConfigurationItem} />
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
  currentUser,
  catalog,
  onCreated,
  onClose,
}: {
  token: string;
  currentUser: Pick<User, "id" | "name" | "email">;
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
  const [createdFor, setCreatedFor] = useState<Pick<User, "id" | "name" | "email"> | null>(currentUser);
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
    if (!createdFor) {
      setError("Created for is required.");
      setBusy(false);
      return;
    }
    try {
      onCreated(await api.createServiceRequest(token, {
        catalogItemId,
        requestedForId: createdFor.id,
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
        <div className="readonly-field-grid">
          <div>
            <span>Opened by</span>
            <strong>{currentUser.name}</strong>
          </div>
        </div>
        <UserSearchPicker token={token} label="Created for" selected={createdFor} onSelect={setCreatedFor} />
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

function PortalCreateIncident({ token, currentUser, onCreated, onClose }: { token: string; currentUser: Pick<User, "id" | "name" | "email">; onCreated: (i: Incident) => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", affectedService: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onCreated(await api.createIncident(token, {
        title: form.title,
        description: form.description,
        affectedService: form.affectedService,
        priority: "MEDIUM",
        impact: "LOW",
        urgency: "LOW",
        createdForId: currentUser.id,
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create incident");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal portal-modal" onSubmit={submit}>
        <div className="modal-head"><div><p className="eyebrow">SELF-SERVICE</p><h2>Raise incident</h2></div><button type="button" className="icon-button" onClick={onClose}>×</button></div>
        <label>What is not working?<input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></label>
        <label>Description<textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell us what happened, error messages, affected users, and when it started." /></label>
        <label>Affected service<input value={form.affectedService} onChange={(e) => setForm({ ...form, affectedService: e.target.value })} placeholder="e.g. VPN, Email, Laptop" /></label>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Submitting…" : "Submit incident"}</button></div>
      </form>
    </div>
  );
}

function PortalCreateRequest({ token, currentUser, catalog, onCreated, onClose }: { token: string; currentUser: Pick<User, "id" | "name" | "email">; catalog: ServiceCatalogCategory[]; onCreated: (i: Incident) => void; onClose: () => void }) {
  const items = catalog.flatMap((category) => category.items.map((item) => ({ ...item, categoryName: category.name })));
  const [catalogItemId, setCatalogItemId] = useState(items[0]?.id || "");
  const selectedItem = items.find((item) => item.id === catalogItemId);
  const [form, setForm] = useState({ title: "", description: "", details: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!catalogItemId) return setError("Select a catalogue item first.");
    setBusy(true);
    setError("");
    try {
      onCreated(await api.createServiceRequest(token, {
        catalogItemId,
        requestedForId: currentUser.id,
        title: form.title,
        description: form.description,
        requestDetails: { details: form.details },
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit request");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal portal-modal" onSubmit={submit}>
        <div className="modal-head"><div><p className="eyebrow">SERVICE CATALOGUE</p><h2>Request service</h2></div><button type="button" className="icon-button" onClick={onClose}>×</button></div>
        <label>Service item<select required value={catalogItemId} onChange={(e) => setCatalogItemId(e.target.value)}>{items.length === 0 ? <option value="">No service items available</option> : items.map((item) => <option key={item.id} value={item.id}>{item.categoryName} — {item.name}</option>)}</select>{selectedItem?.description && <small className="muted">{selectedItem.description}</small>}</label>
        <label>Title<input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></label>
        <label>Description<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>Request details<textarea rows={4} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Add access name, software, device details, business reason, etc." /></label>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy || items.length === 0}>{busy ? "Submitting…" : "Submit request"}</button></div>
      </form>
    </div>
  );
}

function PortalTicketDetail({ ticket, type, token, onClose, onUpdated }: { ticket: Incident; type: "incident" | "request"; token: string; onClose: () => void; onUpdated: (ticket: Incident) => void }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (type === "incident") {
        await api.addActivity(token, ticket.id, comment.trim(), "COMMENT");
        onUpdated(await api.incident(token, ticket.id));
      } else {
        await api.addServiceRequestActivity(token, ticket.id, comment.trim(), "COMMENT");
        onUpdated(await api.serviceRequest(token, ticket.id));
      }
      setComment("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add comment");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="portal-detail-card">
      <div className="portal-detail-head">
        <div><button className="ticket-link" onClick={onClose}>← Back</button><h2>{ticket.ticketNumber}</h2><p>{ticket.title}</p></div>
        <span className={`badge ${(ticket.status?.name || "open").toLowerCase()}`}>{(ticket.status?.name || "OPEN").replaceAll("_", " ")}</span>
      </div>
      <div className="portal-record-grid">
        <div><span>Created</span><b>{formatShortDate(ticket.createdAt)}</b></div>
        <div><span>Opened by</span><b>{ticket.createdBy?.name}</b></div>
        <div><span>{type === "request" ? "Requested for" : "Created for"}</span><b>{type === "request" ? ticket.serviceRequest?.requestedFor?.name || ticket.createdBy?.name : ticket.incident?.createdFor?.name || ticket.createdBy?.name}</b></div>
      </div>
      <article className="portal-description"><h3>Description</h3><p>{ticket.description || "No description added."}</p></article>
      {type === "request" && (
        <article className="portal-description">
          <h3>Approvals</h3>
          {(ticket.serviceRequest?.approvals || []).length === 0 ? <p>No approvals required.</p> : ticket.serviceRequest?.approvals?.map((approval) => (
            <div className="portal-approval-row" key={approval.id}><div><b>{approval.approvalType.replaceAll("_", " ")}</b><small>{approval.approver?.name || "Approver pending"}</small></div><span className={`badge ${approval.status.toLowerCase()}`}>{approval.status}</span></div>
          ))}
        </article>
      )}
      <form className="portal-comment-box" onSubmit={addComment}>
        <label>Add comment<textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment for the support team" /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary compact" disabled={busy || !comment.trim()}>{busy ? "Adding…" : "Add comment"}</button>
      </form>
      <article className="portal-description">
        <h3>Comments</h3>
        {ticket.activities.length === 0 ? <p>No comments yet.</p> : ticket.activities.map((activity) => (
          <div className="portal-comment" key={activity.id}><b>{activity.createdBy.name}</b><small>{new Date(activity.createdAt).toLocaleString()}</small><p>{activity.comment}</p></div>
        ))}
      </article>
    </section>
  );
}

function ServicePortal({ session, branding, onLogout }: { session: Session; branding: Branding; onLogout: () => void }) {
  const [active, setActive] = useState<"HOME" | "INCIDENTS" | "REQUESTS" | "KNOWLEDGE" | "PROFILE">("HOME");
  const [settings, setSettings] = useState<ServicePortalSettings | null>(null);
  const [banner, setBanner] = useState<ServicePortalBanner>({ enabled: false });
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [requests, setRequests] = useState<Incident[]>([]);
  const [catalog, setCatalog] = useState<ServiceCatalogCategory[]>([]);
  const [profile, setProfile] = useState<ServicePortalProfile | null>(null);
  const [kbQuery, setKbQuery] = useState("");
  const [kbResults, setKbResults] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<{ type: "incident" | "request"; ticket: Incident } | null>(null);
  const [creatingIncident, setCreatingIncident] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = session.accessToken;

  const refreshTickets = () => Promise.all([api.servicePortalMyIncidents(token), api.servicePortalMyRequests(token)]).then(([i, r]) => { setIncidents(i); setRequests(r); });
  useEffect(() => {
    setLoading(true);
    Promise.all([api.servicePortalSettings(token), api.servicePortalBanner(token), api.servicePortalMyIncidents(token), api.servicePortalMyRequests(token), api.serviceCatalog(token), api.servicePortalProfile(token).catch(() => null)])
      .then(([portalSettings, portalBanner, incidentValues, requestValues, catalogValues, profileValue]) => {
        setSettings(portalSettings);
        setBanner(portalBanner);
        setBannerDismissed(false);
        setIncidents(incidentValues);
        setRequests(requestValues);
        setCatalog(catalogValues);
        setProfile(profileValue);
        if (portalSettings.defaultLandingPage === "MY_INCIDENTS") setActive("INCIDENTS");
        if (portalSettings.defaultLandingPage === "MY_REQUESTS") setActive("REQUESTS");
        if (portalSettings.defaultLandingPage === "KNOWLEDGE") setActive("KNOWLEDGE");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load Service Portal"))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(() => {
    if (!settings?.knowledgeEnabled || !settings.allowKbSearch) return;
    const timer = window.setTimeout(() => {
      api.servicePortalKnowledge(token, kbQuery).then(setKbResults).catch(() => setKbResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [token, kbQuery, settings?.knowledgeEnabled, settings?.allowKbSearch]);

  const openTickets = [...incidents, ...requests].filter(isOngoingTicket);
  const recentTickets = [...incidents, ...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentKb = kbResults.slice(0, 3);
  const portalDisabled = settings && !settings.portalEnabled;

  return (
    <div className="portal-shell">
      <header className="portal-topbar">
        <Brand branding={{ ...branding, portalTitle: settings?.portalName || branding.portalTitle }} />
        <nav>
          <button className={active === "HOME" ? "active" : ""} onClick={() => { setSelectedTicket(null); setActive("HOME"); }}>Home</button>
          <button className={active === "INCIDENTS" ? "active" : ""} onClick={() => { setSelectedTicket(null); setActive("INCIDENTS"); }}>My Incidents</button>
          <button className={active === "REQUESTS" ? "active" : ""} onClick={() => { setSelectedTicket(null); setActive("REQUESTS"); }}>My Service Requests</button>
          <button className={active === "KNOWLEDGE" ? "active" : ""} onClick={() => { setSelectedTicket(null); setActive("KNOWLEDGE"); }}>Knowledge Base</button>
          <button className={active === "PROFILE" ? "active" : ""} onClick={() => { setSelectedTicket(null); setActive("PROFILE"); }}>Profile</button>
        </nav>
        <button className="secondary small" onClick={onLogout}>Sign out</button>
      </header>
      {banner.enabled && !bannerDismissed && <div className="portal-broadcast"><span>!</span><strong>{banner.message}</strong><button type="button" aria-label="Dismiss banner" onClick={() => setBannerDismissed(true)}>×</button></div>}
      <main className="portal-main">
        {loading ? <div className="empty">Loading Service Portal…</div> : error ? <div className="error">{error}</div> : portalDisabled ? <div className="empty"><b>Service Portal is currently disabled.</b><span>Please contact your administrator.</span></div> : selectedTicket ? (
          <PortalTicketDetail
            token={token}
            type={selectedTicket.type}
            ticket={selectedTicket.ticket}
            onClose={() => setSelectedTicket(null)}
            onUpdated={(ticket) => {
              setSelectedTicket({ ...selectedTicket, ticket });
              if (selectedTicket.type === "incident") setIncidents((items) => items.map((item) => item.id === ticket.id ? ticket : item));
              else setRequests((items) => items.map((item) => item.id === ticket.id ? ticket : item));
            }}
          />
        ) : active === "HOME" ? (
          <>
            <section className="portal-hero">
              <div>
                <p className="eyebrow">Welcome</p>
                <h1>{settings?.welcomeMessage || "How can we help today?"}</h1>
                <p>Raise an issue, request a service, search knowledge, or track your open work from one clean place.</p>
              </div>
              <div className="portal-hero-art" aria-hidden="true"><span>?</span><b>●●●</b></div>
            </section>
            <section className="portal-quick-actions">
              {settings?.allowIncidentCreation && <button onClick={() => setCreatingIncident(true)}><span className="portal-action-icon incident">◎</span><span>Raise an Incident</span><small>Report something broken or degraded</small><em>›</em></button>}
              {settings?.allowServiceRequests && <button onClick={() => setCreatingRequest(true)}><span className="portal-action-icon request">🛒</span><span>Request a Service</span><small>Request access, software, or other services</small><em>›</em></button>}
              {settings?.knowledgeEnabled && <button onClick={() => setActive("KNOWLEDGE")}><span className="portal-action-icon knowledge">⌕</span><span>Search Knowledge</span><small>Find solutions, guides, and how-to articles</small><em>›</em></button>}
            </section>
            <section className="portal-card-grid">
              {settings?.showRecentTickets && <PortalTicketList title="Recent tickets" tickets={recentTickets} onOpen={(type, ticket) => setSelectedTicket({ type, ticket })} />}
              {settings?.showMyRequests && <PortalTicketList title="My open requests" tickets={openTickets} onOpen={(type, ticket) => setSelectedTicket({ type, ticket })} />}
              <article className="portal-list-card"><h2>Recently viewed knowledge</h2>{recentKb.length === 0 ? <p className="muted">Search knowledge to build this list.</p> : recentKb.map((article) => <button key={article.id} className="portal-kb-row" onClick={() => setSelectedArticle(article)}>{article.articleNumber} — {article.title}</button>)}</article>
            </section>
          </>
        ) : active === "INCIDENTS" ? (
          <PortalTicketList title="My Incidents" tickets={incidents} empty="No incidents raised by or for you." onOpen={(type, ticket) => setSelectedTicket({ type, ticket })} action={settings?.allowIncidentCreation ? <button className="primary compact" onClick={() => setCreatingIncident(true)}>Raise incident</button> : null} />
        ) : active === "REQUESTS" ? (
          <PortalTicketList title="My Service Requests" tickets={requests} empty="No service requests submitted by or for you." onOpen={(type, ticket) => setSelectedTicket({ type, ticket })} action={settings?.allowServiceRequests ? <button className="primary compact" onClick={() => setCreatingRequest(true)}>Request service</button> : null} />
        ) : active === "KNOWLEDGE" ? (
          <section className="portal-list-card portal-kb-search">
            <h2>Knowledge Base</h2>
            {!settings?.knowledgeEnabled || !settings.allowKbSearch ? <p className="muted">Knowledge search is currently disabled.</p> : <>
              <input className="search" value={kbQuery} onChange={(e) => setKbQuery(e.target.value)} placeholder="Search title, summary, keywords, or category" autoFocus />
              <div className="portal-kb-results">
                {kbResults.length === 0 ? <p className="muted">Search for a known fix or guide.</p> : kbResults.map((article) => (
                  <button key={article.id} className="portal-kb-result" onClick={() => setSelectedArticle(article)}><b>{article.articleNumber} — {article.title}</b><small>{article.category} · Updated {formatShortDate(article.updatedAt)}</small><span>{article.summary}</span></button>
                ))}
              </div>
            </>}
          </section>
        ) : (
          <section className="portal-profile">
            <article><h2>Profile</h2><div className="portal-record-grid"><div><span>Name</span><b>{profile?.name || session.user.name}</b></div><div><span>Email</span><b>{profile?.email || session.user.email}</b></div><div><span>Department</span><b>{profile?.department?.name || "Not configured"}</b></div><div><span>Manager</span><b>{profile?.manager?.name || "Not configured"}</b></div><div><span>Phone</span><b>{profile?.phone || "Not configured"}</b></div><div><span>Language</span><b>{profile?.language || "English"}</b></div><div><span>Timezone</span><b>{Intl.DateTimeFormat().resolvedOptions().timeZone}</b></div></div></article>
            <article><h2>Password & notifications</h2><p className="muted">Password change and notification preferences are reserved here for the next account-management iteration.</p></article>
          </section>
        )}
      </main>
      {creatingIncident && <PortalCreateIncident token={token} currentUser={session.user} onClose={() => setCreatingIncident(false)} onCreated={(incident) => { setIncidents((items) => [incident, ...items]); setCreatingIncident(false); setActive("INCIDENTS"); }} />}
      {creatingRequest && <PortalCreateRequest token={token} currentUser={session.user} catalog={catalog} onClose={() => setCreatingRequest(false)} onCreated={(request) => { setRequests((items) => [request, ...items]); setCreatingRequest(false); setActive("REQUESTS"); }} />}
      {selectedArticle && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSelectedArticle(null)}><article className="modal portal-modal"><div className="modal-head"><div><p className="eyebrow">{selectedArticle.articleNumber}</p><h2>{selectedArticle.title}</h2></div><button type="button" className="icon-button" onClick={() => setSelectedArticle(null)}>×</button></div><p className="muted">{selectedArticle.category} · Updated {formatShortDate(selectedArticle.updatedAt)}</p><p>{selectedArticle.summary}</p><div className="kb-content">{selectedArticle.content || "No article content added yet."}</div></article></div>}
    </div>
  );
}

function PortalTicketList({ title, tickets, onOpen, empty = "No tickets to show.", action }: { title: string; tickets: Incident[]; onOpen: (type: "incident" | "request", ticket: Incident) => void; empty?: string; action?: ReactNode }) {
  return (
    <article className="portal-list-card">
      <div className="portal-list-head"><h2>{title}</h2>{action}</div>
      {tickets.length === 0 ? <p className="muted">{empty}</p> : tickets.map((ticket) => {
        const type = ticket.serviceRequest ? "request" : "incident";
        return (
          <button key={ticket.id} className="portal-ticket-row" onClick={() => onOpen(type, ticket)}>
            <span><b>{ticket.ticketNumber}</b><small>{ticket.title}</small></span>
            <span className={`badge ${(ticket.status?.name || "open").toLowerCase()}`}>{(ticket.status?.name || "OPEN").replaceAll("_", " ")}</span>
            <em>{formatShortDate(ticket.createdAt)}</em>
          </button>
        );
      })}
    </article>
  );
}

function CreateProblem({ token, onCreated, onClose }: { token: string; onCreated: (i: Incident) => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", impact: "MEDIUM", impactDetails: "", risk: "MEDIUM", rootCause: "", workaround: "", permanentFix: "", knownError: false });
  const [configurationItem, setConfigurationItem] = useState<ConfigurationItem | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      onCreated(await api.createProblem(token, { ...form, configurationItemId: configurationItem?.id }));
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
        <ConfigurationItemPicker token={token} selected={configurationItem} onSelect={setConfigurationItem} />
        <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label>
        <div className="form-grid"><label>Impact<select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label><label>Risk<select value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label></div>
        <label>Impact details<textarea value={form.impactDetails} onChange={(e) => setForm({ ...form, impactDetails: e.target.value })} rows={3} placeholder="Who/what is affected, scale, business impact..." /></label>
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
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", changeType: "NORMAL", risk: "MEDIUM", impact: "MEDIUM", plannedStart: "", plannedEnd: "", implementationPlan: "", rollbackPlan: "", testPlan: "" });
  const [configurationItem, setConfigurationItem] = useState<ConfigurationItem | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      onCreated(await api.createChange(token, { ...form, configurationItemId: configurationItem?.id, plannedStart: form.plannedStart || undefined, plannedEnd: form.plannedEnd || undefined }));
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
        <ConfigurationItemPicker token={token} selected={configurationItem} onSelect={setConfigurationItem} />
        <div className="form-grid">
          <label>Type<select value={form.changeType} onChange={(e) => setForm({ ...form, changeType: e.target.value })}>{["STANDARD","NORMAL","EMERGENCY"].map((x)=><option key={x}>{x}</option>)}</select></label>
          <label>Risk<select value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label>
          <label>Impact<select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label>
          <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label>
          <label>Planned start<input type="datetime-local" value={form.plannedStart} onChange={(e) => setForm({ ...form, plannedStart: e.target.value })} /></label>
          <label>Planned end<input type="datetime-local" value={form.plannedEnd} onChange={(e) => setForm({ ...form, plannedEnd: e.target.value })} /></label>
        </div>
        <label>Implementation plan<textarea value={form.implementationPlan} onChange={(e) => setForm({ ...form, implementationPlan: e.target.value })} rows={3} /></label>
        <label>Rollback plan<textarea value={form.rollbackPlan} onChange={(e) => setForm({ ...form, rollbackPlan: e.target.value })} rows={3} /></label>
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
  const [form, setForm] = useState({
    title: incident.title,
    description: incident.description || "",
    priority: incident.priority?.name || "MEDIUM",
    impact: incident.incident?.impact || "LOW",
    urgency: incident.incident?.urgency || "LOW",
    affectedService: incident.incident?.affectedService || "",
  });
  const [configurationItem, setConfigurationItem] = useState<ConfigurationItem | null>(incident.configurationItem || null);
  const [groupId, setGroupId] = useState(
    incident.assignmentGroup?.id || groups[0]?.id || "",
  );
  const [assigneeId, setAssigneeId] = useState(incident.assignedTo?.id || "");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(incident.status?.name || "OPEN");
  const [resolution, setResolution] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"work-notes" | "related">(
    "work-notes",
  );
  const [showAttachments, setShowAttachments] = useState(false);
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
      onUpdated(await api.updateIncident(token, incident.id, { ...form, configurationItemId: configurationItem?.id ?? null }));
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
  async function refreshIncident() { onUpdated(await api.incident(token, incident.id)); }
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
      <section className="record-page record-form-modal incident-detail-page">
        <div className="modal-head record-head">
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
            {attachmentConfig?.enabled && <button type="button" className="icon-button attachment-icon" title={`Attachments (${attachments.length})`} onClick={() => setShowAttachments((value) => !value)}>📎</button>}
            <button type="button" className="secondary" onClick={onClose}>
              Back to queue
            </button>
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
            <ConfigurationItemPicker token={token} selected={configurationItem} onSelect={setConfigurationItem} />
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
            {showAttachments && <div className="detail-section attachment-popover-panel"><AttachmentPanel attachments={attachments} enabled={attachmentConfig?.enabled} maxFileSizeMb={attachmentConfig?.maxFileSizeMb} busy={busy} onUpload={uploadAttachment} onDownload={(item)=>api.downloadAttachment(token,incident.id,item.id,item.fileName)} onDelete={deleteAttachment} /></div>}
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
                    <dt>Opened by</dt>
                    <dd>{incident.createdBy.name}</dd>
                    <dt>Created for</dt>
                    <dd>{incident.incident?.createdFor?.name || incident.createdBy.name}</dd>
                    <dt>Configuration Item</dt>
                    <dd>{incident.configurationItem?.name || "Not linked"}</dd>
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
            <KnowledgeUsedPanel token={token} ticket={incident} canUse={canEdit} onTicketRefresh={refreshIncident} />
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
                      <option value="CAUSED_BY_CHANGE">Caused by change</option>
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
                            {relationshipLabel(item.relationshipType)}
                          </small>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              {error && <div className="error">{error}</div>}
            </div>
          </>
        )}
      </section>
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
  onOpenTask,
  onClose,
}: {
  request: Incident;
  token: string;
  canEdit: boolean;
  canReopen: boolean;
  groups: AssignmentGroup[];
  currentUserId: string;
  onUpdated: (value: Incident) => void;
  onOpenTask: (task: RequestTask) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(request.status?.name || "OPEN");
  const [detailsForm, setDetailsForm] = useState({ title: request.title, description: request.description || "" });
  const [groupId, setGroupId] = useState(request.assignmentGroup?.id || groups[0]?.id || "");
  const [assigneeId, setAssigneeId] = useState(request.assignedTo?.id || "");
  const [note, setNote] = useState("");
  const [activeTab, setActiveTab] = useState<"work-notes" | "approvals" | "tasks">("work-notes");
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentConfig, setAttachmentConfig] = useState<{enabled:boolean;maxFileSizeMb:number}|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedGroup = groups.find((group) => group.id === groupId);
  const approvals = request.serviceRequest?.approvals || [];
  const tasks = request.serviceRequest?.tasks || [];

  async function updateStatus() { setBusy(true); setError(""); try { onUpdated(await api.changeServiceRequestStatus(token, request.id, status)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Status update failed"); } finally { setBusy(false); } }
  async function decideApproval(approvalId: string, decision: "APPROVED" | "REJECTED") { setBusy(true); setError(""); try { onUpdated(await api.decideServiceApproval(token, request.id, approvalId, { decision })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update approval"); } finally { setBusy(false); } }
  async function assign() { if (!groupId || !assigneeId) return; setBusy(true); setError(""); try { onUpdated(await api.assignServiceRequest(token, request.id, { assignmentGroupId: groupId, assignedToId: assigneeId })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Assignment failed"); } finally { setBusy(false); } }
  async function saveDetails() { setBusy(true); setError(""); try { onUpdated(await api.updateServiceRequest(token, request.id, detailsForm)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update request details"); } finally { setBusy(false); } }
  async function addNote() { if (!note.trim()) return; setBusy(true); setError(""); try { await api.addServiceRequestActivity(token, request.id, note, canEdit ? "WORK_NOTE" : "COMMENT"); const refreshed = await api.serviceRequests(token); const value = refreshed.find((item) => item.id === request.id); if (value) onUpdated(value); setNote(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add activity"); } finally { setBusy(false); } }
  async function loadAttachments() { try { setAttachments(await api.attachments(token, request.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load attachments"); } }
  async function refreshRequest() { onUpdated(await api.serviceRequest(token, request.id)); }
  async function uploadAttachment(file?: File) { if(!file)return;setBusy(true);setError("");try{await api.uploadAttachment(token,request.id,file);await loadAttachments();}catch(reason){setError(reason instanceof Error?reason.message:"Could not upload attachment")}finally{setBusy(false)} }
  async function deleteAttachment(id:string) { setBusy(true);try{await api.deleteAttachment(token,request.id,id);await loadAttachments();}catch(reason){setError(reason instanceof Error?reason.message:"Could not delete attachment")}finally{setBusy(false)} }
  useEffect(() => { api.attachmentConfiguration(token).then(value=>{setAttachmentConfig(value);if(value.enabled)void loadAttachments()}).catch(()=>setAttachmentConfig(null)); }, [token,request.id]);

  return (
      <section className="record-page record-form-modal sr-detail-page">
        <div className="modal-head record-head">
          <div><p className="eyebrow">{request.ticketNumber}</p><h2>{request.title}</h2></div>
          <div className="modal-head-actions">{attachmentConfig?.enabled && <button type="button" className="icon-button attachment-icon" title={`Attachments (${attachments.length})`} onClick={() => setShowAttachments((value) => !value)}>📎</button>}<button type="button" className="secondary" onClick={onClose}>Back to queue</button></div>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="detail-section request-description">
          <h3>Description</h3>
          {canEdit ? (
            <div className="editable-description request-description-editor">
              <label>
                Short description
                <input
                  value={detailsForm.title}
                  onChange={(e) =>
                    setDetailsForm({ ...detailsForm, title: e.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  rows={4}
                  value={detailsForm.description}
                  onChange={(e) =>
                    setDetailsForm({
                      ...detailsForm,
                      description: e.target.value,
                    })
                  }
                />
              </label>
              <button className="secondary" disabled={busy} onClick={saveDetails}>
                Save description
              </button>
            </div>
          ) : (
            <p>{request.description || "No description provided."}</p>
          )}
        </div>
        <div className="service-request-full-view">
          <div className="detail-section compact-fields"><h3>Request information</h3><dl><dt>Created</dt><dd>{new Date(request.createdAt).toLocaleString()}</dd><dt>Status</dt><dd><span className={`badge ${(request.status?.name || "OPEN").toLowerCase()}`}>{(request.status?.name || "OPEN").replaceAll("_", " ")}</span></dd><dt>Catalogue Item</dt><dd>{request.serviceRequest?.catalogItem?.name || "Service request"}</dd><dt>Opened by</dt><dd>{request.createdBy.name}</dd><dt>Created for</dt><dd>{request.serviceRequest?.requestedFor?.name || request.createdBy.name}</dd></dl></div>
          <div className="detail-section service-request-controls"><h3>Fulfilment</h3><div className="service-request-control-grid"><div><h4>Assignment</h4>{canEdit ? <div className="assignment-row stacked"><select value={groupId} onChange={(e) => { setGroupId(e.target.value); setAssigneeId(""); }}><option value="">Select group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">Select assignee</option>{selectedGroup?.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select><button className="secondary" onClick={assign} disabled={!groupId || !assigneeId || busy}>Assign</button></div> : <dl className="compact-fields"><dt>Group</dt><dd>{request.assignmentGroup?.name || "Unassigned"}</dd><dt>Assignee</dt><dd>{request.assignedTo?.name || "Unassigned"}</dd></dl>}</div>{canEdit && <div><h4>Status</h4><div className="status-row"><select value={status} onChange={(e) => setStatus(e.target.value)} disabled={request.status?.name === "CLOSED" && !canReopen}>{["OPEN", "IN_PROGRESS", "AWAITING_CUSTOMER", "RESOLVED", "CLOSED"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><button className="secondary" onClick={updateStatus} disabled={busy || (request.status?.name === "CLOSED" && !canReopen)}>Update</button></div>{request.status?.name === "CLOSED" && !canReopen && <p className="muted">Only an administrator can reopen a closed ticket.</p>}</div>}</div></div>
        </div>
        {request.slas?.length > 0 && <div className="detail-section"><h3>SLA</h3>{request.slas.map((sla) => <div className="ticket-sla" key={sla.id}><div><b>{sla.definitionName}</b><span className={`badge ${sla.status.toLowerCase()}`}>{sla.status.replace("_", " ")}</span></div><small>Response due {new Date(sla.responseDueAt).toLocaleString()}</small><small>Resolution due {new Date(sla.resolutionDueAt).toLocaleString()}</small></div>)}</div>}
        {showAttachments && <div className="detail-section attachment-popover-panel"><AttachmentPanel attachments={attachments} enabled={attachmentConfig?.enabled} maxFileSizeMb={attachmentConfig?.maxFileSizeMb} busy={busy} onUpload={uploadAttachment} onDownload={(item)=>api.downloadAttachment(token,request.id,item.id,item.fileName)} onDelete={deleteAttachment} /></div>}
        <KnowledgeUsedPanel token={token} ticket={request} canUse={canEdit} onTicketRefresh={refreshRequest} />
        <div className="detail-section record-tab-shell">
          <div className="record-tabs"><button className={activeTab === "work-notes" ? "active" : ""} onClick={() => setActiveTab("work-notes")}>{canEdit ? "Work Notes" : "Comments"}</button><button className={activeTab === "approvals" ? "active" : ""} onClick={() => setActiveTab("approvals")}>Approvals <span>{approvals.length}</span></button><button className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")}>Tasks <span>{tasks.length}</span></button></div>
          {activeTab === "work-notes" && <><div className="note-entry"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={canEdit ? "Add an internal work note..." : "Add a comment..."} /><button className="primary" onClick={addNote} disabled={!note.trim() || busy}>Add {canEdit ? "work note" : "comment"}</button></div><div className="activity-list">{request.activities.length === 0 ? <p className="muted">No activity yet.</p> : request.activities.map((activity) => <article key={activity.id}><div><b>{activity.createdBy.name}</b><span className="activity-type">{activity.activityType?.name.replace("_", " ") || "ACTIVITY"}</span><time>{new Date(activity.createdAt).toLocaleString()}</time></div><p>{activity.comment}</p></article>)}</div></>}
          {activeTab === "approvals" && <div className="approval-step-list">{approvals.length === 0 ? <p className="muted">No approvals required for this request.</p> : approvals.map((approval) => <article key={approval.id}><b>Step {approval.sequence}</b><div><strong>{approval.approvalType.replace("_", " ")}</strong><small>{approval.approver?.name || "Approver pending"}</small></div>{approval.status === "PENDING" && (canEdit || approval.approver?.id === currentUserId) ? <span className="approval-actions"><button className="secondary small" disabled={busy} onClick={() => decideApproval(approval.id, "APPROVED")}>Approve</button><button className="secondary small" disabled={busy} onClick={() => decideApproval(approval.id, "REJECTED")}>Reject</button></span> : <span className={`badge ${approval.status.toLowerCase()}`}>{approval.status}</span>}</article>)}</div>}
          {activeTab === "tasks" && <div className="request-task-list">{tasks.length === 0 ? <p className="muted">No tasks created for this request.</p> : tasks.map((task) => <article key={task.id}><div className="request-task-summary"><div><button className="link-button task-number-link" type="button" onClick={() => onOpenTask(task)}>{task.taskNumber}</button><small>{task.description || task.title}</small></div><div className="request-task-meta"><span className={`badge ${task.status.toLowerCase()}`}>{task.status.replaceAll("_", " ")}</span><small>{task.assignmentGroup?.name || "No group"}</small><small>{task.assignedTo?.name || "Unassigned"}</small></div></div></article>)}</div>}
        </div>
      </section>
  );
}

function RequestTaskDetail({ task, request, token, canEdit, groups, onUpdated, onOpenRequest, onClose }: { task: RequestTask; request: Incident; token: string; canEdit: boolean; groups: AssignmentGroup[]; onUpdated: (value: Incident) => void; onOpenRequest: () => void; onClose: () => void }) {
  const [edit, setEdit] = useState({ title: task.title, description: task.description || "", status: task.status, assignmentGroupId: task.assignmentGroup?.id || "", assignedToId: task.assignedTo?.id || "" });
  const [workNote, setWorkNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedGroup = groups.find((group) => group.id === edit.assignmentGroupId);
  async function save() {
    setBusy(true);
    setError("");
    try {
      onUpdated(await api.updateServiceRequestTask(token, request.id, task.id, {
        title: edit.title,
        description: edit.description,
        status: edit.status,
        assignmentGroupId: edit.assignmentGroupId || undefined,
        assignedToId: edit.assignedToId || undefined,
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update task");
    } finally {
      setBusy(false);
    }
  }
  async function addTaskNote() {
    if (!workNote.trim()) return;
    setBusy(true);
    setError("");
    try {
      onUpdated(await api.updateServiceRequestTask(token, request.id, task.id, { workNote }));
      setWorkNote("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add task work note");
    } finally {
      setBusy(false);
    }
  }
  return (
      <section className="record-page record-form-modal sr-task-page">
        <div className="modal-head record-head">
          <div>
            <p className="eyebrow">{task.taskNumber}</p>
            <h2>{task.title}</h2>
          </div>
          <button type="button" className="secondary" onClick={onClose}>Back to queue</button>
        </div>
        <div className="parent-record-link">
          <span>Parent request</span>
          <button type="button" className="link-button" onClick={onOpenRequest}>{request.ticketNumber} - {request.title}</button>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="detail-section">
          <h3>Task details</h3>
          {canEdit ? (
            <div className="task-form-grid">
              <label>Short description<input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
              <label>Description<textarea rows={4} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></label>
            </div>
          ) : <p>{task.description || "No description provided."}</p>}
        </div>
        <div className="detail-section">
          <h3>Current state</h3>
          {canEdit ? (
            <div className="task-state-grid">
              <div className="task-state-column">
                <label>Status<select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></label>
                <div><span>Created</span><strong>{new Date(task.createdAt).toLocaleString()}</strong></div>
              </div>
              <div className="task-state-column">
                <label>Assignment group<select value={edit.assignmentGroupId} onChange={(e) => setEdit({ ...edit, assignmentGroupId: e.target.value, assignedToId: "" })}><option value="">No group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
                <label>Assigned to<select value={edit.assignedToId} onChange={(e) => setEdit({ ...edit, assignedToId: e.target.value })}><option value="">Unassigned</option>{selectedGroup?.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select></label>
              </div>
              <button className="primary" disabled={busy} onClick={save}>Save task</button>
            </div>
          ) : (
            <dl className="compact-fields">
              <dt>Status</dt><dd><span className={`badge ${task.status.toLowerCase()}`}>{task.status.replaceAll("_", " ")}</span></dd>
              <dt>Assignment Group</dt><dd>{task.assignmentGroup?.name || "No group"}</dd>
              <dt>Assigned To</dt><dd>{task.assignedTo?.name || "Unassigned"}</dd>
              <dt>Created</dt><dd>{new Date(task.createdAt).toLocaleString()}</dd>
            </dl>
          )}
        </div>
        <div className="detail-section">
          <h3>Work notes</h3>
          <div className="note-entry">
            <textarea rows={3} value={workNote} onChange={(e) => setWorkNote(e.target.value)} placeholder="Add a task work note. It will also appear on the parent request." />
            <button className="primary" disabled={!workNote.trim() || busy} onClick={addTaskNote}>Add work note</button>
          </div>
          <p className="muted">Task notes are stored on the parent service request with the task number.</p>
          <div className="activity-list task-note-list">
            {request.activities.filter((activity) => activity.comment.startsWith(`${task.taskNumber}:`)).length === 0 ? (
              <p className="muted">No task work notes yet.</p>
            ) : (
              request.activities
                .filter((activity) => activity.comment.startsWith(`${task.taskNumber}:`))
                .map((activity) => (
                  <article key={activity.id}>
                    <div>
                      <b>{activity.createdBy.name}</b>
                      <span className="activity-type">TASK WORK NOTE</span>
                      <time>{new Date(activity.createdAt).toLocaleString()}</time>
                    </div>
                    <p>{activity.comment.replace(`${task.taskNumber}:`, "").trim()}</p>
                  </article>
                ))
            )}
          </div>
        </div>
      </section>
  );
}

function ProblemDetail({ problem, token, canEdit, canReopen, groups, onUpdated, onClose, onOpenTask, onOpenIncident }: { problem: Incident; token: string; canEdit: boolean; canReopen: boolean; groups: AssignmentGroup[]; onUpdated: (value: Incident) => void; onClose: () => void; onOpenTask: (task: ProblemTask) => void; onOpenIncident: (ticketId: string) => void }) {
  const [form, setForm] = useState({ title: problem.title, description: problem.description || "", priority: problem.priority?.name || "MEDIUM", impact: problem.problem?.impact || "MEDIUM", impactDetails: problem.problem?.impactDetails || "", risk: problem.problem?.risk || "MEDIUM", rootCause: problem.problem?.rootCause || "", workaround: problem.problem?.workaround || "", permanentFix: problem.problem?.permanentFix || "", knownError: problem.problem?.knownError || false, riskAccepted: problem.problem?.riskAccepted || false, riskAcceptedUntil: problem.problem?.riskAcceptedUntil?.slice(0, 10) || "", riskAcceptanceSummary: problem.problem?.riskAcceptanceSummary || "" });
  const [riskOwner, setRiskOwner] = useState<Pick<User, "id" | "name" | "email"> | null>(problem.problem?.riskOwner || null);
  const [configurationItem, setConfigurationItem] = useState<ConfigurationItem | null>(problem.configurationItem || null);
  const [status, setStatus] = useState(problem.status?.name || "OPEN");
  const [groupId, setGroupId] = useState(problem.assignmentGroup?.id || groups[0]?.id || "");
  const [assigneeId, setAssigneeId] = useState(problem.assignedTo?.id || "");
  const [note, setNote] = useState("");
  const [activeTab, setActiveTab] = useState<"work-notes" | "tasks" | "related" | "risk">("work-notes");
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentConfig, setAttachmentConfig] = useState<{enabled:boolean;maxFileSizeMb:number}|null>(null);
  const [taskDraft, setTaskDraft] = useState({ title: "", description: "", assignmentGroupId: "", assignedToId: "" });
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [relatedNumber, setRelatedNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const selectedGroup = groups.find((group) => group.id === groupId);
  const activities = [...problem.activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const tasks = problem.problem?.tasks || [];
  const fieldValue = (value?: string | null) => value?.trim() || "Not documented";
  async function save() { setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.updateProblem(token, problem.id, { ...form, riskOwnerId: riskOwner?.id, riskAcceptedUntil: form.riskAcceptedUntil || undefined, configurationItemId: configurationItem?.id ?? null })); setSuccess("Problem details updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update problem"); } finally { setBusy(false); } }
  async function updateStatus() { setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.changeProblemStatus(token, problem.id, status)); setSuccess("Status updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update status"); } finally { setBusy(false); } }
  async function assign() { if(!groupId||!assigneeId)return; setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.assignProblem(token, problem.id, { assignmentGroupId: groupId, assignedToId: assigneeId })); setSuccess("Assignment updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Assignment failed"); } finally { setBusy(false); } }
  async function addNote() { if(!note.trim())return; setBusy(true); setError(""); try { await api.addProblemActivity(token, problem.id, note, canEdit ? "WORK_NOTE" : "COMMENT"); const refreshed = await api.problems(token); const value = refreshed.find((item)=>item.id===problem.id); if(value) onUpdated(value); setNote(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add activity"); } finally { setBusy(false); } }
  async function createTask() { if(!taskDraft.title.trim())return; setBusy(true); setError(""); setSuccess(""); try { const updated = await api.createProblemTask(token, problem.id, { ...taskDraft, assignmentGroupId: taskDraft.assignmentGroupId || undefined, assignedToId: taskDraft.assignedToId || undefined }); onUpdated(updated); setTaskDraft({ title: "", description: "", assignmentGroupId: "", assignedToId: "" }); setSuccess("PTask opened."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create problem task"); } finally { setBusy(false); } }
  async function loadRelated() { try { setRelatedItems(await api.relatedItems(token, problem.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load related incidents"); } }
  async function loadAttachments() { try { setAttachments(await api.attachments(token, problem.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load attachments"); } }
  async function refreshProblem() { onUpdated(await api.problem(token, problem.id)); }
  async function uploadAttachment(file?: File) { if(!file)return;setBusy(true);setError("");try{await api.uploadAttachment(token,problem.id,file);await loadAttachments();setSuccess("Attachment uploaded.");}catch(reason){setError(reason instanceof Error?reason.message:"Could not upload attachment")}finally{setBusy(false)} }
  async function deleteAttachment(id:string) { setBusy(true);try{await api.deleteAttachment(token,problem.id,id);await loadAttachments();setSuccess("Attachment deleted.");}catch(reason){setError(reason instanceof Error?reason.message:"Could not delete attachment")}finally{setBusy(false)} }
  async function addRelated() { if(!relatedNumber.trim())return; setBusy(true); setError(""); setSuccess(""); try { await api.addRelatedItem(token, problem.id, { relatedTicketNumber: relatedNumber, relationshipType: "CHILD_INCIDENT" }); setRelatedNumber(""); await loadRelated(); setSuccess("Related incident linked."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not link related incident"); } finally { setBusy(false); } }
  useEffect(() => { void loadRelated(); }, [problem.id]);
  useEffect(() => { api.attachmentConfiguration(token).then(value=>{setAttachmentConfig(value);if(value.enabled)void loadAttachments()}).catch(()=>setAttachmentConfig(null)); }, [token,problem.id]);
  return <section className="record-page record-form-modal problem-detail-page">
    <div className="modal-head record-head"><div><p className="eyebrow">{problem.ticketNumber}</p><h2>{problem.title}</h2></div><div className="modal-head-actions">{attachmentConfig?.enabled && <button type="button" className="icon-button attachment-icon" title={`Attachments (${attachments.length})`} onClick={() => setShowAttachments((value) => !value)}>📎</button>}<button type="button" className="secondary" onClick={onClose}>Back to queue</button></div></div>
    {success&&<div className="success">{success}</div>}{error&&<div className="error">{error}</div>}
    {showAttachments && <div className="detail-section attachment-popover-panel"><AttachmentPanel attachments={attachments} enabled={attachmentConfig?.enabled} maxFileSizeMb={attachmentConfig?.maxFileSizeMb} busy={busy} onUpload={uploadAttachment} onDownload={(item)=>api.downloadAttachment(token,problem.id,item.id,item.fileName)} onDelete={deleteAttachment} /></div>}
    <div className="record-two-column">
      <div className="record-main-stack"><div className="detail-section problem-form-fields"><h3>Problem details</h3>{canEdit ? <><label>Title<input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></label><label>Description<textarea rows={4} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label><ConfigurationItemPicker token={token} selected={configurationItem} onSelect={setConfigurationItem} /><div className="form-grid"><label>Impact<select value={form.impact} onChange={(e)=>setForm({...form,impact:e.target.value})}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label><label>Risk<select value={form.risk} onChange={(e)=>setForm({...form,risk:e.target.value})}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label></div><label>Impact details<textarea rows={3} value={form.impactDetails} onChange={(e)=>setForm({...form,impactDetails:e.target.value})} placeholder="Who/what is affected, scale, business impact..."/></label><label>Root Cause<textarea rows={4} value={form.rootCause} onChange={(e)=>setForm({...form,rootCause:e.target.value})}/></label><label>Workaround<textarea rows={3} value={form.workaround} onChange={(e)=>setForm({...form,workaround:e.target.value})}/></label><label>Permanent Fix<textarea rows={4} value={form.permanentFix} onChange={(e)=>setForm({...form,permanentFix:e.target.value})}/></label><label className="check-row"><input type="checkbox" checked={form.knownError} onChange={(e)=>setForm({...form,knownError:e.target.checked})}/>Known error</label><button className="primary" disabled={busy} onClick={save}>Save problem</button></> : <dl className="compact-fields"><dt>Description</dt><dd>{fieldValue(problem.description)}</dd><dt>Configuration Item</dt><dd>{problem.configurationItem?.name || "Not linked"}</dd><dt>Impact</dt><dd>{problem.problem?.impact || "MEDIUM"}</dd><dt>Impact Details</dt><dd>{fieldValue(problem.problem?.impactDetails)}</dd><dt>Risk</dt><dd>{problem.problem?.risk || "MEDIUM"}</dd><dt>Root Cause</dt><dd>{fieldValue(problem.problem?.rootCause)}</dd><dt>Workaround</dt><dd>{fieldValue(problem.problem?.workaround)}</dd><dt>Permanent Fix</dt><dd>{fieldValue(problem.problem?.permanentFix)}</dd><dt>Known Error</dt><dd>{problem.problem?.knownError ? "Yes" : "No"}</dd></dl>}</div></div>
      <div className="record-side-stack"><div className="detail-section compact-fields"><h3>Record info</h3><dl><dt>Created By</dt><dd>{problem.createdBy.name}</dd><dt>Opened On</dt><dd>{new Date(problem.createdAt).toLocaleString()}</dd><dt>Priority</dt><dd>{problem.priority?.name || form.priority}</dd><dt>Status</dt><dd><span className={`badge ${(problem.status?.name || "OPEN").toLowerCase()}`}>{(problem.status?.name || "OPEN").replaceAll("_", " ")}</span></dd><dt>Problem Type</dt><dd>Reactive</dd><dt>Configuration Item</dt><dd>{problem.configurationItem?.name || "Not linked"}</dd></dl></div>{canEdit&&<div className="detail-section"><h3>Assignment</h3><div className="assignment-row stacked"><select value={groupId} onChange={(e)=>{setGroupId(e.target.value);setAssigneeId("");}}><option value="">Select group</option>{groups.map((g)=><option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={assigneeId} onChange={(e)=>setAssigneeId(e.target.value)}><option value="">Select assignee</option>{selectedGroup?.members.map((m)=><option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}</select><button className="secondary" disabled={!groupId||!assigneeId||busy} onClick={assign}>Update assignment</button></div></div>}{canEdit&&<div className="detail-section"><h3>Status</h3><select value={status} onChange={(e)=>setStatus(e.target.value)}>{problemStatusOptions.map((value)=><option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><button className="secondary" disabled={busy} onClick={updateStatus}>Update status</button>{problem.status?.name==="CLOSED"&&!canReopen&&<p className="muted">Only an IT Service Manager or administrator can reopen a closed problem.</p>}</div>}</div>
    </div>
    <KnowledgeUsedPanel token={token} ticket={problem} canUse={canEdit} onTicketRefresh={refreshProblem} />
    <div className="detail-section record-tab-shell"><div className="record-tabs"><button className={activeTab==="work-notes"?"active":""} onClick={()=>setActiveTab("work-notes")}>Work Notes</button><button className={activeTab==="tasks"?"active":""} onClick={()=>setActiveTab("tasks")}>Problem Tasks <span>{tasks.length}</span></button><button className={activeTab==="related"?"active":""} onClick={()=>setActiveTab("related")}>Related Incidents <span>{relatedItems.length}</span></button><button className={activeTab==="risk"?"active":""} onClick={()=>setActiveTab("risk")}>Risk</button></div>
      {activeTab==="work-notes"&&<><div className="note-entry"><textarea rows={3} value={note} onChange={(e)=>setNote(e.target.value)} placeholder={canEdit ? "Add an internal work note..." : "Add a comment..."}/><button className="primary" disabled={!note.trim()||busy} onClick={addNote}>Add {canEdit ? "work note" : "comment"}</button></div><div className="activity-list">{activities.length ? activities.map((a)=><article key={a.id}><div><b>{a.createdBy.name}</b><span className="activity-type">{a.activityType?.name?.replace("_", " ")||"ACTIVITY"}</span><time>{new Date(a.createdAt).toLocaleString()}</time></div><p>{a.comment}</p></article>) : <p className="muted">No activity yet.</p>}</div></>}
      {activeTab==="tasks"&&<div className="problem-task-workspace">{canEdit&&<div className="admin-helper-grid"><input placeholder="Task title" value={taskDraft.title} onChange={(e)=>setTaskDraft({...taskDraft,title:e.target.value})}/><input placeholder="Task description" value={taskDraft.description} onChange={(e)=>setTaskDraft({...taskDraft,description:e.target.value})}/><select value={taskDraft.assignmentGroupId} onChange={(e)=>setTaskDraft({...taskDraft,assignmentGroupId:e.target.value,assignedToId:""})}><option value="">No group</option>{groups.map((g)=><option key={g.id} value={g.id}>{g.name}</option>)}</select><button className="secondary small" onClick={createTask} disabled={busy}>Open PTask</button></div>}{tasks.length ? <div className="request-task-list">{tasks.map((task)=><article key={task.id}><div className="request-task-summary"><div><button className="link-button task-number-link" type="button" onClick={()=>onOpenTask(task)}>{task.taskNumber}</button><small>{task.description || task.title}</small></div><div className="request-task-meta"><span className={`badge ${task.status.toLowerCase()}`}>{task.status.replaceAll("_", " ")}</span><small>{task.assignmentGroup?.name || "No group"}</small><small>{task.assignedTo?.name || "Unassigned"}</small></div></div></article>)}</div> : <p className="muted">No PTasks opened yet.</p>}</div>}
      {activeTab==="related"&&<div className="related-panel">{canEdit&&<div className="related-entry"><input value={relatedNumber} onChange={(e)=>setRelatedNumber(e.target.value)} placeholder="Incident number, e.g. INC000001"/><button className="secondary" onClick={addRelated} disabled={!relatedNumber.trim()||busy}>Link child incident</button></div>}{relatedItems.filter((item)=>item.ticketType==="INCIDENT"||["CHILD_INCIDENT","PARENT_INCIDENT","RELATED_INCIDENT"].includes(item.relationshipType)).length===0?<p className="muted">No related incidents linked.</p>:<div className="related-list compact-related-list">{relatedItems.filter((item)=>item.ticketType==="INCIDENT"||["CHILD_INCIDENT","PARENT_INCIDENT","RELATED_INCIDENT"].includes(item.relationshipType)).map((item)=><article key={item.id}><button className="link-button task-number-link" type="button" onClick={()=>onOpenIncident(item.ticketId)}>{item.ticketNumber}</button><span>{item.title}</span><span className="badge">{item.status}</span><small>{item.assignmentGroup || "No group"}</small></article>)}</div>}</div>}
      {activeTab==="risk"&&<div className="risk-summary">{canEdit ? <div className="risk-acceptance-form"><label className="check-row"><input type="checkbox" checked={form.riskAccepted} onChange={(e)=>setForm({...form,riskAccepted:e.target.checked})}/>Risk accepted</label>{form.riskAccepted&&<><UserSearchPicker token={token} label="Risk owner" selected={riskOwner} onSelect={setRiskOwner}/><label>Risk accepted till<input type="date" value={form.riskAcceptedUntil} onChange={(e)=>setForm({...form,riskAcceptedUntil:e.target.value})} required={form.riskAccepted}/></label><label>Risk acceptance summary<textarea rows={4} value={form.riskAcceptanceSummary} onChange={(e)=>setForm({...form,riskAcceptanceSummary:e.target.value})} required={form.riskAccepted} placeholder="Why accepting this risk is acceptable, approval/reference, mitigation/monitoring plan."/></label></>}<button className="primary" disabled={busy || (form.riskAccepted && (!riskOwner || !form.riskAcceptedUntil || !form.riskAcceptanceSummary.trim()))} onClick={save}>Save risk details</button></div> : <dl className="compact-fields"><dt>Risk Accepted</dt><dd>{problem.problem?.riskAccepted ? "Yes" : "No"}</dd><dt>Risk Owner</dt><dd>{problem.problem?.riskOwner?.name || "Not set"}</dd><dt>Accepted Till</dt><dd>{problem.problem?.riskAcceptedUntil ? new Date(problem.problem.riskAcceptedUntil).toLocaleDateString() : "Not set"}</dd><dt>Summary</dt><dd>{fieldValue(problem.problem?.riskAcceptanceSummary)}</dd></dl>}</div>}
    </div>
  </section>;
}

function ProblemTaskDetail({ problem, task, token, groups, canEdit, onUpdated, onBackToProblem, onClose }: { problem: Incident; task: ProblemTask; token: string; groups: AssignmentGroup[]; canEdit: boolean; onUpdated: (value: Incident) => void; onBackToProblem: () => void; onClose: () => void }) {
  const [edit, setEdit] = useState({ title: task.title, description: task.description || "", status: task.status, assignmentGroupId: task.assignmentGroup?.id || "", assignedToId: task.assignedTo?.id || "" });
  const [workNote, setWorkNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedGroup = groups.find((group) => group.id === edit.assignmentGroupId);
  async function save(note?: string) {
    setBusy(true); setError("");
    try {
      const updated = await api.updateProblemTask(token, problem.id, task.id, {
        title: edit.title,
        description: edit.description,
        status: edit.status,
        assignmentGroupId: edit.assignmentGroupId || undefined,
        assignedToId: edit.assignedToId || undefined,
        workNote: note?.trim() || undefined,
      });
      onUpdated(updated);
      if (note) setWorkNote("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update problem task");
    } finally {
      setBusy(false);
    }
  }
  const taskNotes = problem.activities.filter((activity) => activity.comment.startsWith(`${task.taskNumber}:`));
  return (
    <section className="record-page record-form-modal sr-task-page">
      <div className="modal-head record-head">
        <div><p className="eyebrow">{task.taskNumber}</p><h2>{task.title}</h2><button className="link-button parent-record-link" type="button" onClick={onBackToProblem}>Parent problem: {problem.ticketNumber}</button></div>
        <div className="modal-head-actions"><button type="button" className="secondary" onClick={onClose}>Back to queue</button></div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="record-two-column">
        <div className="record-main-stack">
          <div className="detail-section task-form-grid">
            <h3>Task details</h3>
            {canEdit ? (
              <>
                <label>Short description<input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
                <label>Description<textarea rows={5} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></label>
                <button className="primary" disabled={busy} onClick={() => save()}>Save task</button>
              </>
            ) : (
              <dl className="compact-fields"><dt>Short description</dt><dd>{task.title}</dd><dt>Description</dt><dd>{task.description || "Not documented"}</dd></dl>
            )}
          </div>
        </div>
        <div className="record-side-stack">
          <div className="detail-section">
            <h3>Current state</h3>
            {canEdit ? (
              <div className="task-state-grid">
                <label>Status<select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></label>
                <label>Created<input value={new Date(task.createdAt).toLocaleString()} readOnly /></label>
                <label>Assignment group<select value={edit.assignmentGroupId} onChange={(e) => setEdit({ ...edit, assignmentGroupId: e.target.value, assignedToId: "" })}><option value="">No group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
                <label>Assigned to<select value={edit.assignedToId} onChange={(e) => setEdit({ ...edit, assignedToId: e.target.value })}><option value="">Unassigned</option>{selectedGroup?.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select></label>
                <button className="secondary" disabled={busy} onClick={() => save()}>Update state</button>
              </div>
            ) : (
              <dl className="compact-fields"><dt>Status</dt><dd><span className={`badge ${task.status.toLowerCase()}`}>{task.status.replaceAll("_", " ")}</span></dd><dt>Assignment group</dt><dd>{task.assignmentGroup?.name || "No group"}</dd><dt>Assigned to</dt><dd>{task.assignedTo?.name || "Unassigned"}</dd><dt>Created</dt><dd>{new Date(task.createdAt).toLocaleString()}</dd></dl>
            )}
          </div>
        </div>
      </div>
      <div className="detail-section">
        <h3>Work notes</h3>
        {canEdit && <div className="note-entry"><textarea rows={3} value={workNote} onChange={(e) => setWorkNote(e.target.value)} placeholder="Add a task work note. It will also appear on the parent problem." /><button className="primary" disabled={!workNote.trim() || busy} onClick={() => save(workNote)}>Add work note</button></div>}
        <div className="activity-list task-note-list">
          {taskNotes.length === 0 ? <p className="muted">No task work notes yet.</p> : taskNotes.map((activity) => <article key={activity.id}><div><b>{activity.createdBy.name}</b><span className="activity-type">TASK WORK NOTE</span><time>{new Date(activity.createdAt).toLocaleString()}</time></div><p>{activity.comment.replace(`${task.taskNumber}:`, "").trim()}</p></article>)}
        </div>
      </div>
    </section>
  );
}

function ChangeDetail({ change, token, canEdit, canReopen, groups, onUpdated, onClose }: { change: Incident; token: string; canEdit: boolean; canReopen: boolean; groups: AssignmentGroup[]; onUpdated: (value: Incident) => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: change.title, description: change.description || "", priority: change.priority?.name || "MEDIUM", changeType: change.change?.changeType || "NORMAL", risk: change.change?.risk || "MEDIUM", impact: change.change?.impact || "MEDIUM", plannedStart: change.change?.plannedStart?.slice(0, 16) || "", plannedEnd: change.change?.plannedEnd?.slice(0, 16) || "", implementationPlan: change.change?.implementationPlan || "", rollbackPlan: change.change?.rollbackPlan || "", testPlan: change.change?.testPlan || "" });
  const [configurationItem, setConfigurationItem] = useState<ConfigurationItem | null>(change.configurationItem || null);
  const [status, setStatus] = useState(change.status?.name || "OPEN");
  const [groupId, setGroupId] = useState(change.assignmentGroup?.id || groups[0]?.id || "");
  const [assigneeId, setAssigneeId] = useState(change.assignedTo?.id || "");
  const [note, setNote] = useState("");
  const [activeTab, setActiveTab] = useState<"work-notes" | "approvals" | "related" | "plans">("work-notes");
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentConfig, setAttachmentConfig] = useState<{enabled:boolean;maxFileSizeMb:number}|null>(null);
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [relatedNumber, setRelatedNumber] = useState("");
  const [relationType, setRelationType] = useState("CAUSED_INCIDENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const selectedGroup = groups.find((group) => group.id === groupId);
  const approvals = change.change?.approvals || [];
  const activities = [...change.activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  async function save() { setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.updateChange(token, change.id, { ...form, configurationItemId: configurationItem?.id ?? null, plannedStart: form.plannedStart || undefined, plannedEnd: form.plannedEnd || undefined })); setSuccess("Change details updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update change"); } finally { setBusy(false); } }
  async function updateStatus() { setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.changeChangeStatus(token, change.id, status)); setSuccess("Status updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update status"); } finally { setBusy(false); } }
  async function assign() { if(!groupId||!assigneeId)return; setBusy(true); setError(""); setSuccess(""); try { onUpdated(await api.assignChange(token, change.id, { assignmentGroupId: groupId, assignedToId: assigneeId })); setSuccess("Assignment updated."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Assignment failed"); } finally { setBusy(false); } }
  async function addNote() { if(!note.trim())return; setBusy(true); setError(""); try { await api.addChangeActivity(token, change.id, note, canEdit ? "WORK_NOTE" : "COMMENT"); const refreshed = await api.changes(token); const value = refreshed.find((item)=>item.id===change.id); if(value) onUpdated(value); setNote(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add activity"); } finally { setBusy(false); } }
  async function loadRelated() { try { setRelatedItems(await api.relatedItems(token, change.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load related items"); } }
  async function loadAttachments() { try { setAttachments(await api.attachments(token, change.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load attachments"); } }
  async function refreshChange() { onUpdated(await api.change(token, change.id)); }
  async function uploadAttachment(file?: File) { if(!file)return;setBusy(true);setError("");try{await api.uploadAttachment(token,change.id,file);await loadAttachments();setSuccess("Attachment uploaded.");}catch(reason){setError(reason instanceof Error?reason.message:"Could not upload attachment")}finally{setBusy(false)} }
  async function deleteAttachment(id:string) { setBusy(true);try{await api.deleteAttachment(token,change.id,id);await loadAttachments();setSuccess("Attachment deleted.");}catch(reason){setError(reason instanceof Error?reason.message:"Could not delete attachment")}finally{setBusy(false)} }
  async function addRelated() { if(!relatedNumber.trim())return; setBusy(true); setError(""); setSuccess(""); try { await api.addRelatedItem(token, change.id, { relatedTicketNumber: relatedNumber, relationshipType: relationType }); setRelatedNumber(""); await loadRelated(); setSuccess("Related item linked."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not link related item"); } finally { setBusy(false); } }
  useEffect(() => { if(activeTab === "related") void loadRelated(); }, [activeTab, change.id]);
  useEffect(() => { api.attachmentConfiguration(token).then(value=>{setAttachmentConfig(value);if(value.enabled)void loadAttachments()}).catch(()=>setAttachmentConfig(null)); }, [token,change.id]);
  return <section className="record-page record-form-modal change-detail-page">
    <div className="modal-head record-head"><div><p className="eyebrow">{change.ticketNumber}</p><h2>{change.title}</h2><p className="muted">{change.change?.changeType || "NORMAL"} change</p></div><div className="modal-head-actions">{attachmentConfig?.enabled && <button type="button" className="icon-button attachment-icon" title={`Attachments (${attachments.length})`} onClick={() => setShowAttachments((value) => !value)}>📎</button>}<button type="button" className="secondary" onClick={onClose}>Back to queue</button></div></div>
    {success&&<div className="success">{success}</div>}{error&&<div className="error">{error}</div>}
    {showAttachments && <div className="detail-section attachment-popover-panel"><AttachmentPanel attachments={attachments} enabled={attachmentConfig?.enabled} maxFileSizeMb={attachmentConfig?.maxFileSizeMb} busy={busy} onUpload={uploadAttachment} onDownload={(item)=>api.downloadAttachment(token,change.id,item.id,item.fileName)} onDelete={deleteAttachment} /></div>}
    <div className="record-two-column">
      <div className="record-main-stack"><div className="detail-section problem-form-fields"><h3>Change details</h3>{canEdit ? <><label>Title<input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></label><label>Description<textarea rows={4} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label><ConfigurationItemPicker token={token} selected={configurationItem} onSelect={setConfigurationItem} /><div className="form-grid"><label>Type<select value={form.changeType} onChange={(e)=>setForm({...form,changeType:e.target.value})}>{["STANDARD","NORMAL","EMERGENCY"].map((x)=><option key={x}>{x}</option>)}</select></label><label>Risk<select value={form.risk} onChange={(e)=>setForm({...form,risk:e.target.value})}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label><label>Impact<select value={form.impact} onChange={(e)=>setForm({...form,impact:e.target.value})}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label><label>Priority<select value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value})}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x)=><option key={x}>{x}</option>)}</select></label><label>Planned start<input type="datetime-local" value={form.plannedStart} onChange={(e)=>setForm({...form,plannedStart:e.target.value})}/></label><label>Planned end<input type="datetime-local" value={form.plannedEnd} onChange={(e)=>setForm({...form,plannedEnd:e.target.value})}/></label></div><button className="primary" disabled={busy} onClick={save}>Save change</button></> : <dl className="compact-fields"><dt>Description</dt><dd>{change.description || "No description provided."}</dd><dt>Configuration Item</dt><dd>{change.configurationItem?.name || "Not linked"}</dd></dl>}</div></div>
      <div className="record-side-stack"><div className="detail-section compact-fields"><h3>Record info</h3><dl><dt>Requested By</dt><dd>{change.change?.requestedBy?.name || change.createdBy.name}</dd><dt>Opened On</dt><dd>{new Date(change.createdAt).toLocaleString()}</dd><dt>Priority</dt><dd>{change.priority?.name || form.priority}</dd><dt>Status</dt><dd><span className={`badge ${(change.status?.name || "NEW").toLowerCase()}`}>{(change.status?.name || "NEW").replaceAll("_", " ")}</span></dd><dt>Risk</dt><dd>{change.change?.risk || form.risk}</dd><dt>Impact</dt><dd>{change.change?.impact || form.impact}</dd><dt>Configuration Item</dt><dd>{change.configurationItem?.name || "Not linked"}</dd></dl></div>{canEdit&&<div className="detail-section"><h3>Assignment</h3><div className="assignment-row stacked"><select value={groupId} onChange={(e)=>{setGroupId(e.target.value);setAssigneeId("");}}><option value="">Select group</option>{groups.map((g)=><option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={assigneeId} onChange={(e)=>setAssigneeId(e.target.value)}><option value="">Select assignee</option>{selectedGroup?.members.map((m)=><option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}</select><button className="secondary" disabled={!groupId||!assigneeId||busy} onClick={assign}>Update assignment</button></div></div>}{canEdit&&<div className="detail-section"><h3>Status</h3><select value={status} onChange={(e)=>setStatus(e.target.value)} disabled={change.status?.name==="CLOSED"&&!canReopen}>{changeStatusOptions.map((value)=><option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><button className="secondary" disabled={busy||(change.status?.name==="CLOSED"&&!canReopen)} onClick={updateStatus}>Update status</button>{change.status?.name==="CLOSED"&&!canReopen&&<p className="muted">Only an IT Service Manager or administrator can reopen a closed change.</p>}</div>}</div>
    </div>
    <KnowledgeUsedPanel token={token} ticket={change} canUse={canEdit} onTicketRefresh={refreshChange} />
    <div className="detail-section record-tab-shell"><div className="record-tabs"><button className={activeTab==="work-notes"?"active":""} onClick={()=>setActiveTab("work-notes")}>Work Notes</button><button className={activeTab==="plans"?"active":""} onClick={()=>setActiveTab("plans")}>Plans</button><button className={activeTab==="approvals"?"active":""} onClick={()=>setActiveTab("approvals")}>Approvals <span>{approvals.length}</span></button><button className={activeTab==="related"?"active":""} onClick={()=>setActiveTab("related")}>Related Items <span>{relatedItems.length}</span></button></div>{activeTab==="work-notes"&&<><div className="note-entry"><textarea rows={3} value={note} onChange={(e)=>setNote(e.target.value)} placeholder={canEdit ? "Add an internal work note..." : "Add a comment..."}/><button className="primary" disabled={!note.trim()||busy} onClick={addNote}>Add {canEdit ? "work note" : "comment"}</button></div><div className="activity-list">{activities.length ? activities.map((a)=><article key={a.id}><div><b>{a.createdBy.name}</b><span className="activity-type">{a.activityType?.name?.replace("_", " ")||"ACTIVITY"}</span><time>{new Date(a.createdAt).toLocaleString()}</time></div><p>{a.comment}</p></article>) : <p className="muted">No activity yet.</p>}</div></>}{activeTab==="plans"&&<div className="change-plan-grid stacked">{["implementationPlan","rollbackPlan","testPlan"].map((key)=><label key={key}>{key==="implementationPlan"?"Implementation plan":key==="rollbackPlan"?"Rollback plan":"Test plan"}<textarea rows={4} disabled={!canEdit} value={form[key as "implementationPlan"|"rollbackPlan"|"testPlan"]} onChange={(e)=>setForm({...form,[key]:e.target.value})}/></label>)}{canEdit&&<button className="primary" disabled={busy} onClick={save}>Save plans</button>}</div>}{activeTab==="approvals"&&<div className="approval-step-list">{approvals.length===0?<p className="muted">No approval steps generated for this change.</p>:approvals.map((approval)=><article key={approval.id}><b>Step {approval.sequence}</b><div><strong>{approval.approvalType.replace("_", " ")}</strong><small>{approval.approver?.name || "Approver pending"}</small></div><span className={`badge ${approval.status.toLowerCase()}`}>{approval.status}</span></article>)}</div>}{activeTab==="related"&&<div className="related-panel">{canEdit&&<div className="related-entry"><select value={relationType} onChange={(e)=>setRelationType(e.target.value)}><option value="CAUSED_INCIDENT">Caused incident</option><option value="IMPLEMENTED_BY_CHANGE">Implemented request/problem</option><option value="RELATED_PROBLEM">Related problem</option><option value="RELATED_CHANGE">Related change</option></select><input value={relatedNumber} onChange={(e)=>setRelatedNumber(e.target.value)} placeholder="Ticket number, e.g. INC000001 or PRB000001"/><button className="secondary" onClick={addRelated} disabled={!relatedNumber.trim()||busy}>Link item</button></div>}{relatedItems.length===0?<p className="muted">No related items linked.</p>:<div className="related-list">{relatedItems.map((item)=><article key={item.id}><button className="link-button task-number-link" type="button">{item.ticketNumber}</button><span>{item.title}</span><span className="badge">{item.status}</span><small>{relationshipLabel(item.relationshipType)}</small></article>)}</div>}</div>}</div>
  </section>;
}

const emptyKnowledgeForm = { title: "", category: "General", status: "DRAFT", summary: "", content: "", keywords: "" };
function KnowledgeModule({ token, user }: { token: string; user: User }) {
  const canManage = user.roles.some((role) => role !== "EMPLOYEE");
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null);
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);
  const [form, setForm] = useState(emptyKnowledgeForm);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const categories = useMemo(() => Array.from(new Set(articles.map((article) => article.category))).sort(), [articles]);
  const showForm = canManage && editing !== null;
  async function load() {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ search, category, status, page: String(page), limit: "20" });
      const result = await api.knowledgeArticles(token, query.toString());
      setArticles(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load knowledge articles");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 250);
    return () => window.clearTimeout(timer);
  }, [token, search, category, status, page]);
  useEffect(() => { setPage(1); }, [search, category, status]);
  function startCreate() { setSelected(null); setEditing({ id: "", articleNumber: "New", title: "", category: "General", status: "DRAFT", createdAt: "", updatedAt: "" }); setForm(emptyKnowledgeForm); }
  function startEdit(article: KnowledgeArticle) {
    setEditing(article); setSelected(null);
    setForm({ title: article.title, category: article.category, status: article.status, summary: article.summary || "", content: article.content || "", keywords: article.keywords || "" });
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const payload = { ...form, title: form.title.trim() };
      const saved = editing?.id ? await api.updateKnowledgeArticle(token, editing.id, payload) : await api.createKnowledgeArticle(token, payload);
      setSuccess(`${saved.articleNumber} saved.`);
      setEditing(saved); setForm({ title: saved.title, category: saved.category, status: saved.status, summary: saved.summary || "", content: saved.content || "", keywords: saved.keywords || "" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save knowledge article");
    } finally { setBusy(false); }
  }
  return (
    <section className="knowledge-workspace">
      <header><div><p className="eyebrow">Knowledge</p><h1>Knowledge Base</h1><p>Create, publish, archive, and reuse support knowledge.</p></div>{canManage && <button className="primary compact" onClick={startCreate}>Create KB article</button>}</header>
      {success && <div className="success">{success}</div>}{error && <div className="error">{error}</div>}
      <div className="table-card"><div className="table-head"><div><h2>Articles</h2><p>{loading ? "Loading…" : `${total} article(s), 20 per page`}</p></div><div className="queue-filters"><input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, content, category" /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{["DRAFT", "PUBLISHED", "ARCHIVED"].map((item) => <option key={item}>{item}</option>)}</select></div></div>
        {articles.length === 0 ? <div className="empty"><b>No articles found</b><span>Create or adjust filters.</span></div> : <div className="table-wrap"><table className="knowledge-table"><thead><tr><th>KB Article #</th><th>Title</th><th>KB Status</th><th>Updated</th></tr></thead><tbody>{articles.map((article) => <tr key={article.id}><td><button className="ticket-link" onClick={() => setSelected(article)}>{article.articleNumber}</button></td><td>{article.title}</td><td><span className={`badge ${article.status.toLowerCase()}`}>{article.status}</span></td><td>{new Date(article.updatedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
        <div className="pagination-row"><button className="secondary small" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>Page {page} of {totalPages}</span><button className="secondary small" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button></div>
        {selected && <div className="modal-backdrop"><section className="modal knowledge-modal"><div className="modal-head"><div><p className="eyebrow">{selected.articleNumber} · {selected.category} · {selected.status}</p><h2>{selected.title}</h2></div><button className="icon-button" onClick={() => setSelected(null)}>×</button></div>{selected.summary && <p className="knowledge-summary">{selected.summary}</p>}<div className="knowledge-content">{selected.content || "No content added yet."}</div>{selected.keywords && <small className="muted">Keywords: {selected.keywords}</small>}<div className="modal-actions">{canManage && <button className="secondary" onClick={() => startEdit(selected)}>Edit article</button>}<button className="primary" onClick={() => setSelected(null)}>Close</button></div></section></div>}
        {showForm && <div className="modal-backdrop"><form className="modal record-form-modal knowledge-editor fullscreen" onSubmit={save}><div className="modal-head"><div><p className="eyebrow">{editing?.articleNumber || "New KB"}</p><h2>{editing?.id ? `Edit ${editing.articleNumber}` : "Create KB article"}</h2></div><button type="button" className="icon-button" onClick={() => { setEditing(null); setForm(emptyKnowledgeForm); }}>×</button></div><label>Title<input required minLength={3} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></label><div className="form-grid"><label>Category<input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["DRAFT", "PUBLISHED", "ARCHIVED"].map((item) => <option key={item}>{item}</option>)}</select></label></div><label>Summary<textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label><label>Content / Resolution Steps<textarea rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label><label>Keywords / Tags<input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="vpn, firmware, troubleshooting" /></label>{editing?.updatedBy && <p className="muted">Last updated by {editing.updatedBy.name}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={() => { setEditing(null); setForm(emptyKnowledgeForm); }}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div></form></div>}
        </div>
    </section>
  );
}

const emptyCmdbLookups: CmdbLookupData = { categories: [], types: [], statuses: [], relationshipTypes: [] };
const emptyCiForm = { ciNumber: "", name: "", categoryId: "", typeId: "", statusId: "", ownerId: "", environment: "", criticality: "MEDIUM", description: "" };
const emptyRelationshipForm = { parentCiId: "", relationshipTypeId: "", childCiId: "", status: "ACTIVE", description: "" };

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { current += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(current); current = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current); rows.push(row); row = []; current = ""; continue;
    }
    current += char;
  }
  if (current || row.length) { row.push(current); rows.push(row); }
  const headers = (rows.shift() || []).map((value) => value.trim().toLowerCase());
  return rows.filter((values) => values.some((value) => value.trim())).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""])));
}

function CmdbModule({ token, user, onOpenTicket }: { token: string; user: User; onOpenTicket: (type: "INCIDENT" | "PROBLEM" | "CHANGE", id: string) => void }) {
  const canManage = user.roles.some((role) => ["IT_SERVICE_MANAGER", "ADMIN"].includes(role));
  const canImport = user.roles.includes("ADMIN");
  const [tab, setTab] = useState<"items" | "relationships" | "import">("items");
  const [lookups, setLookups] = useState<CmdbLookupData>(emptyCmdbLookups);
  const [items, setItems] = useState<ConfigurationItem[]>([]);
  const [relationships, setRelationships] = useState<CmdbRelationship[]>([]);
  const [selected, setSelected] = useState<ConfigurationItem | null>(null);
  const [editing, setEditing] = useState<ConfigurationItem | null>(null);
  const [editingRelationship, setEditingRelationship] = useState<CmdbRelationship | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showRelationship, setShowRelationship] = useState(false);
  const [ciForm, setCiForm] = useState(emptyCiForm);
  const [ownerUser, setOwnerUser] = useState<Pick<User, "id" | "name" | "email"> | null>(null);
  const [parentCi, setParentCi] = useState<Pick<ConfigurationItem, "id" | "name" | "ciNumber" | "ciType"> | null>(null);
  const [childCi, setChildCi] = useState<Pick<ConfigurationItem, "id" | "name" | "ciNumber" | "ciType"> | null>(null);
  const [relationshipForm, setRelationshipForm] = useState(emptyRelationshipForm);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [relationshipTypeId, setRelationshipTypeId] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [relationshipSide, setRelationshipSide] = useState("all");
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [preview, setPreview] = useState<CmdbImportPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const query = new URLSearchParams({ search, categoryId, typeId, statusId, active: "true" });
  const relationshipQuery = new URLSearchParams({ search, relationshipTypeId, status: relationshipStatus, side: relationshipSide });
  const itemFilterTypes = categoryId ? lookups.types.filter((type) => type.categoryId === categoryId) : lookups.types;
  const formTypes = ciForm.categoryId ? lookups.types.filter((type) => type.categoryId === ciForm.categoryId) : lookups.types;
  const closeCiForm = () => { setShowCreate(false); setEditing(null); setOwnerUser(null); };
  const closeRelationshipForm = () => { setShowRelationship(false); setEditingRelationship(null); setParentCi(null); setChildCi(null); };
  async function loadAll() {
    setLoading(true); setError("");
    try {
      const [lookupValues, ciValues, relationshipValues] = await Promise.all([api.cmdbLookups(token), api.cmdbItems(token, query.toString()), api.cmdbRelationships(token, relationshipQuery.toString())]);
      setLookups(lookupValues);
      setItems(ciValues.data);
      setRelationships(relationshipValues);
      const firstCategoryId = lookupValues.categories[0]?.id || "";
      const firstTypeId = lookupValues.types.find((type) => type.categoryId === firstCategoryId)?.id || lookupValues.types[0]?.id || "";
      setCiForm((value) => ({ ...value, categoryId: value.categoryId || firstCategoryId, typeId: value.typeId || firstTypeId, statusId: value.statusId || lookupValues.statuses.find((x) => x.name === "ACTIVE")?.id || lookupValues.statuses[0]?.id || "" }));
      setRelationshipForm((value) => ({ ...value, relationshipTypeId: value.relationshipTypeId || lookupValues.relationshipTypes[0]?.id || "" }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load CMDB"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadAll(); }, [token]);
  async function refreshItems() { const value = await api.cmdbItems(token, query.toString()); setItems(value.data); }
  async function refreshRelationships() { setRelationships(await api.cmdbRelationships(token, relationshipQuery.toString())); }
  useEffect(() => {
    if (tab !== "items" || showCreate) return;
    const timer = window.setTimeout(() => {
      refreshItems().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not refresh configuration items"));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [token, tab, showCreate, search, categoryId, typeId, statusId]);
  useEffect(() => {
    if (tab !== "relationships" || showRelationship) return;
    const timer = window.setTimeout(() => {
      refreshRelationships().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not refresh relationships"));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [token, tab, showRelationship, search, relationshipTypeId, relationshipStatus, relationshipSide]);
  async function openDetail(id: string) { setBusy(true); setError(""); try { setSelected(await api.cmdbItem(token, id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load CI details"); } finally { setBusy(false); } }
  function startCreate() {
    const firstCategoryId = lookups.categories[0]?.id || "";
    const firstTypeId = lookups.types.find((type) => type.categoryId === firstCategoryId)?.id || "";
    const firstStatusId = lookups.statuses.find((x) => x.name === "ACTIVE")?.id || lookups.statuses[0]?.id || "";
    if (!firstCategoryId || !firstTypeId || !firstStatusId) {
      setError("CMDB lookups are not ready. Check Admin Console → CMDB Settings for active categories, types, and statuses.");
      return;
    }
    setError("");
    setEditing(null);
    setOwnerUser(null);
    setCiForm({ ...emptyCiForm, categoryId: firstCategoryId, typeId: firstTypeId, statusId: firstStatusId });
    setShowCreate(true);
  }
  function startEdit(item: ConfigurationItem) { setSelected(null); setEditing(item); setOwnerUser(item.owner || null); setCiForm({ ciNumber: item.ciNumber || "", name: item.name, categoryId: item.category?.id || "", typeId: item.type?.id || "", statusId: item.status?.id || "", ownerId: item.owner?.id || "", environment: item.environment || "", criticality: item.criticality || "MEDIUM", description: item.description || "" }); setShowCreate(true); }
  async function saveCi(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const { ciNumber: _ciNumber, ...ciInput } = ciForm;
      const input = { ...ciInput, ownerId: ownerUser?.id || undefined, environment: ciForm.environment || undefined, description: ciForm.description || undefined };
      const saved = editing ? await api.updateCmdbItem(token, editing.id, input) : await api.createCmdbItem(token, input);
      setSuccess(editing ? "Configuration item updated." : "Configuration item created.");
      const savedDetail = await api.cmdbItem(token, saved.id);
      setEditing(savedDetail);
      setOwnerUser(savedDetail.owner || null);
      setCiForm({ ciNumber: savedDetail.ciNumber || "", name: savedDetail.name, categoryId: savedDetail.category?.id || "", typeId: savedDetail.type?.id || "", statusId: savedDetail.status?.id || "", ownerId: savedDetail.owner?.id || "", environment: savedDetail.environment || "", criticality: savedDetail.criticality || "MEDIUM", description: savedDetail.description || "" });
      setShowCreate(true);
      await refreshItems();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save CI"); }
    finally { setBusy(false); }
  }
  async function deactivateCi(id: string) { setBusy(true); setError(""); try { await api.deactivateCmdbItem(token, id); setSuccess("Configuration item deactivated."); setSelected(null); await refreshItems(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not deactivate CI"); } finally { setBusy(false); } }
  function startRelationship(row?: CmdbRelationship) {
    if (!row && !lookups.relationshipTypes[0]?.id) {
      setError("No active relationship types are available. Add one in Admin Console → CMDB Settings.");
      return;
    }
    setError("");
    setEditingRelationship(row || null);
    setParentCi(row?.parentCi || null);
    setChildCi(row?.childCi || null);
    setRelationshipForm(row ? { parentCiId: row.parentCi.id, relationshipTypeId: row.relationshipType.id, childCiId: row.childCi.id, status: row.status, description: row.description || "" } : { ...emptyRelationshipForm, relationshipTypeId: lookups.relationshipTypes[0]?.id || "" });
    setShowRelationship(true);
  }
  async function saveRelationship(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const input = { ...relationshipForm, parentCiId: parentCi?.id || relationshipForm.parentCiId, childCiId: childCi?.id || relationshipForm.childCiId };
      const saved = editingRelationship ? await api.updateCmdbRelationship(token, editingRelationship.id, input) : await api.createCmdbRelationship(token, input);
      setSuccess(editingRelationship ? "Relationship updated." : "Relationship added.");
      setEditingRelationship(saved);
      setParentCi(saved.parentCi);
      setChildCi(saved.childCi);
      setRelationshipForm({ parentCiId: saved.parentCi.id, relationshipTypeId: saved.relationshipType.id, childCiId: saved.childCi.id, status: saved.status, description: saved.description || "" });
      setShowRelationship(true);
      await refreshRelationships(); if (selected) setSelected(await api.cmdbItem(token, selected.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save relationship"); }
    finally { setBusy(false); }
  }
  async function deleteRelationship(id: string) { setBusy(true); setError(""); try { await api.deleteCmdbRelationship(token, id); setSuccess("Relationship deleted."); await refreshRelationships(); if (selected) setSelected(await api.cmdbItem(token, selected.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete relationship"); } finally { setBusy(false); } }
  async function previewFile(file?: File) {
    if (!file) return; setBusy(true); setError(""); setSuccess(""); setPreview(null);
    try { const rows = parseCsv(await file.text()); setImportRows(rows); setPreview(await api.previewCmdbImport(token, rows)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not preview import"); }
    finally { setBusy(false); }
  }
  async function confirmImport() {
    setBusy(true); setError(""); setSuccess("");
    try { const result = await api.confirmCmdbImport(token, importRows); setPreview(result); setSuccess(`Import complete. Created ${result.createdRecords || 0} CI(s), skipped ${result.skippedRecords || 0}.`); await refreshItems(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not import CIs"); }
    finally { setBusy(false); }
  }
  const ciOptions = items.map((item) => <option key={item.id} value={item.id}>{item.ciNumber ? `${item.ciNumber} - ` : ""}{item.name}</option>);
  if (showCreate) return <section className="cmdb-workspace cmdb-record-page">
    <header><div><p className="eyebrow">CMDB</p><h1>{editing ? "Edit Configuration Item" : "Create Configuration Item"}</h1><p>{editing ? "Update the managed CI details and keep the record open for review." : "Create a managed component that supports IT services."}</p></div><button className="secondary" onClick={closeCiForm}>Back to Configuration Items</button></header>
    {error && <div className="error">{error}</div>}{success && <div className="success">{success}</div>}
    <form className="table-card cmdb-full-form" onSubmit={saveCi}><div className="table-head"><div><h2>{editing ? editing.name : "New Configuration Item"}</h2><p>CI Number is generated by the system and cannot be manually changed.</p></div><button className="primary compact" disabled={busy}>{busy ? "Saving..." : "Save"}</button></div><div className="cmdb-form-body">{editing && <div className="readonly-field"><span>CI Number</span><strong>{ciForm.ciNumber || editing.ciNumber || "Generated"}</strong></div>}<div className="form-grid"><label>Name<input required value={ciForm.name} onChange={(e) => setCiForm({ ...ciForm, name: e.target.value })}/></label><label>Category<select required value={ciForm.categoryId} onChange={(e) => { const nextCategoryId = e.target.value; const nextTypeId = lookups.types.find((type) => type.categoryId === nextCategoryId)?.id || ""; setCiForm({ ...ciForm, categoryId: nextCategoryId, typeId: nextTypeId }); }}>{lookups.categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Type<select required value={ciForm.typeId} onChange={(e) => setCiForm({ ...ciForm, typeId: e.target.value })}>{formTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Status<select required value={ciForm.statusId} onChange={(e) => setCiForm({ ...ciForm, statusId: e.target.value })}>{lookups.statuses.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Criticality<select value={ciForm.criticality} onChange={(e) => setCiForm({ ...ciForm, criticality: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x) => <option key={x}>{x}</option>)}</select></label><label>Environment<input value={ciForm.environment} onChange={(e) => setCiForm({ ...ciForm, environment: e.target.value })} placeholder="Production, UAT, Dev..."/></label></div><UserSearchPicker token={token} label="Owner" selected={ownerUser} onSelect={setOwnerUser}/><label>Description<textarea rows={5} value={ciForm.description} onChange={(e) => setCiForm({ ...ciForm, description: e.target.value })}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={closeCiForm}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Saving..." : "Save"}</button></div></div></form>
  </section>;
  if (showRelationship) return <section className="cmdb-workspace cmdb-record-page">
    <header><div><p className="eyebrow">CMDB Relationship</p><h1>{editingRelationship ? "Edit Relationship" : "Add Relationship"}</h1><p>Define parent-child CI dependencies for impact analysis and future graph views.</p></div><button className="secondary" onClick={closeRelationshipForm}>Back to Relationships</button></header>
    {error && <div className="error">{error}</div>}{success && <div className="success">{success}</div>}
    <form className="table-card cmdb-full-form" onSubmit={saveRelationship}><div className="table-head"><div><h2>{editingRelationship ? "Relationship details" : "New Relationship"}</h2><p>Search the full CMDB for parent and child CIs. Workspace list filters do not affect these fields.</p></div><button className="primary compact" disabled={busy || !parentCi || !childCi}>{busy ? "Saving..." : "Save"}</button></div><div className="cmdb-form-body"><div className="form-grid"><CompactCiSearchPicker token={token} label="Parent CI" selected={parentCi} onSelect={(item) => { setParentCi(item); setRelationshipForm({ ...relationshipForm, parentCiId: item?.id || "" }); }} /><label>Relationship Type<select required value={relationshipForm.relationshipTypeId} onChange={(e) => setRelationshipForm({ ...relationshipForm, relationshipTypeId: e.target.value })}>{lookups.relationshipTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><CompactCiSearchPicker token={token} label="Child CI" selected={childCi} onSelect={(item) => { setChildCi(item); setRelationshipForm({ ...relationshipForm, childCiId: item?.id || "" }); }} /><label>Status<select value={relationshipForm.status} onChange={(e) => setRelationshipForm({ ...relationshipForm, status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></div><label>Description<textarea rows={5} value={relationshipForm.description} onChange={(e) => setRelationshipForm({ ...relationshipForm, description: e.target.value })}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={closeRelationshipForm}>Cancel</button><button className="primary" disabled={busy || !parentCi || !childCi}>{busy ? "Saving..." : "Save"}</button></div></div></form>
  </section>;
  return <section className="cmdb-workspace">
    <header><div><p className="eyebrow">CMDB</p><h1>Configuration Management Database</h1><p>Manage configuration items, dependencies, and bulk CI onboarding.</p></div>{canManage && tab === "items" && <button className="primary compact" onClick={startCreate}>Create CI</button>}{canManage && tab === "relationships" && <button className="primary compact" onClick={() => startRelationship()}>Add Relationship</button>}</header>
    {error && <div className="error">{error}</div>}{success && <div className="success">{success}</div>}
    <div className="record-tabs"><button className={tab === "items" ? "active" : ""} onClick={() => setTab("items")}>Configuration Items</button><button className={tab === "relationships" ? "active" : ""} onClick={() => setTab("relationships")}>Relationships</button>{canImport && <button className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>Import</button>}</div>
    {tab === "items" && <div className="table-card"><div className="table-head"><div><h2>Configuration Items</h2><p>{loading ? "Loading CMDB…" : `${items.length} item(s) shown`}</p></div><div className="queue-filters"><input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search CI"/><select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setTypeId(""); }}><option value="">All categories</option>{lookups.categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={typeId} onChange={(e) => setTypeId(e.target.value)}><option value="">All types</option>{itemFilterTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={statusId} onChange={(e) => setStatusId(e.target.value)}><option value="">All statuses</option>{lookups.statuses.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div></div>{showCreate && <form className="cmdb-inline-form" onSubmit={saveCi}><div className="inline-head"><div><p className="eyebrow">CMDB</p><h3>{editing ? "Edit CI" : "Create CI"}</h3></div><button type="button" className="secondary small" onClick={() => setShowCreate(false)}>Cancel</button></div><div className="form-grid"><label>CI Number<input value={ciForm.ciNumber} onChange={(e) => setCiForm({ ...ciForm, ciNumber: e.target.value })} placeholder="Optional; auto-generated if empty"/></label><label>Name<input required value={ciForm.name} onChange={(e) => setCiForm({ ...ciForm, name: e.target.value })}/></label><label>Category<select required value={ciForm.categoryId} onChange={(e) => { const nextCategoryId = e.target.value; const nextTypeId = lookups.types.find((type) => type.categoryId === nextCategoryId)?.id || ""; setCiForm({ ...ciForm, categoryId: nextCategoryId, typeId: nextTypeId }); }}>{lookups.categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Type<select required value={ciForm.typeId} onChange={(e) => setCiForm({ ...ciForm, typeId: e.target.value })}>{formTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Status<select required value={ciForm.statusId} onChange={(e) => setCiForm({ ...ciForm, statusId: e.target.value })}>{lookups.statuses.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Criticality<select value={ciForm.criticality} onChange={(e) => setCiForm({ ...ciForm, criticality: e.target.value })}>{["LOW","MEDIUM","HIGH","CRITICAL"].map((x) => <option key={x}>{x}</option>)}</select></label><label>Environment<input value={ciForm.environment} onChange={(e) => setCiForm({ ...ciForm, environment: e.target.value })} placeholder="Production, UAT, Dev..."/></label></div><UserSearchPicker token={token} label="Owner" selected={ownerUser} onSelect={setOwnerUser}/><label>Description<textarea rows={3} value={ciForm.description} onChange={(e) => setCiForm({ ...ciForm, description: e.target.value })}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Saving..." : "Save"}</button></div></form>}{items.length === 0 ? <div className="empty"><b>No configuration items found</b><span>Create a CI or adjust filters.</span></div> : <div className="table-wrap"><table><thead><tr><th>CI</th><th>Category</th><th>Type</th><th>Status</th><th>Owner</th><th>Criticality</th><th>Relationships</th><th>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><button className="ticket-link" onClick={() => openDetail(item.id)}>{item.ciNumber || item.name}</button><small>{item.ciNumber ? item.name : item.description || "Configuration item"}</small></td><td>{item.category?.name || "Uncategorized"}</td><td>{item.type?.name || item.ciType || "Unknown"}</td><td><span className={`badge ${(item.status?.name || "unknown").toLowerCase()}`}>{item.status?.name || "Unknown"}</span></td><td>{item.owner?.name || <span className="muted">Unassigned</span>}</td><td>{item.criticality || "MEDIUM"}</td><td>{item.relationshipCount || 0}</td><td>{canManage && <button className="secondary small" onClick={() => startEdit(item)}>Edit</button>}</td></tr>)}</tbody></table></div>}</div>}
    {tab === "relationships" && <div className="table-card"><div className="table-head"><div><h2>Relationships</h2><p>Parent-child CI dependencies, ready for future graph views.</p></div><div className="queue-filters"><input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search CI"/><select value={relationshipTypeId} onChange={(e) => setRelationshipTypeId(e.target.value)}><option value="">All relationship types</option>{lookups.relationshipTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={relationshipStatus} onChange={(e) => setRelationshipStatus(e.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select><select value={relationshipSide} onChange={(e) => setRelationshipSide(e.target.value)}><option value="all">Parent or child</option><option value="parent">Parent only</option><option value="child">Child only</option></select></div></div>{showRelationship && <form className="cmdb-inline-form" onSubmit={saveRelationship}><div className="inline-head"><div><p className="eyebrow">CMDB Relationship</p><h3>{editingRelationship ? "Edit Relationship" : "Add Relationship"}</h3></div><button type="button" className="secondary small" onClick={() => setShowRelationship(false)}>Cancel</button></div><div className="form-grid"><label>Parent CI<select required value={relationshipForm.parentCiId} onChange={(e) => setRelationshipForm({ ...relationshipForm, parentCiId: e.target.value })}><option value="">Select parent CI</option>{ciOptions}</select></label><label>Relationship Type<select required value={relationshipForm.relationshipTypeId} onChange={(e) => setRelationshipForm({ ...relationshipForm, relationshipTypeId: e.target.value })}>{lookups.relationshipTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Child CI<select required value={relationshipForm.childCiId} onChange={(e) => setRelationshipForm({ ...relationshipForm, childCiId: e.target.value })}><option value="">Select child CI</option>{ciOptions}</select></label><label>Status<select value={relationshipForm.status} onChange={(e) => setRelationshipForm({ ...relationshipForm, status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></div><label>Description<textarea rows={3} value={relationshipForm.description} onChange={(e) => setRelationshipForm({ ...relationshipForm, description: e.target.value })}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowRelationship(false)}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Saving..." : "Save"}</button></div></form>}{relationships.length === 0 ? <div className="empty"><b>No relationships found</b><span>Add a relationship between two CIs.</span></div> : <div className="table-wrap"><table><thead><tr><th>Parent CI</th><th>Relationship Type</th><th>Child CI</th><th>Status</th><th>Created By</th><th>Updated At</th><th>Actions</th></tr></thead><tbody>{relationships.map((row) => <tr key={row.id}><td>{row.parentCi.ciNumber ? `${row.parentCi.ciNumber} - ` : ""}{row.parentCi.name}</td><td>{row.relationshipType.name}</td><td>{row.childCi.ciNumber ? `${row.childCi.ciNumber} - ` : ""}{row.childCi.name}</td><td><span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span></td><td>{row.createdBy.name}</td><td>{new Date(row.updatedAt).toLocaleString()}</td><td>{canManage && <><button className="secondary small" onClick={() => startRelationship(row)}>Edit</button><button className="secondary small danger" onClick={() => deleteRelationship(row.id)}>Delete</button></>}</td></tr>)}</tbody></table></div>}</div>}
    {tab === "import" && canImport && <div className="detail-section"><h2>Import Configuration Items</h2><p className="muted">Upload CSV with: name, ci_number, category, type, status, environment, criticality, owner_email, description.</p><label className="attachment-upload">Upload CSV<input type="file" accept=".csv,text/csv" disabled={busy} onChange={(e) => { void previewFile(e.target.files?.[0]); e.target.value = ""; }}/></label>{preview && <div className="import-summary"><div className="stats"><article><span>Total rows</span><strong>{preview.totalRows}</strong></article><article><span>Valid rows</span><strong>{preview.validRows}</strong></article><article><span>Failed rows</span><strong>{preview.failedRows}</strong></article><article><span>Created</span><strong>{preview.createdRecords ?? 0}</strong></article></div>{preview.errors.length > 0 && <div className="admin-list"><h3>Import errors</h3>{preview.errors.slice(0, 50).map((item, index) => <article key={`${item.rowNumber}-${index}`}><b>Row {item.rowNumber}</b><small>{item.reason}</small></article>)}</div>}<button className="primary" disabled={busy || preview.validRows === 0} onClick={confirmImport}>Confirm import valid rows</button></div>}</div>}
    {selected && <div className="modal-backdrop"><section className="record-form-modal"><div className="modal-head"><div><p className="eyebrow">{selected.ciNumber || "CI"}</p><h2>{selected.name}</h2></div><button className="icon-button" onClick={() => setSelected(null)}>×</button></div><div className="record-two-column"><div className="detail-section compact-fields"><h3>Basic details</h3><dl><dt>Category</dt><dd>{selected.category?.name || "Uncategorized"}</dd><dt>Type</dt><dd>{selected.type?.name || selected.ciType || "Unknown"}</dd><dt>Status</dt><dd>{selected.status?.name || "Unknown"}</dd><dt>Owner</dt><dd>{selected.owner?.name || "Unassigned"}</dd><dt>Environment</dt><dd>{selected.environment || "Not set"}</dd><dt>Criticality</dt><dd>{selected.criticality || "MEDIUM"}</dd><dt>Description</dt><dd>{selected.description || "No description"}</dd></dl>{canManage && <div className="modal-actions"><button className="secondary" onClick={() => startEdit(selected)}>Edit</button><button className="secondary danger" onClick={() => deactivateCi(selected.id)}>Deactivate</button></div>}</div><div className="detail-section compact-fields"><h3>Relationship summary</h3><dl><dt>Parents</dt><dd>{selected.parents?.length || 0}</dd><dt>Children</dt><dd>{selected.children?.length || 0}</dd><dt>Open relationship count</dt><dd>{selected.openRelationshipCount || 0}</dd></dl></div></div><div className="record-tabs"><button>Parents</button><button>Children</button><button>Related Incidents</button><button>Related Problems</button><button>Related Changes</button></div><div className="related-list">{[...(selected.parents || []).map((r) => ({ label: `Parent: ${r.ci.name}`, meta: r.relationshipType, id: r.id })), ...(selected.children || []).map((r) => ({ label: `Child: ${r.ci.name}`, meta: r.relationshipType, id: r.id }))].map((item) => <article key={item.id}><span>{item.label}</span><small>{item.meta}</small></article>)}{["INCIDENT", "PROBLEM", "CHANGE"].flatMap((type) => ((type === "INCIDENT" ? selected.relatedIncidents : type === "PROBLEM" ? selected.relatedProblems : selected.relatedChanges) || []).map((ticket) => <article key={ticket.id}><button className="link-button task-number-link" onClick={() => onOpenTicket(type as "INCIDENT" | "PROBLEM" | "CHANGE", ticket.id)}>{ticket.ticketNumber}</button><span>{ticket.title}</span><span className="badge">{ticket.status}</span><small>{ticket.assignmentGroup?.name || "Unassigned"}</small></article>))}</div></section></div>}
  </section>;
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
  const [selectedRequestTask, setSelectedRequestTask] = useState<{ request: Incident; task: RequestTask } | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Incident | null>(null);
  const [selectedProblemTask, setSelectedProblemTask] = useState<{ problem: Incident; task: ProblemTask } | null>(null);
  const [selectedChange, setSelectedChange] = useState<Incident | null>(null);
  const [activeModule, setActiveModule] = useState<"INCIDENTS" | "REQUESTS" | "APPROVALS" | "PROBLEMS" | "CHANGES" | "CMDB" | "KNOWLEDGE">(() => {
    const saved = localStorage.getItem(modulePreferenceKey);
    return saved === "REQUESTS" || saved === "APPROVALS" || saved === "PROBLEMS" || saved === "CHANGES" || saved === "CMDB" || saved === "KNOWLEDGE" ? saved : "INCIDENTS";
  });
  const canOperate = session.user.roles.some((role) =>
    ["IT_AGENT", "IT_SERVICE_MANAGER", "ADMIN"].includes(role),
  );
  const isCoreServiceRole = session.user.roles.some((role) => ["IT_AGENT", "IT_SERVICE_MANAGER", "ADMIN"].includes(role));
  const isEmployee = !canOperate;
  const isAdmin = session.user.roles.includes("ADMIN");
  const canReopenProblem = isAdmin || session.user.roles.includes("IT_SERVICE_MANAGER");
  const canReopenChange = isAdmin || session.user.roles.includes("IT_SERVICE_MANAGER");
  const [groups, setGroups] = useState<AssignmentGroup[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [queueScope, setQueueScope] = useState<"MY_GROUPS" | "ALL">(() => session.user.roles.some((role) => ["IT_AGENT", "IT_SERVICE_MANAGER", "ADMIN"].includes(role)) ? "ALL" : "MY_GROUPS");
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
    if (isEmployee && (activeModule === "CMDB" || activeModule === "KNOWLEDGE")) setActiveModule("INCIDENTS");
  }, [isEmployee, activeModule]);
  useEffect(() => {
    if (!isEmployee)
      api
        .assignmentGroups(session.accessToken)
        .then(setGroups)
        .catch(() => setGroups([]));
  }, [isEmployee, session.accessToken]);
  const myGroupIds = useMemo(() => groups.filter((group) => group.members.some((member) => member.user.id === session.user.id)).map((group) => group.id), [groups, session.user.id]);
  const matchesQueueScope = (ticket: Incident) => queueScope === "ALL" || (ticket.assignmentGroup?.id ? myGroupIds.includes(ticket.assignmentGroup.id) : false);
  const scopedIncidents = useMemo(() => incidents.filter(matchesQueueScope), [incidents, queueScope, myGroupIds]);
  const scopedRequests = useMemo(() => serviceRequests.filter(matchesQueueScope), [serviceRequests, queueScope, myGroupIds]);
  const scopedProblems = useMemo(() => problems.filter(matchesQueueScope), [problems, queueScope, myGroupIds]);
  const scopedChanges = useMemo(() => changes.filter(matchesQueueScope), [changes, queueScope, myGroupIds]);
  const ongoingIncidents = useMemo(() => scopedIncidents.filter(isOngoingTicket), [scopedIncidents]);
  const ongoingRequests = useMemo(() => scopedRequests.filter(isOngoingTicket), [scopedRequests]);
  const ongoingProblems = useMemo(() => scopedProblems.filter(isOngoingTicket), [scopedProblems]);
  const ongoingChanges = useMemo(() => scopedChanges.filter(isOngoingChange), [scopedChanges]);
  const stats = useMemo(
    () => ({
      open: ongoingIncidents.filter((i) => i.status?.name === "OPEN").length,
      active: ongoingIncidents.filter((i) => i.status?.name === "IN_PROGRESS").length,
      critical: ongoingIncidents.filter((i) => i.priority?.name === "CRITICAL").length,
      total: ongoingIncidents.length,
    }),
    [ongoingIncidents],
  );
  const requestStats = useMemo(
    () => ({
      open: ongoingRequests.length,
      inProgress: ongoingRequests.filter((i) => i.status?.name === "IN_PROGRESS").length,
      total: ongoingRequests.length,
      catalogItems: catalog.reduce((total, category) => total + category.items.length, 0),
    }),
    [catalog, ongoingRequests],
  );
  const problemStats = useMemo(
    () => ({
      open: ongoingProblems.length,
      inProgress: ongoingProblems.filter((i) => ["ASSESS", "ROOT_CAUSE_ANALYSIS", "FIX"].includes(i.status?.name || "")).length,
      knownErrors: ongoingProblems.filter((i) => i.problem?.knownError).length,
      total: ongoingProblems.length,
    }),
    [ongoingProblems],
  );
  const visibleIncidents = useMemo(
    () =>
      scopedIncidents.filter((incident) => {
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
    [scopedIncidents, search, statusFilter],
  );
  const visibleServiceRequests = useMemo(
    () =>
      scopedRequests.filter((request) => {
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
    [scopedRequests, search, statusFilter],
  );
  const visibleRequestTaskItems = useMemo<RequestQueueItem[]>(
    () =>
      scopedRequests.flatMap((request) =>
        (request.serviceRequest?.tasks || [])
          .filter((task) => {
            const term = search.toLowerCase();
            const matchesText =
              !term ||
              task.taskNumber.toLowerCase().includes(term) ||
              task.title.toLowerCase().includes(term) ||
              task.description?.toLowerCase().includes(term) ||
              request.ticketNumber.toLowerCase().includes(term);
            const matchesStatus =
              statusFilter === "ALL" || task.status === statusFilter;
            return matchesText && matchesStatus;
          })
          .map((task) => ({ kind: "request-task" as const, ticket: request, task })),
      ),
    [scopedRequests, search, statusFilter],
  );
  const visibleProblems = useMemo(
    () =>
      scopedProblems.filter((problem) => {
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
    [scopedProblems, search, statusFilter],
  );
  const visibleChanges = useMemo(
    () =>
      scopedChanges.filter((change) => {
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
    [scopedChanges, search, statusFilter],
  );
  const changeStats = useMemo(
    () => ({
      open: ongoingChanges.filter((i) => i.status?.name === "NEW").length,
      inProgress: ongoingChanges.filter((i) => ["PLAN", "APPROVAL", "CAB", "SCHEDULED", "IMPLEMENT", "VALIDATE"].includes(i.status?.name || "")).length,
      highRisk: ongoingChanges.filter((i) => ["HIGH", "CRITICAL"].includes(i.change?.risk || "")).length,
      total: ongoingChanges.length,
    }),
    [ongoingChanges],
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
  const requestQueueItems = useMemo<RequestQueueItem[]>(() => [...visibleServiceRequests.map((ticket) => ({ kind: "request" as const, ticket })), ...visibleRequestTaskItems], [visibleServiceRequests, visibleRequestTaskItems]);
  const queueItems = activeModule === "REQUESTS" ? requestQueueItems : activeModule === "APPROVALS" ? visibleApprovalRequests : activeModule === "PROBLEMS" ? visibleProblems : activeModule === "CHANGES" ? visibleChanges : visibleIncidents;
  const openModule = (module: "INCIDENTS" | "REQUESTS" | "APPROVALS" | "PROBLEMS" | "CHANGES" | "CMDB" | "KNOWLEDGE") => {
    setSelected(null);
    setSelectedRequest(null);
    setSelectedRequestTask(null);
    setSelectedProblem(null);
    setSelectedProblemTask(null);
    setSelectedChange(null);
    setCreating(false);
    setCreatingRequest(false);
    setCreatingProblem(false);
    setCreatingChange(false);
    setActiveModule(module);
  };
  return (
    <div className="app-shell">
      <aside>
        <Brand branding={branding} />
        <nav>
          <a className={activeModule === "INCIDENTS" ? "active" : ""} onClick={() => openModule("INCIDENTS")}>
            ▦ <span>Incidents</span>
          </a>
          <a className={activeModule === "REQUESTS" ? "active" : ""} onClick={() => openModule("REQUESTS")}>
            ⌁ <span>Service requests</span>
          </a>
          <a className={activeModule === "APPROVALS" ? "active" : ""} onClick={() => openModule("APPROVALS")}>
            ↗ <span>Approvals</span>
          </a>
          <a className={activeModule === "PROBLEMS" ? "active" : ""} onClick={() => openModule("PROBLEMS")}>
            ◇ <span>Problems</span>
          </a>
          <a
            className={activeModule === "CHANGES" ? "active" : ""}
            onClick={() => openModule("CHANGES")}
          >
            ⇄ <span>Changes</span>
          </a>
          {!isEmployee && <a className={activeModule === "CMDB" ? "active" : ""} onClick={() => openModule("CMDB")}>
            ◫ <span>CMDB</span>
          </a>}
          {!isEmployee && <a className={activeModule === "KNOWLEDGE" ? "active" : ""} onClick={() => openModule("KNOWLEDGE")}>
            □ <span>Knowledge</span>
          </a>}
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
        {selected ? (
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
        ) : selectedRequest ? (
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
            onOpenTask={(task) => {
              setSelectedRequestTask({ request: selectedRequest, task });
              setSelectedRequest(null);
            }}
          />
        ) : selectedRequestTask ? (
          <RequestTaskDetail
            task={selectedRequestTask.task}
            request={selectedRequestTask.request}
            token={session.accessToken}
            canEdit={canOperate}
            groups={groups}
            onClose={() => setSelectedRequestTask(null)}
            onOpenRequest={() => {
              setSelectedRequest(selectedRequestTask.request);
              setSelectedRequestTask(null);
            }}
            onUpdated={(updated) => {
              setSelectedRequestTask((current) => {
                const nextTask = updated.serviceRequest?.tasks?.find((task) => task.id === current?.task.id) || current?.task;
                return nextTask ? { request: updated, task: nextTask } : null;
              });
              setServiceRequests((items) =>
                items.map((item) => (item.id === updated.id ? updated : item)),
              );
            }}
          />
        ) : selectedProblemTask ? (
          <ProblemTaskDetail
            task={selectedProblemTask.task}
            problem={selectedProblemTask.problem}
            token={session.accessToken}
            canEdit={canOperate}
            groups={groups}
            onClose={() => setSelectedProblemTask(null)}
            onBackToProblem={() => {
              setSelectedProblem(selectedProblemTask.problem);
              setSelectedProblemTask(null);
            }}
            onUpdated={(updated) => {
              setSelectedProblemTask((current) => {
                const nextTask = updated.problem?.tasks?.find((task) => task.id === current?.task.id) || current?.task;
                return nextTask ? { problem: updated, task: nextTask } : null;
              });
              setProblems((items) =>
                items.map((item) => (item.id === updated.id ? updated : item)),
              );
            }}
          />
        ) : selectedProblem ? (
          <ProblemDetail
            problem={selectedProblem}
            token={session.accessToken}
            canEdit={canOperate}
            canReopen={canReopenProblem}
            groups={groups}
            onClose={() => setSelectedProblem(null)}
            onUpdated={(updated) => {
              setSelectedProblem(updated);
              setProblems((items) =>
                items.map((item) => (item.id === updated.id ? updated : item)),
              );
            }}
            onOpenTask={(task) => {
              setSelectedProblemTask({ problem: selectedProblem, task });
              setSelectedProblem(null);
            }}
            onOpenIncident={(ticketId) => {
              const incident = incidents.find((item) => item.id === ticketId);
              if (incident) {
                setSelected(incident);
                setSelectedProblem(null);
              }
            }}
          />
        ) : selectedChange ? (
          <ChangeDetail
            change={selectedChange}
            token={session.accessToken}
            canEdit={canOperate}
            canReopen={canReopenChange}
            groups={groups}
            onClose={() => setSelectedChange(null)}
            onUpdated={(updated) => {
              setSelectedChange(updated);
              setChanges((items) =>
                items.map((item) => (item.id === updated.id ? updated : item)),
              );
            }}
          />
        ) : activeModule === "KNOWLEDGE" ? (
          <KnowledgeModule token={session.accessToken} user={session.user} />
        ) : activeModule === "CMDB" ? (
          <CmdbModule
            token={session.accessToken}
            user={session.user}
            onOpenTicket={(type, id) => {
              if (type === "INCIDENT") {
                const incident = incidents.find((item) => item.id === id);
                if (incident) setSelected(incident);
              } else if (type === "PROBLEM") {
                const problem = problems.find((item) => item.id === id);
                if (problem) setSelectedProblem(problem);
              } else {
                const change = changes.find((item) => item.id === id);
                if (change) setSelectedChange(change);
              }
            }}
          />
        ) : (
          <>
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
            {activeModule === "REQUESTS" ? "New request" : activeModule === "PROBLEMS" ? "New problem" : activeModule === "CHANGES" ? "New change" : "New incident"}
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
            <strong>{activeModule === "REQUESTS" ? requestStats.total : activeModule === "APPROVALS" ? approvalRequests.length : activeModule === "PROBLEMS" ? problemStats.total : activeModule === "CHANGES" ? changeStats.total : stats.total}</strong>
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
              {!isCoreServiceRole && (
                <select value={queueScope} onChange={(e) => setQueueScope(e.target.value as "MY_GROUPS" | "ALL")}>
                  <option value="MY_GROUPS">My group queue</option>
                  <option value="ALL">All tickets</option>
                </select>
              )}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All statuses</option>
                {(activeModule === "PROBLEMS" ? problemStatusOptions : activeModule === "CHANGES" ? changeStatusOptions : [
                  "OPEN",
                  "IN_PROGRESS",
                  "AWAITING_CUSTOMER",
                  "RESOLVED",
                  "CLOSED",
                ]).map((value) => (
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
                  {queueItems.map((item) => {
                    const isRequestTask = activeModule === "REQUESTS" && "kind" in item && item.kind === "request-task";
                    const ticket = activeModule === "REQUESTS" && "kind" in item ? item.ticket : item as Incident;
                    const task = isRequestTask ? item.task : null;
                    const number = task?.taskNumber || ticket.ticketNumber;
                    const statusName = task?.status || ticket.status?.name || "OPEN";
                    const assigneeName = task?.assignedTo?.name || ticket.assignedTo?.name;
                    return (
                      <tr key={isRequestTask ? task!.id : ticket.id} className={isRequestTask ? "task-queue-row" : ""}>
                        <td>
                          <button
                            className="ticket-link"
                            onClick={() => isRequestTask ? setSelectedRequestTask({ request: ticket, task: task! }) : activeModule === "REQUESTS" || activeModule === "APPROVALS" ? setSelectedRequest(ticket) : activeModule === "PROBLEMS" ? setSelectedProblem(ticket) : activeModule === "CHANGES" ? setSelectedChange(ticket) : setSelected(ticket)}
                          >
                            {number}
                          </button>
                        </td>
                        <td>
                          <strong>{task?.title || ticket.title}</strong>
                          <small>
                            {isRequestTask ? `${task?.description || "Request task"} - Parent ${ticket.ticketNumber}` : activeModule === "REQUESTS" || activeModule === "APPROVALS" ? ticket.serviceRequest?.catalogItem?.name || "Service request" : activeModule === "PROBLEMS" ? ticket.problem?.knownError ? "Known error" : "Root cause investigation" : activeModule === "CHANGES" ? `${ticket.change?.changeType || "NORMAL"} change - ${ticket.change?.risk || "MEDIUM"} risk` : ticket.incident?.affectedService || "General service"}
                          </small>
                        </td>
                        <td><span className={`badge ${statusName.toLowerCase()}`}>{statusName.replaceAll("_", " ")}</span></td>
                        <td><span className={`priority priority-pill ${ticket.priority?.name.toLowerCase()}`}>{ticket.priority?.name || "MEDIUM"}</span></td>
                        <td>{assigneeName || <span className="muted">Unassigned</span>}</td>
                        <td>{new Date(task?.createdAt || ticket.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
          </>
        )}
      </main>
      {creating && (
        <CreateIncident
          token={session.accessToken}
          currentUser={session.user}
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
          currentUser={session.user}
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
  const employeeOnly = session ? !session.user.roles.some((role) => ["IT_AGENT", "IT_SERVICE_MANAGER", "ADMIN"].includes(role)) : false;
  return session
    ? employeeOnly
      ? <ServicePortal session={session} onLogout={logout} branding={branding} />
      : <Dashboard session={session} onLogout={logout} branding={branding} themePreference={themePreference} onThemePreferenceChange={setThemePreference} />
    : <Login onLogin={login} branding={branding} />;
}
