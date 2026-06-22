import { FormEvent, useEffect, useState } from "react";
import { api } from "./api";
import type {
  AdminGroup,
  AdminUser,
  OrganizationSettings,
  ReferenceData,
  SlaDefinition,
} from "./types";
import { rawTimeZones } from "@vvo/tzdb";

const emptyReference: ReferenceData = {
  roles: [],
  departments: [],
  priorities: [],
  ticketTypes: [],
  calendars: [],
};
const timezones = rawTimeZones.map((zone) => zone.name);
const defaultSettings: OrganizationSettings = {
  organizationName: "",
  branding: {
    primaryColor: "#16a394",
    accentColor: "#6ee7b7",
    portalTitle: "Nextris Sevā",
    welcomeMessage: "How can we help?",
    timezone: "Asia/Kolkata",
    showPoweredBy: true,
    themeMode: "DARK",
  },
  attachments: {
    enabled: false,
    provider: "NONE",
    bucket: "",
    region: "",
    endpoint: "",
    maxFileSizeMb: 10,
  },
};

function CalendarEditor({
  token,
  onCreated,
}: {
  token: string;
  onCreated: () => Promise<void>;
}) {
  const allDays = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];
  const [name, setName] = useState("Business Hours");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [days, setDays] = useState(allDays.slice(0, 5));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [holidays, setHolidays] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    const weeklySchedule = Object.fromEntries(
      days.map((day) => [day, [{ start, end }]]),
    );
    setBusy(true);
    try {
      await api.createBusinessCalendar(token, {
        name,
        timezone,
        calendarType: "BUSINESS_HOURS",
        weeklySchedule,
        holidays: holidays
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      });
      await onCreated();
      setName("Business Hours");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="calendar-editor">
      <h2>Business Calendar Editor</h2>
      <p className="muted">
        Configure working days, hours, timezone, and holiday dates.
      </p>
      <div className="calendar-fields">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Timezone
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {timezones.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Start
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          End
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>
      <div className="day-picker">
        {allDays.map((day) => (
          <label key={day}>
            <input
              type="checkbox"
              checked={days.includes(day)}
              onChange={() =>
                setDays((current) =>
                  current.includes(day)
                    ? current.filter((value) => value !== day)
                    : [...current, day],
                )
              }
            />
            {day.slice(0, 3)}
          </label>
        ))}
      </div>
      <label className="holiday-field">
        Holidays{" "}
        <small>Comma-separated dates, e.g. 2026-08-15, 2026-10-02</small>
        <input
          value={holidays}
          onChange={(e) => setHolidays(e.target.value)}
          placeholder="YYYY-MM-DD"
        />
      </label>
      <button
        className="primary"
        onClick={save}
        disabled={busy || !name || days.length === 0 || start >= end}
      >
        Create business calendar
      </button>
    </div>
  );
}

