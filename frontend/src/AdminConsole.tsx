import { FormEvent, useEffect, useState } from "react";
import { api } from "./api";
import type {
  AdminGroup,
  AdminCmdbSettings,
  AdminUser,
  ChangeApprovalRule,
  OrganizationSettings,
  ReferenceData,
  ServiceCatalogCategory,
  ServiceCatalogItem,
  ServiceApprovalRule,
  SlaDefinition,
  CmdbCategory,
  CmdbRelationshipTypeLookup,
  CmdbType,
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
const changeGroupApprovalTypes = ["GROUP", "CAB", "SECURITY", "ITAM"];

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
  const [tab, setTab] = useState<"users" | "groups" | "catalog" | "change-approvals" | "cmdb-settings" | "slas" | "settings">(
    "users",
  );
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [slas, setSlas] = useState<SlaDefinition[]>([]);
  const [catalog, setCatalog] = useState<ServiceCatalogCategory[]>([]);
  const [changeApprovalRules, setChangeApprovalRules] = useState<ChangeApprovalRule[]>([]);
  const [cmdbSettings, setCmdbSettings] = useState<AdminCmdbSettings>({ categories: [], types: [], relationshipTypes: [] });
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
  const [usersPanel, setUsersPanel] = useState<"add-user" | "user-list" | "edit-user" | "add-department" | "department-list" | "edit-department">("user-list");
  const [groupsPanel, setGroupsPanel] = useState<"add-group" | "group-list" | "edit-group">("group-list");
  const [catalogPanel, setCatalogPanel] = useState<"add-category" | "add-item" | "add-approval" | "approval-list" | "edit-approval" | "catalog-list" | "category-items" | "edit-category" | "edit-item">("catalog-list");
  const [changeApprovalPanel, setChangeApprovalPanel] = useState<"add-rule" | "rule-list" | "edit-rule">("rule-list");
  const [cmdbPanel, setCmdbPanel] = useState<"categories" | "types" | "relationship-types">("categories");
  const [slaPanel, setSlaPanel] = useState<"add-sla" | "add-calendar" | "sla-list" | "edit-sla">("sla-list");
  const [settingsPanel, setSettingsPanel] = useState<"branding" | "storage">("branding");
  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null);
  const [editGroup, setEditGroup] = useState({ name: "", description: "", email: "", phone: "", groupType: "FULFILLMENT", managerId: "", active: true });
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    departmentId: "",
    managerId: "",
    managerRequiredExempt: false,
    temporaryPassword: "",
  });
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState({ name: "", phone: "", departmentId: "", managerId: "", managerRequiredExempt: false, active: true });
  const [editingCatalogItem, setEditingCatalogItem] = useState<ServiceCatalogItem | null>(null);
  const [editingSla, setEditingSla] = useState<SlaDefinition | null>(null);
  const [editCatalogItem, setEditCatalogItem] = useState({ name: "", description: "", defaultAssignmentGroupId: "", formSchema: "[]", taskTemplates: "[]", active: true });
  const [selectedCategory, setSelectedCategory] = useState<ServiceCatalogCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<ServiceCatalogCategory | null>(null);
  const [editCategory, setEditCategory] = useState({ name: "", description: "" });
  const [editingApprovalRule, setEditingApprovalRule] = useState<ServiceApprovalRule | null>(null);
  const [editApprovalRule, setEditApprovalRule] = useState({ catalogItemId: "", sequence: 1, approvalType: "MANAGER", approvalGroupId: "", specificApproverId: "", active: true });
  const [editingChangeApprovalRule, setEditingChangeApprovalRule] = useState<ChangeApprovalRule | null>(null);
  const [editChangeApprovalRule, setEditChangeApprovalRule] = useState({ sequence: 1, approvalType: "CAB", approvalGroupId: "", specificApproverId: "", active: true });
  const [fieldDraft, setFieldDraft] = useState({ key: "", label: "", type: "text", required: false });
  const [taskDraft, setTaskDraft] = useState({ title: "", description: "", assignmentGroupId: "" });
  const [newDepartment, setNewDepartment] = useState({ name: "", description: "" });
  const [editingDepartment, setEditingDepartment] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [editDepartment, setEditDepartment] = useState({ name: "", description: "" });
  const [newGroup, setNewGroup] = useState({ name: "", description: "", email: "", phone: "", groupType: "FULFILLMENT", managerId: "" });
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [newCatalogItem, setNewCatalogItem] = useState({
    categoryId: "",
    name: "",
    description: "",
    defaultAssignmentGroupId: "",
    formSchema: '[{"key":"details","label":"Request details","type":"textarea","required":true}]',
    taskTemplates: "[]",
  });
  const [newApprovalRule, setNewApprovalRule] = useState({
    catalogItemId: "",
    sequence: 1,
    approvalType: "MANAGER",
    approvalGroupId: "",
    specificApproverId: "",
  });
  const [newChangeApprovalRule, setNewChangeApprovalRule] = useState({
    sequence: 1,
    approvalType: "CAB",
    approvalGroupId: "",
    specificApproverId: "",
  });
  const [newCiCategory, setNewCiCategory] = useState({ name: "", description: "" });
  const [newCiType, setNewCiType] = useState({ categoryId: "", name: "", description: "" });
  const [newCiRelationshipType, setNewCiRelationshipType] = useState({ name: "", description: "" });
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
      const [u, g, r, s, o, c, car, cmdb] = await Promise.all([
        api.adminUsers(token, page, search),
        api.adminGroups(token, groupPage, groupSearch, groupActive),
        api.adminReferenceData(token),
        api.adminSlas(token),
        api.organizationSettings(token),
        api.serviceCatalog(token),
        api.adminChangeApprovalRules(token),
        api.adminCmdbSettings(token),
      ]);
      setUsers(u.data);
      setTotal(u.total);
      setTotalPages(u.totalPages);
      setGroups(g.data);
      setGroupTotal(g.total);
      setGroupTotalPages(g.totalPages);
      setReference(r);
      setSlas(s);
      setCatalog(c);
      setChangeApprovalRules(car);
      setCmdbSettings(cmdb);
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
      setNewCatalogItem((value) => ({
        ...value,
        categoryId: value.categoryId || c[0]?.id || "",
      }));
      setNewApprovalRule((value) => ({
        ...value,
        catalogItemId: value.catalogItemId || c.flatMap((category) => category.items)[0]?.id || "",
      }));
      setNewChangeApprovalRule((value) => ({
        ...value,
        sequence: value.sequence || ((car[0]?.sequence ?? 0) + 1),
      }));
      setNewCiType((value) => ({
        ...value,
        categoryId: value.categoryId || cmdb.categories.find((category) => category.active !== false)?.id || cmdb.categories[0]?.id || "",
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
        managerId: newUser.managerId || undefined,
      });
      setNewUser({
        name: "",
        email: "",
        phone: "",
        departmentId: "",
        managerId: "",
        managerRequiredExempt: false,
        temporaryPassword: "",
      });
      await load();
    } finally {
      setBusy(false);
    }
  }
  function startEditUser(user: AdminUser) {
    setEditingUser(user);
    setUsersPanel("edit-user");
    setEditUser({
      name: user.name,
      phone: user.phone || "",
      departmentId: user.departmentId || "",
      managerId: user.managerId || "",
      managerRequiredExempt: user.managerRequiredExempt || false,
      active: user.active,
    });
  }
  function startEditDepartment(department: { id: string; name: string; description?: string }) {
    setEditingDepartment(department);
    setEditDepartment({ name: department.name, description: department.description || "" });
    setUsersPanel("edit-department");
  }
  function startEditGroup(group: AdminGroup) {
    setEditingGroup(group);
    setGroupsPanel("edit-group");
    setEditGroup({ name: group.name, description: group.description || "", email: group.email || "", phone: group.phone || "", groupType: group.groupType || "FULFILLMENT", managerId: group.manager?.id || "", active: group.active });
  }
  function startEditCatalogItem(item: ServiceCatalogItem) {
    setEditingCatalogItem(item);
    setCatalogPanel("edit-item");
    setEditCatalogItem({
      name: item.name,
      description: item.description || "",
      defaultAssignmentGroupId: item.defaultAssignmentGroup?.id || "",
      formSchema: JSON.stringify(item.formSchema || [], null, 2),
      taskTemplates: JSON.stringify(item.taskTemplates || [], null, 2),
      active: true,
    });
  }
  function openCategoryItems(category: ServiceCatalogCategory) {
    setSelectedCategory(category);
    setCatalogPanel("category-items");
  }
  function startEditCategory(category: ServiceCatalogCategory) {
    setEditingCategory(category);
    setEditCategory({ name: category.name, description: category.description || "" });
    setCatalogPanel("edit-category");
  }
  function startEditApprovalRule(rule: ServiceApprovalRule, catalogItemId: string) {
    setEditingApprovalRule(rule);
    setEditApprovalRule({
      catalogItemId,
      sequence: rule.sequence,
      approvalType: rule.approvalType,
      approvalGroupId: rule.approvalGroupId || rule.approvalGroup?.id || "",
      specificApproverId: rule.specificApproverId || rule.specificApprover?.id || "",
      active: rule.active,
    });
    setCatalogPanel("edit-approval");
  }
  function startEditChangeApprovalRule(rule: ChangeApprovalRule) {
    setEditingChangeApprovalRule(rule);
    setEditChangeApprovalRule({
      sequence: rule.sequence,
      approvalType: rule.approvalType,
      approvalGroupId: rule.approvalGroupId || rule.approvalGroup?.id || "",
      specificApproverId: rule.specificApproverId || rule.specificApprover?.id || "",
      active: rule.active,
    });
    setChangeApprovalPanel("edit-rule");
  }
  function startEditSla(sla: SlaDefinition) {
    setEditingSla(sla);
    setSlaPanel("edit-sla");
  }
  async function saveGroupEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingGroup) return;
    setBusy(true); setError("");
    try {
      await api.updateAdminGroup(token, editingGroup.id, { ...editGroup, managerId: editGroup.managerId || undefined, phone: editGroup.phone || undefined });
      setEditingGroup(null);
      setGroupsPanel("group-list");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update group");
    } finally { setBusy(false); }
  }
  async function saveUserEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setBusy(true);
    setError("");
    try {
      await api.updateAdminUser(token, editingUser.id, {
        name: editUser.name,
        phone: editUser.phone || undefined,
        departmentId: editUser.departmentId || undefined,
        managerId: editUser.managerId || undefined,
        managerRequiredExempt: editUser.managerRequiredExempt,
        active: editUser.active,
      });
      setEditingUser(null);
      setUsersPanel("user-list");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update user");
    } finally {
      setBusy(false);
    }
  }
  async function saveCatalogItemEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingCatalogItem) return;
    setBusy(true);
    setError("");
    try {
      const formSchema = JSON.parse(editCatalogItem.formSchema || "[]");
      const taskTemplates = JSON.parse(editCatalogItem.taskTemplates || "[]");
      if (!Array.isArray(formSchema) || !Array.isArray(taskTemplates)) throw new Error("Form schema and task templates must be JSON arrays.");
      await api.updateServiceCatalogItem(token, editingCatalogItem.id, {
        name: editCatalogItem.name,
        description: editCatalogItem.description,
        defaultAssignmentGroupId: editCatalogItem.defaultAssignmentGroupId || undefined,
        formSchema,
        taskTemplates,
        active: editCatalogItem.active,
      });
      setEditingCatalogItem(null);
      setCatalogPanel("catalog-list");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update catalogue item");
    } finally {
      setBusy(false);
    }
  }
  async function saveCategoryEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingCategory) return;
    setBusy(true);
    setError("");
    try {
      await api.updateServiceCategory(token, editingCategory.id, editCategory);
      setEditingCategory(null);
      setCatalogPanel("catalog-list");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update category");
    } finally {
      setBusy(false);
    }
  }
  async function saveApprovalRuleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingApprovalRule) return;
    setBusy(true);
    setError("");
    try {
      await api.updateServiceApprovalRule(token, editingApprovalRule.id, {
        sequence: editApprovalRule.sequence,
        approvalType: editApprovalRule.approvalType,
        approvalGroupId: editApprovalRule.approvalType === "GROUP" ? editApprovalRule.approvalGroupId : undefined,
        specificApproverId: editApprovalRule.approvalType === "SPECIFIC_USER" ? editApprovalRule.specificApproverId : undefined,
        active: editApprovalRule.active,
      });
      setEditingApprovalRule(null);
      setCatalogPanel("approval-list");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update approval rule");
    } finally {
      setBusy(false);
    }
  }
  async function createDepartment(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createDepartment(token, newDepartment);
      setNewDepartment({ name: "", description: "" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create department");
    } finally {
      setBusy(false);
    }
  }
  async function saveDepartmentEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingDepartment) return;
    setBusy(true);
    setError("");
    try {
      await api.updateDepartment(token, editingDepartment.id, editDepartment);
      setEditingDepartment(null);
      setUsersPanel("department-list");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update department");
    } finally {
      setBusy(false);
    }
  }
  async function createGroup(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createAdminGroup(token, newGroup);
      setNewGroup({ name: "", description: "", email: "", phone: "", groupType: "FULFILLMENT", managerId: "" });
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function createCategory(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createServiceCategory(token, newCategory);
      setNewCategory({ name: "", description: "" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create category");
    } finally {
      setBusy(false);
    }
  }
  function appendFormField(target: "new" | "edit") {
    if (!fieldDraft.key.trim() || !fieldDraft.label.trim()) {
      setError("Field key and label are required.");
      return;
    }
    try {
      const source = target === "new" ? newCatalogItem.formSchema : editCatalogItem.formSchema;
      const parsed = JSON.parse(source || "[]");
      const fields = Array.isArray(parsed) ? parsed : [];
      const next = [...fields, { key: fieldDraft.key.trim(), label: fieldDraft.label.trim(), type: fieldDraft.type, required: fieldDraft.required }];
      const value = JSON.stringify(next, null, 2);
      if (target === "new") setNewCatalogItem({ ...newCatalogItem, formSchema: value });
      else setEditCatalogItem({ ...editCatalogItem, formSchema: value });
      setFieldDraft({ key: "", label: "", type: "text", required: false });
      setError("");
    } catch {
      setError("Form schema must be valid JSON before adding another field.");
    }
  }
  function appendTaskTemplate(target: "new" | "edit") {
    if (!taskDraft.title.trim()) {
      setError("Task title is required.");
      return;
    }
    try {
      const source = target === "new" ? newCatalogItem.taskTemplates : editCatalogItem.taskTemplates;
      const parsed = JSON.parse(source || "[]");
      const tasks = Array.isArray(parsed) ? parsed : [];
      const next = [...tasks, { title: taskDraft.title.trim(), description: taskDraft.description.trim() || undefined, assignmentGroupId: taskDraft.assignmentGroupId || undefined }];
      const value = JSON.stringify(next, null, 2);
      if (target === "new") setNewCatalogItem({ ...newCatalogItem, taskTemplates: value });
      else setEditCatalogItem({ ...editCatalogItem, taskTemplates: value });
      setTaskDraft({ title: "", description: "", assignmentGroupId: "" });
      setError("");
    } catch {
      setError("Task templates must be valid JSON before adding another task.");
    }
  }
  async function createCatalogItem(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let formSchema: unknown[] = [];
      try {
        const parsed = JSON.parse(newCatalogItem.formSchema || "[]");
        formSchema = Array.isArray(parsed) ? parsed : [];
      } catch {
        throw new Error("Form schema must be valid JSON array.");
      }
      let taskTemplates: unknown[] = [];
      try {
        const parsed = JSON.parse(newCatalogItem.taskTemplates || "[]");
        taskTemplates = Array.isArray(parsed) ? parsed : [];
      } catch {
        throw new Error("Task templates must be a valid JSON array.");
      }
      await api.createServiceCatalogItem(token, {
        categoryId: newCatalogItem.categoryId,
        name: newCatalogItem.name,
        description: newCatalogItem.description,
        defaultAssignmentGroupId: newCatalogItem.defaultAssignmentGroupId || undefined,
        formSchema,
        taskTemplates,
      });
      setNewCatalogItem((value) => ({ ...value, name: "", description: "" }));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create catalogue item");
    } finally {
      setBusy(false);
    }
  }
  async function createApprovalRule(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createServiceApprovalRule(token, {
        catalogItemId: newApprovalRule.catalogItemId,
        sequence: newApprovalRule.sequence,
        approvalType: newApprovalRule.approvalType,
        approvalGroupId: newApprovalRule.approvalType === "GROUP" ? newApprovalRule.approvalGroupId : undefined,
        specificApproverId: newApprovalRule.approvalType === "SPECIFIC_USER" ? newApprovalRule.specificApproverId : undefined,
      });
      setNewApprovalRule((value) => ({ ...value, sequence: value.sequence + 1 }));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create approval rule");
    } finally {
      setBusy(false);
    }
  }
  async function createChangeApprovalRule(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createChangeApprovalRule(token, {
        sequence: newChangeApprovalRule.sequence,
        approvalType: newChangeApprovalRule.approvalType,
        approvalGroupId: changeGroupApprovalTypes.includes(newChangeApprovalRule.approvalType) ? newChangeApprovalRule.approvalGroupId : undefined,
        specificApproverId: newChangeApprovalRule.approvalType === "SPECIFIC_USER" ? newChangeApprovalRule.specificApproverId : undefined,
      });
      setNewChangeApprovalRule((value) => ({ ...value, sequence: value.sequence + 1 }));
      setChangeApprovalPanel("rule-list");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create change approval rule");
    } finally {
      setBusy(false);
    }
  }
  async function saveChangeApprovalRuleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingChangeApprovalRule) return;
    setBusy(true);
    setError("");
    try {
      await api.updateChangeApprovalRule(token, editingChangeApprovalRule.id, {
        sequence: editChangeApprovalRule.sequence,
        approvalType: editChangeApprovalRule.approvalType,
        approvalGroupId: changeGroupApprovalTypes.includes(editChangeApprovalRule.approvalType) ? editChangeApprovalRule.approvalGroupId : undefined,
        specificApproverId: editChangeApprovalRule.approvalType === "SPECIFIC_USER" ? editChangeApprovalRule.specificApproverId : undefined,
        active: editChangeApprovalRule.active,
      });
      setEditingChangeApprovalRule(null);
      setChangeApprovalPanel("rule-list");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update change approval rule");
    } finally {
      setBusy(false);
    }
  }
  async function createCiCategory(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setSaved("");
    try { await api.createCiCategory(token, newCiCategory); setNewCiCategory({ name: "", description: "" }); setSaved("CI category saved."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save CI category"); }
    finally { setBusy(false); }
  }
  async function updateCiCategory(category: CmdbCategory, input: Partial<CmdbCategory>) {
    setBusy(true); setError(""); setSaved("");
    try { await api.updateCiCategory(token, category.id, input); setSaved("CI category updated."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update CI category"); }
    finally { setBusy(false); }
  }
  async function createCiType(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setSaved("");
    try { await api.createCiType(token, newCiType); setNewCiType({ categoryId: newCiType.categoryId, name: "", description: "" }); setSaved("CI type saved."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save CI type"); }
    finally { setBusy(false); }
  }
  async function updateCiType(type: CmdbType, input: Partial<CmdbType>) {
    setBusy(true); setError(""); setSaved("");
    try { await api.updateCiType(token, type.id, input); setSaved("CI type updated."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update CI type"); }
    finally { setBusy(false); }
  }
  async function createCiRelationshipType(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setSaved("");
    try { await api.createCiRelationshipType(token, newCiRelationshipType); setNewCiRelationshipType({ name: "", description: "" }); setSaved("Relationship type saved."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save relationship type"); }
    finally { setBusy(false); }
  }
  async function updateCiRelationshipType(type: CmdbRelationshipTypeLookup, input: Partial<CmdbRelationshipTypeLookup>) {
    setBusy(true); setError(""); setSaved("");
    try { await api.updateCiRelationshipType(token, type.id, input); setSaved("Relationship type updated."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update relationship type"); }
    finally { setBusy(false); }
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
            className={tab === "catalog" ? "active" : ""}
            onClick={() => setTab("catalog")}
          >
            Service Catalogue
          </button>
          <button
            className={tab === "change-approvals" ? "active" : ""}
            onClick={() => setTab("change-approvals")}
          >
            Change Approvals
          </button>
          <button
            className={tab === "cmdb-settings" ? "active" : ""}
            onClick={() => setTab("cmdb-settings")}
          >
            CMDB Settings
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
            <div className="admin-form-stack">
              <div className="admin-form admin-card-menu">
                <button type="button" className={usersPanel === "add-user" ? "secondary active" : "secondary"} onClick={() => { setEditingUser(null); setUsersPanel("add-user"); }}>Add User</button>
                <button type="button" className={usersPanel === "user-list" ? "secondary active" : "secondary"} onClick={() => { setEditingUser(null); setUsersPanel("user-list"); }}>User List</button>
                <button type="button" className={usersPanel === "add-department" ? "secondary active" : "secondary"} onClick={() => { setEditingUser(null); setUsersPanel("add-department"); }}>Add Department</button>
                <button type="button" className={usersPanel === "department-list" ? "secondary active" : "secondary"} onClick={() => { setEditingUser(null); setUsersPanel("department-list"); }}>Department List</button>
              </div>
            {usersPanel === "add-user" && <form className="admin-form" onSubmit={createUser}>
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
                Phone
                <input
                  value={newUser.phone}
                  onChange={(e) =>
                    setNewUser({ ...newUser, phone: e.target.value })
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
                Manager
                <select
                  value={newUser.managerId}
                  onChange={(e) =>
                    setNewUser({ ...newUser, managerId: e.target.value })
                  }
                  required={!newUser.managerRequiredExempt}
                  disabled={newUser.managerRequiredExempt}
                >
                  <option value="">Select manager</option>
                  {users.filter((u) => u.active).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={newUser.managerRequiredExempt}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      managerRequiredExempt: e.target.checked,
                      managerId: e.target.checked ? "" : newUser.managerId,
                    })
                  }
                />
                Manager not required for this user
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
            </form>}
            {usersPanel === "add-department" && <form className="admin-form" onSubmit={createDepartment}>
              <h2>Add department</h2>
              <label>
                Department name
                <input required value={newDepartment.name} onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })} />
              </label>
              <label>
                Description
                <textarea rows={3} value={newDepartment.description} onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })} />
              </label>
              <button className="primary" disabled={busy}>Create department</button>
            </form>}
            {editingDepartment && usersPanel === "edit-department" && <form className="admin-form" onSubmit={saveDepartmentEdit}>
              <h2>Edit department</h2>
              <label>
                Department name
                <input required value={editDepartment.name} onChange={(e) => setEditDepartment({ ...editDepartment, name: e.target.value })} />
              </label>
              <label>
                Description
                <textarea rows={3} value={editDepartment.description} onChange={(e) => setEditDepartment({ ...editDepartment, description: e.target.value })} />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => { setEditingDepartment(null); setUsersPanel("department-list"); }}>Cancel</button>
                <button className="primary" disabled={busy}>Save department</button>
              </div>
            </form>}
            {editingUser && usersPanel === "edit-user" && (
              <form className="admin-form" onSubmit={saveUserEdit}>
                <h2>Edit user</h2>
                <p className="muted">{editingUser.email}</p>
                <label>
                  Name
                  <input required value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
                </label>
                <label>
                  Phone
                  <input value={editUser.phone} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} />
                </label>
                <label>
                  Department
                  <select value={editUser.departmentId} onChange={(e) => setEditUser({ ...editUser, departmentId: e.target.value })}>
                    <option value="">No department</option>
                    {reference.departments.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </label>
                <label>
                  Manager
                  <select value={editUser.managerId} onChange={(e) => setEditUser({ ...editUser, managerId: e.target.value })} required={!editUser.managerRequiredExempt} disabled={editUser.managerRequiredExempt}>
                    <option value="">Select manager</option>
                    {users.filter((u) => u.active && u.id !== editingUser.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </label>
                <label className="check-row">
                  <input type="checkbox" checked={editUser.managerRequiredExempt} onChange={(e) => setEditUser({ ...editUser, managerRequiredExempt: e.target.checked, managerId: e.target.checked ? "" : editUser.managerId })} />
                  Manager not required for this user
                </label>
                <label className="check-row">
                  <input type="checkbox" checked={editUser.active} onChange={(e) => setEditUser({ ...editUser, active: e.target.checked })} />
                  Active
                </label>
                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={() => { setEditingUser(null); setUsersPanel("user-list"); }}>Cancel</button>
                  <button className="primary" disabled={busy}>Save user</button>
                </div>
              </form>
            )}
            </div>
            {usersPanel === "department-list" && <div className="admin-list">
              <h2>Departments <span>{reference.departments.length}</span></h2>
              {reference.departments.map((department) => (
                <article key={department.id}>
                  <div className="avatar">{department.name.slice(0,2).toUpperCase()}</div>
                  <div><b>{department.name}</b><small>{department.description || "No description"}</small></div>
                  <button className="secondary small" onClick={() => startEditDepartment(department)}>Edit</button>
                </article>
              ))}
            </div>}
            {usersPanel === "user-list" && <div className="admin-list">
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
                    {u.phone && <small>{u.phone}</small>}
                    <small>Manager: {u.manager?.name || (u.managerRequiredExempt ? "Exempt" : "Missing")}</small>
                  </div>
                  <div className="role-pill-list">
                    {effectiveRoles(u).map((role) => <span className="role-pill" key={role}>{role}</span>)}
                  </div>
                  <button className="secondary small" onClick={() => startEditUser(u)}>
                    Edit
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
            </div>}
          </div>
        )}
        {tab === "groups" && (
          <div className="admin-grid">
            <div className="admin-form-stack">
              <div className="admin-form admin-card-menu">
                <button type="button" className={groupsPanel === "add-group" ? "secondary active" : "secondary"} onClick={() => setGroupsPanel("add-group")}>Add Assignment Group</button>
                <button type="button" className={groupsPanel === "group-list" ? "secondary active" : "secondary"} onClick={() => setGroupsPanel("group-list")}>Assignment Group List</button>
              </div>
            {groupsPanel === "add-group" && <form className="admin-form" onSubmit={createGroup}>
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
              <label>
                Group email
                <input
                  required
                  type="email"
                  value={newGroup.email}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, email: e.target.value })
                  }
                />
              </label>
              <label>
                Phone
                <input
                  value={newGroup.phone}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, phone: e.target.value })
                  }
                />
              </label>
              <label>
                Group type
                <select
                  value={newGroup.groupType}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, groupType: e.target.value })
                  }
                >
                  <option value="FULFILLMENT">Fulfillment</option>
                  <option value="APPROVAL">Approval</option>
                  <option value="BOTH">Both</option>
                </select>
              </label>
              <label>
                Group manager
                <select
                  required
                  value={newGroup.managerId}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, managerId: e.target.value })
                  }
                >
                  <option value="">Select manager</option>
                  {users.filter((u) => u.active).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary">Create group</button>
            </form>}
            {editingGroup && groupsPanel === "edit-group" && (
              <form className="admin-form" onSubmit={saveGroupEdit}>
                <h2>Edit assignment group</h2>
                <label>Name<input required value={editGroup.name} onChange={(e)=>setEditGroup({...editGroup,name:e.target.value})}/></label>
                <label>Description<textarea rows={3} value={editGroup.description} onChange={(e)=>setEditGroup({...editGroup,description:e.target.value})}/></label>
                <label>Email<input required type="email" value={editGroup.email} onChange={(e)=>setEditGroup({...editGroup,email:e.target.value})}/></label>
                <label>Phone<input value={editGroup.phone} onChange={(e)=>setEditGroup({...editGroup,phone:e.target.value})}/></label>
                <label>Group type<select value={editGroup.groupType} onChange={(e)=>setEditGroup({...editGroup,groupType:e.target.value})}><option value="FULFILLMENT">Fulfillment</option><option value="APPROVAL">Approval</option><option value="BOTH">Both</option></select></label>
                <label>Manager<select required value={editGroup.managerId} onChange={(e)=>setEditGroup({...editGroup,managerId:e.target.value})}><option value="">Select manager</option>{users.filter(u=>u.active).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
                <label className="check-row"><input type="checkbox" checked={editGroup.active} onChange={(e)=>setEditGroup({...editGroup,active:e.target.checked})}/>Active</label>
                <h3>Roles</h3>
                <div className="member-list role-list">{editingGroup.roles.map((x)=><span key={x.role.id}>{x.role.name}<button type="button" onClick={async()=>{await api.removeGroupRole(token,editingGroup.id,x.role.id);await load();}}>×</button></span>)}</div>
                <select defaultValue="" onChange={async(e)=>{if(e.target.value)await api.addGroupRole(token,editingGroup.id,e.target.value);e.target.value="";await load();}}>
                  <option value="">Grant role…</option>{reference.roles.filter(r=>r.name!=="EMPLOYEE"&&!editingGroup.roles.some(x=>x.role.id===r.id)).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <h3>Members</h3>
                <div className="member-list">{editingGroup.members.map((x)=><span key={x.user.id}>{x.user.name}<button type="button" onClick={async()=>{await api.removeGroupMember(token,editingGroup.id,x.user.id);await load();}}>×</button></span>)}</div>
                <select defaultValue="" onChange={async(e)=>{if(e.target.value)await api.addGroupMember(token,editingGroup.id,e.target.value);e.target.value="";await load();}}>
                  <option value="">Add member…</option>{users.filter(u=>u.active&&!editingGroup.members.some(x=>x.user.id===u.id)).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setEditingGroup(null)}>Cancel</button><button className="primary" disabled={busy}>Save group</button></div>
              </form>
            )}
            </div>
            {groupsPanel === "group-list" && <div className="admin-list">
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
                  <small>{g.groupType || "FULFILLMENT"} · {g.email || "No group email"}{g.phone ? ` · ${g.phone}` : ""} · Manager: {g.manager?.name || "Missing"}</small>
                  <div className="member-list role-list">
                    {g.roles.map((x) => <span key={x.role.id}>{x.role.name}</span>)}
                  </div>
                  <div className="member-list">
                    {g.members.slice(0, 6).map((x) => <span key={x.user.id}>{x.user.name}</span>)}
                    {g.members.length > 6 && <span>+{g.members.length - 6} more</span>}
                  </div>
                  <button className="secondary small" onClick={() => startEditGroup(g)}>Edit</button>
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
            </div>}
          </div>
        )}
        {tab === "catalog" && (
          <div className="admin-grid">
            <div className="admin-form-stack">
              <div className="admin-form admin-card-menu">
                <button type="button" className={catalogPanel === "add-category" ? "secondary active" : "secondary"} onClick={() => setCatalogPanel("add-category")}>Add Category</button>
                <button type="button" className={catalogPanel === "add-item" ? "secondary active" : "secondary"} onClick={() => setCatalogPanel("add-item")}>Add Catalogue Item</button>
                <button type="button" className={catalogPanel === "add-approval" ? "secondary active" : "secondary"} onClick={() => setCatalogPanel("add-approval")}>Add Approval Rule</button>
                <button type="button" className={["approval-list", "edit-approval"].includes(catalogPanel) ? "secondary active" : "secondary"} onClick={() => setCatalogPanel("approval-list")}>Approval Rule List</button>
                <button type="button" className={["catalog-list", "category-items", "edit-category", "edit-item"].includes(catalogPanel) ? "secondary active" : "secondary"} onClick={() => setCatalogPanel("catalog-list")}>Catalogue List</button>
              </div>
              {catalogPanel === "add-category" && <form className="admin-form" onSubmit={createCategory}>
                <h2>Add request category</h2>
                <p className="muted">
                  Categories group catalogue items shown to employees.
                </p>
                <label>
                  Category name
                  <input required value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
                </label>
                <label>
                  Description
                  <textarea rows={3} value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} />
                </label>
                <button className="primary" disabled={busy}>Create category</button>
              </form>}
              {catalogPanel === "add-item" && <form className="admin-form" onSubmit={createCatalogItem}>
                <h2>Add catalogue item</h2>
                <p className="muted">
                  Set the default routing group. SLA targets are configured separately in the SLA Policies tab by choosing ticket type SERVICE_REQUEST.
                </p>
                <label>
                  Category
                  <select required value={newCatalogItem.categoryId} onChange={(e) => setNewCatalogItem({ ...newCatalogItem, categoryId: e.target.value })}>
                    <option value="">Select category</option>
                    {catalog.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
                <label>
                  Item name
                  <input required value={newCatalogItem.name} onChange={(e) => setNewCatalogItem({ ...newCatalogItem, name: e.target.value })} />
                </label>
                <label>
                  Description
                  <textarea rows={3} value={newCatalogItem.description} onChange={(e) => setNewCatalogItem({ ...newCatalogItem, description: e.target.value })} />
                </label>
                <label>
                  Default assignment group
                  <select value={newCatalogItem.defaultAssignmentGroupId} onChange={(e) => setNewCatalogItem({ ...newCatalogItem, defaultAssignmentGroupId: e.target.value })}>
                    <option value="">No default group</option>
                    {groups.filter((group) => group.active).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                </label>
                <label>
                  Form schema
                  <div className="admin-helper-grid">
                    <input placeholder="Field key, e.g. laptopModel" value={fieldDraft.key} onChange={(e) => setFieldDraft({ ...fieldDraft, key: e.target.value })} />
                    <input placeholder="Label shown to user" value={fieldDraft.label} onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })} />
                    <select value={fieldDraft.type} onChange={(e) => setFieldDraft({ ...fieldDraft, type: e.target.value })}>
                      <option value="text">Text</option>
                      <option value="textarea">Long text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                    </select>
                    <label className="check-row"><input type="checkbox" checked={fieldDraft.required} onChange={(e) => setFieldDraft({ ...fieldDraft, required: e.target.checked })} />Required</label>
                    <button type="button" className="secondary small" onClick={() => appendFormField("new")}>Add field</button>
                  </div>
                  <textarea rows={4} value={newCatalogItem.formSchema} onChange={(e) => setNewCatalogItem({ ...newCatalogItem, formSchema: e.target.value })} />
                  <small className="muted">Advanced / optional. Leave as [] unless you want to define extra fields on this request form. Example: [{"{"}"key":"laptopModel","label":"Laptop model","type":"text","required":true{"}"}]</small>
                </label>
                <label>
                  Task templates
                  <div className="admin-helper-grid">
                    <input placeholder="Task title" value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} />
                    <input placeholder="Task description" value={taskDraft.description} onChange={(e) => setTaskDraft({ ...taskDraft, description: e.target.value })} />
                    <select value={taskDraft.assignmentGroupId} onChange={(e) => setTaskDraft({ ...taskDraft, assignmentGroupId: e.target.value })}>
                      <option value="">No default group</option>
                      {groups.filter((group) => group.active).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </select>
                    <button type="button" className="secondary small" onClick={() => appendTaskTemplate("new")}>Add task</button>
                  </div>
                  <textarea rows={5} value={newCatalogItem.taskTemplates} onChange={(e) => setNewCatalogItem({ ...newCatalogItem, taskTemplates: e.target.value })} />
                  <small className="muted">Advanced / optional. Leave as [] if this request should not auto-create tasks. Example: [{"{"}"title":"Create account","assignmentGroupId":"group-id"{"}"}]. Tasks are created after approval is completed, or immediately if no approval is needed.</small>
                </label>
                <button className="primary" disabled={busy || catalog.length === 0}>Create catalogue item</button>
              </form>}
              {catalogPanel === "add-approval" && <form className="admin-form" onSubmit={createApprovalRule}>
                <h2>Add approval rule</h2>
                <p className="muted">
                  Approval rules run in sequence. Manager approval uses the requester's manager.
                </p>
                <label>
                  Catalogue item
                  <select required value={newApprovalRule.catalogItemId} onChange={(e) => setNewApprovalRule({ ...newApprovalRule, catalogItemId: e.target.value })}>
                    <option value="">Select catalogue item</option>
                    {catalog.flatMap((category) => category.items.map((item) => <option key={item.id} value={item.id}>{category.name} — {item.name}</option>))}
                  </select>
                </label>
                <label>
                  Sequence
                  <input type="number" min={1} value={newApprovalRule.sequence} onChange={(e) => setNewApprovalRule({ ...newApprovalRule, sequence: Number(e.target.value) })} />
                </label>
                <label>
                  Approval type
                  <select value={newApprovalRule.approvalType} onChange={(e) => setNewApprovalRule({ ...newApprovalRule, approvalType: e.target.value })}>
                    <option value="MANAGER">Requester's manager</option>
                    <option value="GROUP">Approval group manager</option>
                    <option value="SPECIFIC_USER">Specific user</option>
                  </select>
                </label>
                {newApprovalRule.approvalType === "GROUP" && (
                  <label>
                    Approval group
                    <select required value={newApprovalRule.approvalGroupId} onChange={(e) => setNewApprovalRule({ ...newApprovalRule, approvalGroupId: e.target.value })}>
                      <option value="">Select approval group</option>
                      {groups.filter((group) => group.active && ["APPROVAL", "BOTH"].includes(group.groupType || "")).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </select>
                  </label>
                )}
                {newApprovalRule.approvalType === "SPECIFIC_USER" && (
                  <label>
                    Approver
                    <select required value={newApprovalRule.specificApproverId} onChange={(e) => setNewApprovalRule({ ...newApprovalRule, specificApproverId: e.target.value })}>
                      <option value="">Select approver</option>
                      {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </label>
                )}
                <button className="primary" disabled={busy || !newApprovalRule.catalogItemId}>Create approval rule</button>
              </form>}
              {editingApprovalRule && catalogPanel === "edit-approval" && <form className="admin-form" onSubmit={saveApprovalRuleEdit}>
                <h2>Edit approval rule</h2>
                <label>
                  Catalogue item
                  <select disabled value={editApprovalRule.catalogItemId}>
                    {catalog.flatMap((category) => category.items.map((item) => <option key={item.id} value={item.id}>{category.name} — {item.name}</option>))}
                  </select>
                </label>
                <label>
                  Sequence
                  <input type="number" min={1} value={editApprovalRule.sequence} onChange={(e) => setEditApprovalRule({ ...editApprovalRule, sequence: Number(e.target.value) })} />
                </label>
                <label>
                  Approval type
                  <select value={editApprovalRule.approvalType} onChange={(e) => setEditApprovalRule({ ...editApprovalRule, approvalType: e.target.value })}>
                    <option value="MANAGER">Requester's manager</option>
                    <option value="GROUP">Approval group manager</option>
                    <option value="SPECIFIC_USER">Specific user</option>
                  </select>
                </label>
                {editApprovalRule.approvalType === "GROUP" && (
                  <label>
                    Approval group
                    <select required value={editApprovalRule.approvalGroupId} onChange={(e) => setEditApprovalRule({ ...editApprovalRule, approvalGroupId: e.target.value })}>
                      <option value="">Select approval group</option>
                      {groups.filter((group) => group.active && ["APPROVAL", "BOTH"].includes(group.groupType || "")).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </select>
                  </label>
                )}
                {editApprovalRule.approvalType === "SPECIFIC_USER" && (
                  <label>
                    Approver
                    <select required value={editApprovalRule.specificApproverId} onChange={(e) => setEditApprovalRule({ ...editApprovalRule, specificApproverId: e.target.value })}>
                      <option value="">Select approver</option>
                      {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </label>
                )}
                <label className="check-row">
                  <input type="checkbox" checked={editApprovalRule.active} onChange={(e) => setEditApprovalRule({ ...editApprovalRule, active: e.target.checked })} />
                  Active
                </label>
                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={() => { setEditingApprovalRule(null); setCatalogPanel("approval-list"); }}>Cancel</button>
                  <button className="primary" disabled={busy}>Save approval rule</button>
                </div>
              </form>}
              {editingCatalogItem && catalogPanel === "edit-item" && <form className="admin-form" onSubmit={saveCatalogItemEdit}>
                <h2>Edit catalogue item</h2>
                <p className="muted">
                  Basic admins can safely update name, description, routing group, and Active. Form schema and task templates are advanced JSON settings; leave them as [] if unused.
                </p>
                <label>
                  Item name
                  <input required value={editCatalogItem.name} onChange={(e) => setEditCatalogItem({ ...editCatalogItem, name: e.target.value })} />
                </label>
                <label>
                  Description
                  <textarea rows={3} value={editCatalogItem.description} onChange={(e) => setEditCatalogItem({ ...editCatalogItem, description: e.target.value })} />
                </label>
                <label>
                  Default assignment group
                  <select value={editCatalogItem.defaultAssignmentGroupId} onChange={(e) => setEditCatalogItem({ ...editCatalogItem, defaultAssignmentGroupId: e.target.value })}>
                    <option value="">No default group</option>
                    {groups.filter((group) => group.active).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                </label>
                <label>
                  Form schema
                  <div className="admin-helper-grid">
                    <input placeholder="Field key, e.g. employeeId" value={fieldDraft.key} onChange={(e) => setFieldDraft({ ...fieldDraft, key: e.target.value })} />
                    <input placeholder="Label shown to user" value={fieldDraft.label} onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })} />
                    <select value={fieldDraft.type} onChange={(e) => setFieldDraft({ ...fieldDraft, type: e.target.value })}>
                      <option value="text">Text</option>
                      <option value="textarea">Long text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                    </select>
                    <label className="check-row"><input type="checkbox" checked={fieldDraft.required} onChange={(e) => setFieldDraft({ ...fieldDraft, required: e.target.checked })} />Required</label>
                    <button type="button" className="secondary small" onClick={() => appendFormField("edit")}>Add field</button>
                  </div>
                  <textarea rows={4} value={editCatalogItem.formSchema} onChange={(e) => setEditCatalogItem({ ...editCatalogItem, formSchema: e.target.value })} />
                  <small className="muted">Usage: define extra fields shown on this request form. Example: [{"{"}"key":"employeeId","label":"Employee ID","type":"text","required":true{"}"}]. Keep [] for the normal request details field only.</small>
                </label>
                <label>
                  Task templates
                  <div className="admin-helper-grid">
                    <input placeholder="Task title" value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} />
                    <input placeholder="Task description" value={taskDraft.description} onChange={(e) => setTaskDraft({ ...taskDraft, description: e.target.value })} />
                    <select value={taskDraft.assignmentGroupId} onChange={(e) => setTaskDraft({ ...taskDraft, assignmentGroupId: e.target.value })}>
                      <option value="">No default group</option>
                      {groups.filter((group) => group.active).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </select>
                    <button type="button" className="secondary small" onClick={() => appendTaskTemplate("edit")}>Add task</button>
                  </div>
                  <textarea rows={5} value={editCatalogItem.taskTemplates} onChange={(e) => setEditCatalogItem({ ...editCatalogItem, taskTemplates: e.target.value })} />
                  <small className="muted">Usage: auto-create fulfilment tasks for this catalogue item. Example: [{"{"}"title":"Procure laptop","assignmentGroupId":"group-id"{"}"}]. Keep [] if no child tasks are required.</small>
                </label>
                <label className="check-row">
                  <input type="checkbox" checked={editCatalogItem.active} onChange={(e) => setEditCatalogItem({ ...editCatalogItem, active: e.target.checked })} />
                  Active
                </label>
                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={() => { setEditingCatalogItem(null); setCatalogPanel("catalog-list"); }}>Cancel</button>
                  <button className="primary" disabled={busy}>Save catalogue item</button>
                </div>
              </form>}
              {editingCategory && catalogPanel === "edit-category" && <form className="admin-form" onSubmit={saveCategoryEdit}>
                <h2>Edit category</h2>
                <label>
                  Category name
                  <input required value={editCategory.name} onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })} />
                </label>
                <label>
                  Description
                  <textarea rows={3} value={editCategory.description} onChange={(e) => setEditCategory({ ...editCategory, description: e.target.value })} />
                </label>
                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={() => { setEditingCategory(null); setCatalogPanel("catalog-list"); }}>Cancel</button>
                  <button className="primary" disabled={busy}>Save category</button>
                </div>
              </form>}
            </div>
            {catalogPanel === "approval-list" && <div className="admin-list">
              <h2>Approval Rules <span>{catalog.reduce((total, category) => total + category.items.reduce((itemTotal, item) => itemTotal + (item.approvalRules?.length || 0), 0), 0)}</span></h2>
              {catalog.every((category) => category.items.every((item) => !item.approvalRules?.length)) && <p className="muted">No active approval rules yet.</p>}
              <div className="catalog-items">
                {catalog.flatMap((category) => category.items.flatMap((item) => (item.approvalRules || []).map((rule) => (
                  <div className="catalog-item-row" key={rule.id}>
                    <div>
                      <b>{category.name} — {item.name}</b>
                      <small>Step {rule.sequence} · {rule.approvalType.replace("_", " ")}</small>
                      <small>{rule.approvalType === "MANAGER" ? "Requester's manager" : rule.approvalType === "GROUP" ? rule.approvalGroup?.name || "Approval group missing" : rule.specificApprover?.name || "Specific approver missing"}</small>
                    </div>
                    <button className="secondary small" onClick={() => startEditApprovalRule(rule, item.id)}>Edit</button>
                  </div>
                ))))}
              </div>
            </div>}
            {catalogPanel === "catalog-list" && <div className="admin-list">
              <h2>Categories <span>{catalog.length}</span></h2>
              {catalog.length === 0 && <p className="muted">No request categories yet.</p>}
              <div className="catalog-tile-grid">
                {catalog.map((category) => (
                  <article className="catalog-category-tile" key={category.id}>
                    <button type="button" className="catalog-tile-main" onClick={() => openCategoryItems(category)}>
                      <b>{category.name}</b>
                      <small>{category.description || "No description"}</small>
                      <span>{category.items.length} item(s)</span>
                    </button>
                    <button className="secondary small" onClick={() => startEditCategory(category)}>Edit</button>
                  </article>
                ))}
              </div>
            </div>}
            {catalogPanel === "category-items" && <div className="admin-list">
              {(() => {
                const category = selectedCategory ? catalog.find((x) => x.id === selectedCategory.id) || selectedCategory : null;
                if (!category) return <p className="muted">Choose a category from the Catalogue List.</p>;
                return <>
                  <div className="admin-list-head">
                    <h2>{category.name} <span>{category.items.length}</span></h2>
                    <button className="secondary small" onClick={() => setCatalogPanel("catalog-list")}>Back to categories</button>
                  </div>
                  <p className="muted">{category.description || "No category description."}</p>
                  <div className="catalog-items">
                    {category.items.length === 0 ? <p className="muted">No active catalogue items in this category.</p> : category.items.map((item) => (
                      <div className="catalog-item-row" key={item.id}>
                        <div>
                          <b>{item.name}</b>
                          <small>{item.description || "No description"}</small>
                          <small>Routes to {item.defaultAssignmentGroup?.name || "No default group"}</small>
                          <small>{item.approvalRules?.length || 0} approval rule(s) · {Array.isArray(item.taskTemplates) ? item.taskTemplates.length : 0} task template(s)</small>
                        </div>
                        <button className="secondary small" onClick={() => startEditCatalogItem(item)}>Edit</button>
                      </div>
                    ))}
                  </div>
                </>;
              })()}
            </div>}
          </div>
        )}
        {tab === "change-approvals" && (
          <div className="admin-grid">
            <div className="admin-form-stack">
              <div className="admin-form admin-card-menu">
                <button type="button" className={changeApprovalPanel === "add-rule" ? "secondary active" : "secondary"} onClick={() => setChangeApprovalPanel("add-rule")}>Add Approval Step</button>
                <button type="button" className={["rule-list", "edit-rule"].includes(changeApprovalPanel) ? "secondary active" : "secondary"} onClick={() => setChangeApprovalPanel("rule-list")}>Approval Step List</button>
              </div>
              {changeApprovalPanel === "add-rule" && <form className="admin-form" onSubmit={createChangeApprovalRule}>
                <h2>Add change approval step</h2>
                <p className="muted">These active steps are copied to every new change. Use sequence to define the approval order.</p>
                <label>Sequence<input type="number" min={1} value={newChangeApprovalRule.sequence} onChange={(e) => setNewChangeApprovalRule({ ...newChangeApprovalRule, sequence: Number(e.target.value) })} /></label>
                <label>Approval type<select value={newChangeApprovalRule.approvalType} onChange={(e) => setNewChangeApprovalRule({ ...newChangeApprovalRule, approvalType: e.target.value, approvalGroupId: "", specificApproverId: "" })}>
                  <option value="CAB">CAB approval</option>
                  <option value="GROUP">Approval group</option>
                  <option value="SPECIFIC_USER">Specific user</option>
                  <option value="MANAGER">Requester's manager</option>
                  <option value="SECURITY">Information Security</option>
                  <option value="ITAM">ITAM approval</option>
                </select></label>
                {changeGroupApprovalTypes.includes(newChangeApprovalRule.approvalType) && <label>Approval group<select required value={newChangeApprovalRule.approvalGroupId} onChange={(e) => setNewChangeApprovalRule({ ...newChangeApprovalRule, approvalGroupId: e.target.value })}><option value="">Select approval group</option>{groups.filter((group) => group.active && ["APPROVAL", "BOTH"].includes(group.groupType || "")).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}
                {newChangeApprovalRule.approvalType === "SPECIFIC_USER" && <label>Approver<select required value={newChangeApprovalRule.specificApproverId} onChange={(e) => setNewChangeApprovalRule({ ...newChangeApprovalRule, specificApproverId: e.target.value })}><option value="">Select approver</option>{users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>}
                <button className="primary" disabled={busy}>Create approval step</button>
              </form>}
              {editingChangeApprovalRule && changeApprovalPanel === "edit-rule" && <form className="admin-form" onSubmit={saveChangeApprovalRuleEdit}>
                <h2>Edit change approval step</h2>
                <label>Sequence<input type="number" min={1} value={editChangeApprovalRule.sequence} onChange={(e) => setEditChangeApprovalRule({ ...editChangeApprovalRule, sequence: Number(e.target.value) })} /></label>
                <label>Approval type<select value={editChangeApprovalRule.approvalType} onChange={(e) => setEditChangeApprovalRule({ ...editChangeApprovalRule, approvalType: e.target.value, approvalGroupId: "", specificApproverId: "" })}>
                  <option value="CAB">CAB approval</option>
                  <option value="GROUP">Approval group</option>
                  <option value="SPECIFIC_USER">Specific user</option>
                  <option value="MANAGER">Requester's manager</option>
                  <option value="SECURITY">Information Security</option>
                  <option value="ITAM">ITAM approval</option>
                </select></label>
                {changeGroupApprovalTypes.includes(editChangeApprovalRule.approvalType) && <label>Approval group<select required value={editChangeApprovalRule.approvalGroupId} onChange={(e) => setEditChangeApprovalRule({ ...editChangeApprovalRule, approvalGroupId: e.target.value })}><option value="">Select approval group</option>{groups.filter((group) => group.active && ["APPROVAL", "BOTH"].includes(group.groupType || "")).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}
                {editChangeApprovalRule.approvalType === "SPECIFIC_USER" && <label>Approver<select required value={editChangeApprovalRule.specificApproverId} onChange={(e) => setEditChangeApprovalRule({ ...editChangeApprovalRule, specificApproverId: e.target.value })}><option value="">Select approver</option>{users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>}
                <label className="check-row"><input type="checkbox" checked={editChangeApprovalRule.active} onChange={(e) => setEditChangeApprovalRule({ ...editChangeApprovalRule, active: e.target.checked })} />Active</label>
                <div className="modal-actions"><button type="button" className="secondary" onClick={() => { setEditingChangeApprovalRule(null); setChangeApprovalPanel("rule-list"); }}>Cancel</button><button className="primary" disabled={busy}>Save approval step</button></div>
              </form>}
            </div>
            {changeApprovalPanel === "rule-list" && <div className="admin-list">
              <h2>Change Approval Steps <span>{changeApprovalRules.length}</span></h2>
              <p className="muted">Active steps are applied to newly created changes. Existing changes keep their already-generated approval list.</p>
              {changeApprovalRules.length === 0 && <p className="muted">No change approval process configured yet.</p>}
              <div className="catalog-items">
                {changeApprovalRules.map((rule) => (
                  <div className="catalog-item-row" key={rule.id}>
                    <div>
                      <b>Step {rule.sequence} · {rule.approvalType.replace("_", " ")}</b>
                      <small>{changeGroupApprovalTypes.includes(rule.approvalType) ? rule.approvalGroup?.name || "Approval group missing" : rule.approvalType === "SPECIFIC_USER" ? rule.specificApprover?.name || "Specific approver missing" : "Requester's manager"}</small>
                      <small>{rule.active ? "Active" : "Inactive"}</small>
                    </div>
                    <button className="secondary small" onClick={() => startEditChangeApprovalRule(rule)}>Edit</button>
                  </div>
                ))}
              </div>
            </div>}
          </div>
        )}
        {tab === "cmdb-settings" && (
          <div className="admin-grid">
            <div className="admin-form-stack">
              <div className="admin-form admin-card-menu">
                <button type="button" className={cmdbPanel === "categories" ? "secondary active" : "secondary"} onClick={() => setCmdbPanel("categories")}>CI Categories</button>
                <button type="button" className={cmdbPanel === "types" ? "secondary active" : "secondary"} onClick={() => setCmdbPanel("types")}>CI Types</button>
                <button type="button" className={cmdbPanel === "relationship-types" ? "secondary active" : "secondary"} onClick={() => setCmdbPanel("relationship-types")}>Relationship Types</button>
              </div>
              {cmdbPanel === "categories" && <form className="admin-form" onSubmit={createCiCategory}>
                <h2>Add CI Category</h2>
                <label>Name<input required value={newCiCategory.name} onChange={(e) => setNewCiCategory({ ...newCiCategory, name: e.target.value })} /></label>
                <label>Description<textarea rows={3} value={newCiCategory.description} onChange={(e) => setNewCiCategory({ ...newCiCategory, description: e.target.value })} /></label>
                <button className="primary" disabled={busy}>Save category</button>
              </form>}
              {cmdbPanel === "types" && <form className="admin-form" onSubmit={createCiType}>
                <h2>Add CI Type</h2>
                <label>Category<select required value={newCiType.categoryId} onChange={(e) => setNewCiType({ ...newCiType, categoryId: e.target.value })}>{cmdbSettings.categories.filter((category) => category.active !== false).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label>Name<input required value={newCiType.name} onChange={(e) => setNewCiType({ ...newCiType, name: e.target.value })} /></label>
                <label>Description<textarea rows={3} value={newCiType.description} onChange={(e) => setNewCiType({ ...newCiType, description: e.target.value })} /></label>
                <button className="primary" disabled={busy || !newCiType.categoryId}>Save type</button>
              </form>}
              {cmdbPanel === "relationship-types" && <form className="admin-form" onSubmit={createCiRelationshipType}>
                <h2>Add Relationship Type</h2>
                <label>Name<input required value={newCiRelationshipType.name} onChange={(e) => setNewCiRelationshipType({ ...newCiRelationshipType, name: e.target.value })} /></label>
                <label>Description<textarea rows={3} value={newCiRelationshipType.description} onChange={(e) => setNewCiRelationshipType({ ...newCiRelationshipType, description: e.target.value })} /></label>
                <button className="primary" disabled={busy}>Save relationship type</button>
              </form>}
            </div>
            <div className="admin-list">
              {cmdbPanel === "categories" && <>
                <h2>CI Categories</h2>
                {cmdbSettings.categories.map((category) => <article key={category.id}><div><input defaultValue={category.name} onBlur={(e) => e.target.value !== category.name && updateCiCategory(category, { name: e.target.value })} /><small><input defaultValue={category.description || ""} placeholder="Description" onBlur={(e) => e.target.value !== (category.description || "") && updateCiCategory(category, { description: e.target.value })} /></small></div><button className="secondary small" disabled={busy} onClick={() => updateCiCategory(category, { active: category.active === false })}>{category.active === false ? "Activate" : "Deactivate"}</button></article>)}
              </>}
              {cmdbPanel === "types" && <>
                <h2>CI Types</h2>
                {cmdbSettings.types.map((type) => <article key={type.id}><div><input defaultValue={type.name} onBlur={(e) => e.target.value !== type.name && updateCiType(type, { name: e.target.value })} /><small><input defaultValue={type.description || ""} placeholder="Description" onBlur={(e) => e.target.value !== (type.description || "") && updateCiType(type, { description: e.target.value })} /></small></div><select value={type.categoryId} disabled={busy} onChange={(e) => updateCiType(type, { categoryId: e.target.value })}>{cmdbSettings.categories.filter((category) => category.active !== false).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button className="secondary small" disabled={busy} onClick={() => updateCiType(type, { active: type.active === false })}>{type.active === false ? "Activate" : "Deactivate"}</button></article>)}
              </>}
              {cmdbPanel === "relationship-types" && <>
                <h2>Relationship Types</h2>
                {cmdbSettings.relationshipTypes.map((type) => <article key={type.id}><div><input defaultValue={type.name} onBlur={(e) => e.target.value !== type.name && updateCiRelationshipType(type, { name: e.target.value })} /><small><input defaultValue={type.description || ""} placeholder="Description" onBlur={(e) => e.target.value !== (type.description || "") && updateCiRelationshipType(type, { description: e.target.value })} /></small></div><button className="secondary small" disabled={busy} onClick={() => updateCiRelationshipType(type, { active: type.active === false })}>{type.active === false ? "Activate" : "Deactivate"}</button></article>)}
              </>}
            </div>
          </div>
        )}
        {tab === "slas" && (
          <div className="admin-grid">
            <div className="admin-form-stack">
              <div className="admin-form admin-card-menu">
                <button type="button" className={slaPanel === "add-sla" ? "secondary active" : "secondary"} onClick={() => setSlaPanel("add-sla")}>Add SLA Policy</button>
                <button type="button" className={slaPanel === "add-calendar" ? "secondary active" : "secondary"} onClick={() => setSlaPanel("add-calendar")}>Add Calendar</button>
                <button type="button" className={slaPanel === "sla-list" ? "secondary active" : "secondary"} onClick={() => setSlaPanel("sla-list")}>SLA Policy List</button>
              </div>
              {slaPanel === "add-sla" && <form className="admin-form" onSubmit={createSla}>
                <h2>Add SLA policy</h2>
                <p className="muted">
                  For Service Requests, choose ticket type SERVICE_REQUEST. New requests snapshot the matching SLA when submitted.
                </p>
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
              </form>}
              {slaPanel === "add-calendar" && <div className="admin-form">
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
              </div>}
              {editingSla && slaPanel === "edit-sla" && <div className="admin-form">
                <h2>Edit SLA policy</h2>
                <p className="muted">
                  Existing SLA policies are versioned. For now, this screen safely handles activation status; deeper edits should create a new policy version.
                </p>
                <label>
                  Name
                  <input value={editingSla.name} disabled />
                </label>
                <label>
                  Scope
                  <input value={`${editingSla.ticketType?.name || "All tickets"} · ${editingSla.priority?.name || "All priorities"} · ${editingSla.calendar.name}`} disabled />
                </label>
                <label>
                  Targets
                  <input value={`Response: ${editingSla.responseTargetMinutes} min · Resolution: ${editingSla.resolutionTargetMinutes} min`} disabled />
                </label>
                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={() => { setEditingSla(null); setSlaPanel("sla-list"); }}>Cancel</button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={!editingSla.active || busy}
                    onClick={async () => {
                      await api.deactivateAdminSla(token, editingSla.id);
                      setEditingSla(null);
                      setSlaPanel("sla-list");
                      await load();
                    }}
                  >
                    {editingSla.active ? "Deactivate" : "Inactive"}
                  </button>
                </div>
              </div>}
            </div>
            {slaPanel === "sla-list" && <div className="admin-list">
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
                  <button className="secondary small" onClick={() => startEditSla(s)}>Edit</button>
                </article>
              ))}
            </div>}
          </div>
        )}
        {tab === "settings" && (
          <form className="admin-grid" onSubmit={saveSettings}>
            <div className="admin-form admin-card-menu">
              <button type="button" className={settingsPanel === "branding" ? "secondary active" : "secondary"} onClick={() => setSettingsPanel("branding")}>Organisation & Branding</button>
              <button type="button" className={settingsPanel === "storage" ? "secondary active" : "secondary"} onClick={() => setSettingsPanel("storage")}>Attachments & Storage</button>
            </div>
            {settingsPanel === "branding" && <div className="admin-form settings-section">
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
            </div>}
            {settingsPanel === "storage" && <div className="settings-column">
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
            </div>}
          </form>
        )}
        {tab === "slas" && <CalendarEditor token={token} onCreated={load} />}
      </section>
    </div>
  );
}