export default function AdminConsole({
  token,
  onClose,
}: {
  token: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"users" | "groups" | "slas" | "settings">(
    "users",
  );
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [slas, setSlas] = useState<SlaDefinition[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [reference, setReference] = useState(emptyReference);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [groupPage, setGroupPage] = useState(1);
  const [groupTotalPages, setGroupTotalPages] = useState(1);
  const [groupTotal, setGroupTotal] = useState(0);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupActive, setGroupActive] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [storageTested, setStorageTested] = useState(false);
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
  const [calendarName, setCalendarName] = useState("Standard Business Hours");
  const [calendarTimezone, setCalendarTimezone] = useState("Asia/Kolkata");
  async function load() {
    try {
      const [u, g, r, s, o] = await Promise.all([
        api.adminUsers(token, page, search),
        api.adminGroups(token, groupPage, groupSearch, groupActive),
        api.adminReferenceData(token),
        api.adminSlas(token),
        api.organizationSettings(token),
      ]);
      setUsers(u.data);
      setTotal(u.total);
      setTotalPages(u.totalPages);
      setGroups(g.data);
      setGroupTotal(g.total);
      setGroupTotalPages(g.totalPages);
      setReference(r);
      setSlas(s);
      setSettings({
        organizationName: o.organizationName,
        branding: { ...defaultSettings.branding, ...o.branding },
        attachments: { ...defaultSettings.attachments, ...o.attachments },
      });
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
  }, [token, page, search, groupPage, groupSearch, groupActive]);
  const effectiveRoles = (user: AdminUser) => [
    ...new Set([
      "EMPLOYEE",
      ...user.directRoles.map((x) => x.role.name),
      ...user.assignmentGroupMemberships.flatMap((m) =>
        m.assignmentGroup.roles.map((x) => x.role.name),
      ),
    ]),
  ];
  async function createUser(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }
  async function createGroup(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createAdminGroup(token, newGroup);
      setNewGroup({ name: "", description: "" });
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function createSla(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createAdminSla(token, {
        ...newSla,
        priorityId: newSla.priorityId || undefined,
        ticketTypeId: newSla.ticketTypeId || undefined,
      });
      setNewSla((v) => ({ ...v, name: "" }));
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function createCalendar() {
    const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    const weeklySchedule = Object.fromEntries(
      weekdays.map((day) => [day, [{ start: "09:00", end: "17:00" }]]),
    );
    setBusy(true);
    try {
      await api.createBusinessCalendar(token, {
        name: calendarName,
        timezone: calendarTimezone,
        calendarType: "BUSINESS_HOURS",
        weeklySchedule,
        holidays: [],
      });
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await api.updateOrganizationSettings(token, {
        organizationName: settings.organizationName,
        primaryColor: settings.branding.primaryColor,
        accentColor: settings.branding.accentColor,
        portalTitle: settings.branding.portalTitle,
        welcomeMessage: settings.branding.welcomeMessage,
        supportEmail: settings.branding.supportEmail,
        supportPhone: settings.branding.supportPhone,
        timezone: settings.branding.timezone,
        showPoweredBy: settings.branding.showPoweredBy,
        themeMode: settings.branding.themeMode,
        attachmentsEnabled: settings.attachments.enabled,
        storageProvider: settings.attachments.provider,
        storageBucket: settings.attachments.bucket,
        storageRegion: settings.attachments.region,
        storageEndpoint: settings.attachments.endpoint,
        maxFileSizeMb: settings.attachments.maxFileSizeMb,
      });
      const theme = settings.branding.themeMode === "SYSTEM" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : settings.branding.themeMode?.toLowerCase() || "dark";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.setProperty("--brand-primary", settings.branding.primaryColor || "#16a394");
      document.documentElement.style.setProperty("--brand-accent", settings.branding.accentColor || "#6ee7b7");
      document.title = settings.branding.portalTitle || settings.organizationName || "Nextris Sevā";
      setSaved("Organisation settings saved.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save settings",
      );
    } finally {
      setBusy(false);
    }
  }
  async function uploadBrandAsset(kind: 'logo'|'favicon', file?: File) {
    if(!file)return;setBusy(true);setError('');setSaved('');
    try { const asset=await api.uploadBrandAsset(token,kind,file);setSettings(current=>({...current,branding:{...current.branding,[`${kind}Url`]:asset.url}}));setSaved(`${kind==='logo'?'Logo':'Favicon'} uploaded. Refresh the application to apply it everywhere.`); }
    catch(reason){setError(reason instanceof Error?reason.message:'Could not upload branding asset')}
    finally{setBusy(false)}
  }
  async function removeBrandAsset(kind:'logo'|'favicon') { setBusy(true);setError('');setSaved('');try{await api.removeBrandAsset(token,kind);setSettings(current=>({...current,branding:{...current.branding,[`${kind}Url`]:''}}));setSaved(`${kind==='logo'?'Logo':'Favicon'} removed.`)}catch(reason){setError(reason instanceof Error?reason.message:'Could not remove branding asset')}finally{setBusy(false)} }
  async function testStorage() {
    setBusy(true); setError(""); setSaved(""); setStorageTested(false);
    try {
      await api.testStorageConnection(token, { provider: settings.attachments.provider, bucket: settings.attachments.bucket, region: settings.attachments.region, endpoint: settings.attachments.endpoint });
      setStorageTested(true); setSaved("Storage connection successful. You can now enable attachments.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Storage connection failed"); }
    finally { setBusy(false); }
  }
  return (
    <div className="admin-overlay">
      <section className="admin-console">
        <header>
          <div>
            <p className="eyebrow">PLATFORM ADMINISTRATION</p>
            <h1>Admin Console</h1>
            <p>
              Manage people, resolver teams, service targets, and tenant
              configuration.
            </p>
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
          <button
            className={tab === "settings" ? "active" : ""}
            onClick={() => setTab("settings")}
          >
            Branding & Storage
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        {saved && <div className="success">{saved}</div>}
        {tab === "users" && (
          <div className="admin-grid">
            <form className="admin-form" onSubmit={createUser}>
              <h2>Add user</h2>
              <p className="muted">
                Employee access is automatic; elevated access comes from groups.
              </p>
              <label>
                Name
                <input
                  required
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
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
                  {reference.departments.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Temporary password
                <input
                  required
                  minLength={8}
                  type="password"
                  value={newUser.temporaryPassword}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      temporaryPassword: e.target.value,
                    })
                  }
                />
              </label>
              <button className="primary" disabled={busy}>
                Create user
              </button>
            </form>
            <div className="admin-list">
              <div className="admin-list-head">
                <h2>
                  Users <span>{total}</span>
                </h2>
                <input
                  placeholder="Search name or email"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              {users.map((u) => (
                <article key={u.id}>
                  <div className="avatar">
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <b>{u.name}</b>
                    <small>{u.email}</small>
                  </div>
                  <span className="role-pill">
                    {effectiveRoles(u).join(", ")}
                  </span>
                  <button
                    className="secondary small"
                    onClick={async () => {
                      await api.updateAdminUser(token, u.id, {
                        active: !u.active,
                      });
                      await load();
                    }}
                  >
                    {u.active ? "Deactivate" : "Activate"}
                  </button>
                </article>
              ))}
              <div className="pagination">
                <button
                  className="secondary small"
                  disabled={page <= 1}
                  onClick={() => setPage((v) => v - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="secondary small"
                  disabled={page >= totalPages}
                  onClick={() => setPage((v) => v + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        {tab === "groups" && (
          <div className="admin-grid">
            <form className="admin-form" onSubmit={createGroup}>
              <h2>Add assignment group</h2>
              <label>
                Name
                <input
                  required
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
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
              <button className="primary">Create group</button>
            </form>
            <div className="admin-list">
              <div className="admin-list-head">
                <h2>
                  Assignment Groups <span>{groupTotal}</span>
                </h2>
                <div className="admin-list-filters">
                  <input
                    placeholder="Search groups"
                    value={groupSearch}
                    onChange={(e) => {
                      setGroupSearch(e.target.value);
                      setGroupPage(1);
                    }}
                  />
                  <select
                    value={groupActive}
                    onChange={(e) => {
                      setGroupActive(e.target.value);
                      setGroupPage(1);
                    }}
                  >
                    <option value="all">All groups</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              {groups.length === 0 && (
                <p className="muted">
                  No assignment groups match these filters.
                </p>
              )}
              {groups.map((g) => (
                <article className="group-card" key={g.id}>
                  <b>{g.name}</b>
                  <small>{g.description || "No description"}</small>
                  <div className="member-list role-list">
                    {g.roles.map((x) => (
                      <span key={x.role.id}>
                        {x.role.name}
                        <button
                          onClick={async () => {
                            await api.removeGroupRole(token, g.id, x.role.id);
                            await load();
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    defaultValue=""
                    onChange={async (e) => {
                      if (e.target.value)
                        await api.addGroupRole(token, g.id, e.target.value);
                      e.target.value = "";
                      await load();
                    }}
                  >
                    <option value="">Grant role…</option>
                    {reference.roles
                      .filter(
                        (r) =>
                          r.name !== "EMPLOYEE" &&
                          !g.roles.some((x) => x.role.id === r.id),
                      )
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                  <div className="member-list">
                    {g.members.map((x) => (
                      <span key={x.user.id}>
                        {x.user.name}
                        <button
                          onClick={async () => {
                            await api.removeGroupMember(token, g.id, x.user.id);
                            await load();
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    defaultValue=""
                    onChange={async (e) => {
                      if (e.target.value)
                        await api.addGroupMember(token, g.id, e.target.value);
                      e.target.value = "";
                      await load();
                    }}
                  >
                    <option value="">Add member…</option>
                    {users
                      .filter(
                        (u) =>
                          u.active &&
                          !g.members.some((x) => x.user.id === u.id),
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </article>
              ))}
              <div className="pagination">
                <button
                  className="secondary small"
                  disabled={groupPage <= 1}
                  onClick={() => setGroupPage((v) => v - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {groupPage} of {groupTotalPages}
                </span>
                <button
                  className="secondary small"
                  disabled={groupPage >= groupTotalPages}
                  onClick={() => setGroupPage((v) => v + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        {tab === "slas" && (
          <div className="admin-grid">
            <div className="admin-form-stack">
              <form className="admin-form" onSubmit={createSla}>
                <h2>Add SLA policy</h2>
                <label>
                  Name
                  <input
                    required
                    value={newSla.name}
                    onChange={(e) =>
                      setNewSla({ ...newSla, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Ticket type
                  <select
                    value={newSla.ticketTypeId}
                    onChange={(e) =>
                      setNewSla({ ...newSla, ticketTypeId: e.target.value })
                    }
                  >
                    {reference.ticketTypes.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select
                    value={newSla.priorityId}
                    onChange={(e) =>
                      setNewSla({ ...newSla, priorityId: e.target.value })
                    }
                  >
                    <option value="">All priorities</option>
                    {reference.priorities.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Calendar
                  <select
                    value={newSla.calendarId}
                    onChange={(e) =>
                      setNewSla({ ...newSla, calendarId: e.target.value })
                    }
                  >
                    {reference.calendars.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Response target (minutes)
                  <input
                    type="number"
                    min={1}
                    value={newSla.responseTargetMinutes}
                    onChange={(e) =>
                      setNewSla({
                        ...newSla,
                        responseTargetMinutes: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Resolution target (minutes)
                  <input
                    type="number"
                    min={1}
                    value={newSla.resolutionTargetMinutes}
                    onChange={(e) =>
                      setNewSla({
                        ...newSla,
                        resolutionTargetMinutes: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <button className="primary">Create SLA</button>
              </form>
              <div className="admin-form">
                <h2>Add business calendar</h2>
                <p className="muted">
                  Monday–Friday, 09:00–17:00. Holidays can be added in the next
                  calendar editor iteration.
                </p>
                <label>
                  Name
                  <input
                    value={calendarName}
                    onChange={(e) => setCalendarName(e.target.value)}
                  />
                </label>
                <label>
                  Timezone
                  <select
                    value={calendarTimezone}
                    onChange={(e) => setCalendarTimezone(e.target.value)}
                  >
                    {timezones.map((timezone) => (
                      <option key={timezone} value={timezone}>
                        {timezone}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="primary"
                  type="button"
                  onClick={createCalendar}
                  disabled={busy}
                >
                  Create calendar
                </button>
              </div>
            </div>
            <div className="admin-list">
              <h2>
                SLA Policies <span>{slas.length}</span>
              </h2>
              {slas.map((s) => (
                <article className="sla-card" key={s.id}>
                  <div>
                    <b>
                      {s.name} · v{s.version}
                    </b>
                    <small>
                      {s.ticketType?.name || "All tickets"} ·{" "}
                      {s.priority?.name || "All priorities"} · {s.calendar.name}
                    </small>
                  </div>
                  <div>
                    <span>Response: {s.responseTargetMinutes} min</span>
                    <span>Resolution: {s.resolutionTargetMinutes} min</span>
                  </div>
                  <button
                    className="secondary small"
                    disabled={!s.active}
                    onClick={async () => {
                      await api.deactivateAdminSla(token, s.id);
                      await load();
                    }}
                  >
                    {s.active ? "Deactivate" : "Inactive"}
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}
        {tab === "settings" && (
          <form className="settings-layout" onSubmit={saveSettings}>
            <div className="admin-form settings-section">
              <h2>Organisation & branding</h2>
              <p className="muted">
                These values are unique to this client organisation.
              </p>
              <label>
                Organisation name
                <input
                  required
                  value={settings.organizationName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      organizationName: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Portal title
                <input
                  value={settings.branding.portalTitle || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: {
                        ...settings.branding,
                        portalTitle: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <label>
                Welcome message
                <input
                  value={settings.branding.welcomeMessage || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: {
                        ...settings.branding,
                        welcomeMessage: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <div className="brand-asset-control"><div><b>Client logo</b><small>PNG, JPEG, WebP or SVG; maximum 2 MB.</small></div>{settings.branding.logoUrl&&<img src={settings.branding.logoUrl} alt="Current client logo"/>}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={busy||!settings.attachments.enabled} onChange={e=>{void uploadBrandAsset('logo',e.target.files?.[0]);e.target.value=''}}/>{settings.branding.logoUrl&&<button type="button" className="secondary small" onClick={()=>removeBrandAsset('logo')} disabled={busy}>Remove logo</button>}</div>
              <div className="brand-asset-control"><div><b>Favicon</b><small>PNG or ICO; maximum 2 MB.</small></div>{settings.branding.faviconUrl&&<img src={settings.branding.faviconUrl} alt="Current favicon"/>}<input type="file" accept="image/png,image/x-icon,image/vnd.microsoft.icon" disabled={busy||!settings.attachments.enabled} onChange={e=>{void uploadBrandAsset('favicon',e.target.files?.[0]);e.target.value=''}}/>{settings.branding.faviconUrl&&<button type="button" className="secondary small" onClick={()=>removeBrandAsset('favicon')} disabled={busy}>Remove favicon</button>}</div>
              <div className="color-fields">
                <label>
                  Primary colour
                  <input
                    type="color"
                    value={settings.branding.primaryColor || "#3448c5"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        branding: {
                          ...settings.branding,
                          primaryColor: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Accent colour
                  <input
                    type="color"
                    value={settings.branding.accentColor || "#16a394"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        branding: {
                          ...settings.branding,
                          accentColor: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Support email
                <input
                  type="email"
                  value={settings.branding.supportEmail || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: {
                        ...settings.branding,
                        supportEmail: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <label>
                Support phone
                <input
                  value={settings.branding.supportPhone || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: {
                        ...settings.branding,
                        supportPhone: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <label>
                Default timezone
                <select
                  value={settings.branding.timezone || "Asia/Kolkata"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: {
                        ...settings.branding,
                        timezone: e.target.value,
                      },
                    })
                  }
                >
                  {timezones.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>Interface theme<select value={settings.branding.themeMode||"DARK"} onChange={e=>setSettings({...settings,branding:{...settings.branding,themeMode:e.target.value as OrganizationSettings['branding']['themeMode']}})}><option value="DARK">Nextris Dark</option><option value="LIGHT">Light</option><option value="SYSTEM">Use device setting</option></select></label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={settings.branding.showPoweredBy !== false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: {
                        ...settings.branding,
                        showPoweredBy: e.target.checked,
                      },
                    })
                  }
                />{" "}
                Show “Powered by Nextris Sevā”
              </label>
            </div>
            <div className="settings-column">
              <div className="admin-form settings-section">
                <h2>Attachments & storage</h2>
                <p className="muted">
                  File controls remain inactive until a provider is selected and
                  attachments are enabled. Credentials are supplied through
                  environment variables or a secret manager—not stored here.
                </p>
                <label>
                  Storage provider
                  <select
                    value={settings.attachments.provider || "NONE"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attachments: {
                          ...settings.attachments,
                          provider: e.target
                            .value as OrganizationSettings["attachments"]["provider"],
                          enabled:
                            e.target.value === "NONE"
                              ? false
                              : settings.attachments.enabled,
                        },
                      })
                    }
                  >
                    <option value="NONE">Not configured</option>
                    <option value="S3">Amazon S3</option>
                    <option value="AZURE_BLOB">Azure Blob Storage</option>
                    <option value="GCS">Google Cloud Storage</option>
                    <option value="MINIO">MinIO / S3-compatible</option>
                    <option value="LOCAL">On-premises filesystem</option>
                  </select>
                </label>
                <label>
                  {settings.attachments.provider === "LOCAL" ? "Storage folder path" : "Bucket / container"}
                  <input
                    value={settings.attachments.bucket || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attachments: {
                          ...settings.attachments,
                          bucket: e.target.value,
                        },
                      })
                    }
                    disabled={settings.attachments.provider === "NONE"}
                  />
                </label>
                <label>
                  Region
                  <input
                    value={settings.attachments.region || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attachments: {
                          ...settings.attachments,
                          region: e.target.value,
                        },
                      })
                    }
                    disabled={settings.attachments.provider === "NONE"}
                    placeholder="e.g. ap-south-1"
                  />
                </label>
                <label>
                  Custom endpoint
                  <input
                    type="url"
                    value={settings.attachments.endpoint || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attachments: {
                          ...settings.attachments,
                          endpoint: e.target.value,
                        },
                      })
                    }
                    disabled={settings.attachments.provider === "NONE"}
                    placeholder="Optional for MinIO"
                  />
                </label>
                <label>
                  Maximum file size (MB)
                  <input
                    type="number"
                    min={1}
                    value={settings.attachments.maxFileSizeMb || 10}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attachments: {
                          ...settings.attachments,
                          maxFileSizeMb: Number(e.target.value),
                        },
                      })
                    }
                    disabled={settings.attachments.provider === "NONE"}
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={settings.attachments.enabled || false}
                    disabled={settings.attachments.provider === "NONE" || (!storageTested && !settings.attachments.enabled)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attachments: {
                          ...settings.attachments,
                          enabled: e.target.checked,
                        },
                      })
                    }
                  />{" "}
                  Enable attachments
                </label>
                <button className="secondary" type="button" onClick={testStorage} disabled={busy || settings.attachments.provider === "NONE" || !settings.attachments.bucket}>{busy ? "Testing…" : "Test connection"}</button>
                <div
                  className={`storage-status ${settings.attachments.enabled ? "configured" : ""}`}
                >
                  <b>
                    {settings.attachments.enabled
                      ? "Attachments enabled"
                      : "Attachments inactive"}
                  </b>
                  <small>
                    {settings.attachments.enabled
                      ? "The provider configuration will be used by the attachment service."
                      : "Users will see attachments as unavailable until storage is configured and enabled."}
                  </small>
                </div>
              </div>
              <div
                className="branding-preview"
                style={
                  {
                    "--preview-primary": settings.branding.primaryColor,
                    "--preview-accent": settings.branding.accentColor,
                  } as React.CSSProperties
                }
              >
                {settings.branding.logoUrl ? (
                  <img
                    src={settings.branding.logoUrl}
                    alt="Client logo preview"
                  />
                ) : (
                  <span className="preview-mark">
                    {settings.organizationName.slice(0, 1).toUpperCase() || "N"}
                  </span>
                )}
                <div>
                  <b>
                    {settings.branding.portalTitle || settings.organizationName}
                  </b>
                  <small>{settings.branding.welcomeMessage}</small>
                  {settings.branding.showPoweredBy !== false && (
                    <em>Powered by Nextris Sevā</em>
                  )}
                </div>
              </div>
              <button className="primary settings-save" disabled={busy}>
                {busy ? "Saving…" : "Save organisation settings"}
              </button>
            </div>
          </form>
        )}
        {tab === "slas" && <CalendarEditor token={token} onCreated={load} />}
      </section>
    </div>
  );
}
