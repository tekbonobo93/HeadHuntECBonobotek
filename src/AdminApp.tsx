import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Database,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Moon,
  RefreshCw,
  Settings,
  ShieldCheck,
  Siren,
  Sun,
  TriangleAlert,
  Users,
} from "lucide-react";
import { AdminObservabilityResponse, AdminSecurityEvent, AdminUserRecord, AuthUser } from "./types";
import { assertAdminUser } from "./utils/authz";
import {
  ApiError,
  fetchAdminObservability,
  fetchAdminSecurityEvents,
  fetchAdminUsers,
  revokeAdminUserSessions,
  updateAdminUserLock,
  updateAdminUserRole,
} from "./utils/serverState";

type AdminTab = "dashboard" | "users" | "security" | "observability" | "settings";

interface AdminAppProps {
  authUser: AuthUser;
  onLogout: () => Promise<void>;
}

interface AdminModuleDefinition {
  id: AdminTab;
  label: string;
  title: string;
  description: string;
  icon: typeof LayoutDashboard;
}

const ADMIN_MODULES: AdminModuleDefinition[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Centro de mando administrativo",
    description: "Resumen ejecutivo del estado de la plataforma, actividad reciente y puntos de atencion.",
    icon: LayoutDashboard,
  },
  {
    id: "users",
    label: "Usuarios",
    title: "Gestion de usuarios",
    description: "Listado de cuentas, roles, verificacion de correo y altas recientes.",
    icon: Users,
  },
  {
    id: "security",
    label: "Seguridad",
    title: "Seguridad y autenticacion",
    description: "Alertas, errores recientes y senales operativas relevantes para acceso y estabilidad.",
    icon: ShieldCheck,
  },
  {
    id: "observability",
    label: "Observabilidad",
    title: "Estado tecnico del sistema",
    description: "Salud del backend, base de datos, volumen de requests y metricas por ruta.",
    icon: Activity,
  },
  {
    id: "settings",
    label: "Configuracion",
    title: "Configuracion administrativa",
    description: "Espacio reservado para acciones administrativas sensibles en fases posteriores.",
    icon: Settings,
  },
];

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sin registro";
  }

  return new Date(value).toLocaleString("es-CO");
}

function formatDurationFromSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function AdminModuleCard({
  title,
  description,
  status,
  icon: Icon,
}: {
  title: string;
  description: string;
  status: string;
  icon: typeof LayoutDashboard;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{status}</p>
          <h3 className="mt-2 text-lg font-black text-slate-950">{title}</h3>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-500">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}

function MetricTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneStyles =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  return (
    <article className={`rounded-3xl border p-5 shadow-xs ${toneStyles}`}>
      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p>
    </article>
  );
}

function AdminSectionState({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <LoaderCircle className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm font-bold">Cargando datos administrativos...</p>
        </div>
      </div>
    );
  }

  if (!error) {
    return null;
  }

  return (
    <div className="rounded-[28px] border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 text-red-500" />
        <div>
          <h3 className="text-lg font-black text-red-950">No fue posible cargar el modulo administrativo</h3>
          <p className="mt-2 text-sm leading-6 text-red-700">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}

function getDashboardMetrics(users: AdminUserRecord[], observability: AdminObservabilityResponse | null) {
  const totalUsers = users.length;
  const verifiedUsers = users.filter((user) => user.emailVerified).length;
  const adminUsers = users.filter((user) => user.role === "admin").length;

  return {
    totalUsers,
    verifiedUsers,
    adminUsers,
    requestVolume: observability?.requests.windowCount ?? 0,
    requestErrors: observability?.requests.windowErrors ?? 0,
    geminiFailures: observability?.gemini.windowFailures ?? 0,
  };
}

function confirmSensitiveAction(message: string) {
  if (typeof window === "undefined") {
    return true;
  }

  return window.confirm(message);
}

export default function AdminApp({ authUser, onLogout }: AdminAppProps) {
  assertAdminUser(authUser);

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [observability, setObservability] = useState<AdminObservabilityResponse | null>(null);
  const [securityEvents, setSecurityEvents] = useState<AdminSecurityEvent[]>([]);
  const [securityLevel, setSecurityLevel] = useState<"all" | "info" | "warn" | "error">("all");
  const [securitySearch, setSecuritySearch] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rowActionKey, setRowActionKey] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingObservability, setLoadingObservability] = useState(true);
  const [loadingSecurity, setLoadingSecurity] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [observabilityError, setObservabilityError] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem("talentomatch_theme") === "dark";
  });

  const activeModule = useMemo(
    () => ADMIN_MODULES.find((module) => module.id === activeTab) ?? ADMIN_MODULES[0],
    [activeTab],
  );

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      setUsersError(null);
      const response = await fetchAdminUsers();
      setUsers(response.users);
    } catch (error) {
      setUsersError(error instanceof ApiError ? error.message : "No fue posible consultar los usuarios.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadObservability = async () => {
    try {
      setLoadingObservability(true);
      setObservabilityError(null);
      const snapshot = await fetchAdminObservability();
      setObservability(snapshot);
    } catch (error) {
      setObservabilityError(error instanceof ApiError ? error.message : "No fue posible consultar la observabilidad.");
    } finally {
      setLoadingObservability(false);
    }
  };

  const loadSecurityEvents = async (filters?: { level?: "all" | "info" | "warn" | "error"; search?: string }) => {
    try {
      setLoadingSecurity(true);
      setSecurityError(null);
      const response = await fetchAdminSecurityEvents({
        level: filters?.level ?? securityLevel,
        search: filters?.search ?? securitySearch,
        limit: 50,
      });
      setSecurityEvents(response.events);
    } catch (error) {
      setSecurityError(error instanceof ApiError ? error.message : "No fue posible consultar la auditoria de seguridad.");
    } finally {
      setLoadingSecurity(false);
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    void loadObservability();
    const interval = window.setInterval(() => {
      void loadObservability();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    void loadSecurityEvents();
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((previousValue) => {
      const nextValue = !previousValue;
      localStorage.setItem("talentomatch_theme", nextValue ? "dark" : "light");
      return nextValue;
    });
  };

  const dashboardMetrics = useMemo(() => getDashboardMetrics(users, observability), [users, observability]);
  const latestUsers = useMemo(() => [...users].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 5), [users]);
  const topRoutes = observability?.requests.routes.slice(0, 6) ?? [];
  const combinedLoading =
    activeTab === "users"
      ? loadingUsers
      : activeTab === "security"
        ? loadingObservability || loadingSecurity
        : activeTab === "settings"
          ? false
          : loadingUsers || loadingObservability;
  const combinedError =
    activeTab === "users"
      ? usersError
      : activeTab === "security"
        ? securityError || observabilityError
        : activeTab === "settings"
          ? null
          : observabilityError || usersError;

  const retryCurrentTab = () => {
    if (activeTab === "users" || activeTab === "dashboard") {
      void loadUsers();
    }

    if (activeTab !== "users" && activeTab !== "settings") {
      void loadObservability();
    }

    if (activeTab === "security") {
      void loadSecurityEvents();
    }
  };

  const syncUpdatedUser = (
    userId: string,
    patch: Partial<AdminUserRecord> & Pick<AdminUserRecord, "role">,
  ) => {
    setUsers((previousUsers) =>
      previousUsers.map((user) =>
        user.id === userId
          ? {
              ...user,
              ...patch,
            }
          : user,
      ),
    );
  };

  const runRowAction = async (key: string, action: () => Promise<void>) => {
    try {
      setRowActionKey(key);
      setActionError(null);
      setActionMessage(null);
      await action();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "No fue posible completar la accion administrativa.");
    } finally {
      setRowActionKey(null);
    }
  };

  const handleRoleToggle = async (user: AdminUserRecord) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    const confirmed = confirmSensitiveAction(
      nextRole === "admin"
        ? `Vas a otorgar privilegios de administrador a ${user.email}. ¿Deseas continuar?`
        : `Vas a retirar privilegios de administrador a ${user.email}. ¿Deseas continuar?`,
    );
    if (!confirmed) {
      return;
    }

    await runRowAction(`role:${user.id}`, async () => {
      const response = await updateAdminUserRole(user.id, nextRole);
      syncUpdatedUser(user.id, { role: response.user.role });
      setActionMessage(`Rol actualizado para ${user.email}: ahora es ${response.user.role}.`);
    });
  };

  const handleLockToggle = async (user: AdminUserRecord) => {
    const nextLocked = !user.lockedUntil;
    const confirmed = confirmSensitiveAction(
      nextLocked
        ? `Vas a bloquear la cuenta de ${user.email}. ¿Deseas continuar?`
        : `Vas a desbloquear la cuenta de ${user.email}. ¿Deseas continuar?`,
    );
    if (!confirmed) {
      return;
    }

    await runRowAction(`lock:${user.id}`, async () => {
      const response = await updateAdminUserLock(user.id, nextLocked);
      syncUpdatedUser(user.id, {
        role: response.user.role,
        failedLoginAttempts: response.failedLoginAttempts ?? user.failedLoginAttempts,
        lockedUntil: response.lockedUntil ?? null,
      });
      setActionMessage(
        nextLocked ? `Cuenta bloqueada para ${user.email}.` : `Bloqueo administrativo removido para ${user.email}.`,
      );
    });
  };

  const handleRevokeSessions = async (user: AdminUserRecord) => {
    const confirmed = confirmSensitiveAction(
      `Vas a cerrar todas las sesiones activas de ${user.email}. ¿Deseas continuar?`,
    );
    if (!confirmed) {
      return;
    }

    await runRowAction(`sessions:${user.id}`, async () => {
      const response = await revokeAdminUserSessions(user.id);
      syncUpdatedUser(user.id, {
        role: user.role,
        activeSessions: 0,
      });
      setActionMessage(`Se revocaron ${response.revokedSessions} sesiones activas de ${user.email}.`);
    });
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="grid gap-4 xl:grid-cols-3">
        <AdminModuleCard
          title="Operacion administrativa activa"
          description="La plataforma ya distingue navegacion, rol y APIs administrativas del flujo del candidato."
          status="Base lista"
          icon={ShieldCheck}
        />
        <AdminModuleCard
          title="Sistema monitoreado"
          description="La vista de observabilidad consume el snapshot operativo real del backend y se refresca automaticamente."
          status={observability?.database.status === "healthy" ? "Saludable" : "Revisar"}
          icon={Activity}
        />
        <AdminModuleCard
          title="Gestion de usuarios"
          description="El listado administrativo ya presenta roles, verificacion y fechas de alta para control de acceso."
          status={`${dashboardMetrics.totalUsers} usuarios`}
          icon={Users}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Usuarios totales"
          value={String(dashboardMetrics.totalUsers)}
          hint={`${dashboardMetrics.adminUsers} con rol admin`}
        />
        <MetricTile
          label="Correos verificados"
          value={String(dashboardMetrics.verifiedUsers)}
          hint="Cuentas listas para operar en el sistema."
          tone="good"
        />
        <MetricTile
          label="Requests ventana"
          value={String(dashboardMetrics.requestVolume)}
          hint={`${dashboardMetrics.requestErrors} errores recientes`}
          tone={dashboardMetrics.requestErrors > 0 ? "warn" : "good"}
        />
        <MetricTile
          label="Fallos Gemini"
          value={String(dashboardMetrics.geminiFailures)}
          hint="Incidentes acumulados en la ventana de observabilidad."
          tone={dashboardMetrics.geminiFailures > 0 ? "warn" : "good"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Usuarios recientes</p>
              <h3 className="mt-2 text-xl font-black text-slate-950">Actividad de altas</h3>
            </div>
            <BadgeCheck className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="mt-5 space-y-3">
            {latestUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{user.role}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(user.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Alertas</p>
              <h3 className="mt-2 text-xl font-black text-slate-950">Estado del sistema</h3>
            </div>
            <Siren className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-5 space-y-3">
            {[
              {
                label: "Base de datos degradada",
                active: observability?.alerts.dbUnavailableActive ?? false,
              },
              {
                label: "Tasa alta de errores",
                active: observability?.alerts.highErrorRateActive ?? false,
              },
              {
                label: "Fallos Gemini activos",
                active: observability?.alerts.geminiFailuresActive ?? false,
              },
            ].map((alert) => (
              <div key={alert.label} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">{alert.label}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
                    alert.active ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {alert.active ? "Activa" : "Normal"}
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Rutas calientes</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">Top endpoints por trafico</h3>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                <th className="pb-3">Ruta</th>
                <th className="pb-3">Requests</th>
                <th className="pb-3">Error rate</th>
                <th className="pb-3">Promedio</th>
                <th className="pb-3">Ultimo estado</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {topRoutes.map((route) => (
                <tr key={route.route} className="border-t border-slate-100">
                  <td className="py-3 font-semibold">{route.route}</td>
                  <td className="py-3">{route.count}</td>
                  <td className="py-3">{(route.errorRate * 100).toFixed(1)}%</td>
                  <td className="py-3">{route.avgDurationMs.toFixed(2)} ms</td>
                  <td className="py-3">{route.lastStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );

  const renderUsers = () => (
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Directorio</p>
          <h3 className="mt-2 text-xl font-black text-slate-950">Usuarios del sistema</h3>
        </div>
        <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
          {users.length} registros
        </div>
      </div>
      {(actionMessage || actionError) && (
        <div
          className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
            actionError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {actionError || actionMessage}
        </div>
      )}
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              <th className="pb-3">Nombre</th>
              <th className="pb-3">Correo</th>
              <th className="pb-3">Rol</th>
              <th className="pb-3">Verificado</th>
              <th className="pb-3">Seguridad</th>
              <th className="pb-3">Sesiones</th>
              <th className="pb-3">Creado</th>
              <th className="pb-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="py-3 font-semibold text-slate-900">{user.name}</td>
                <td className="py-3">{user.email}</td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
                      user.role === "admin" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
                      user.emailVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {user.emailVerified ? "Si" : "No"}
                  </span>
                </td>
                <td className="py-3">
                  <div className="space-y-1">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
                        user.lockedUntil ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {user.lockedUntil ? "Bloqueado" : "Normal"}
                    </span>
                    <p className="text-xs text-slate-500">Intentos fallidos: {user.failedLoginAttempts}</p>
                  </div>
                </td>
                <td className="py-3">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
                    {user.activeSessions}
                  </span>
                </td>
                <td className="py-3">{formatDateTime(user.createdAt)}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRoleToggle(user)}
                      disabled={rowActionKey !== null}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rowActionKey === `role:${user.id}` ? "Actualizando..." : user.role === "admin" ? "Quitar admin" : "Dar admin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleLockToggle(user)}
                      disabled={rowActionKey !== null}
                      className="rounded-xl border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rowActionKey === `lock:${user.id}` ? "Aplicando..." : user.lockedUntil ? "Desbloquear" : "Bloquear"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRevokeSessions(user)}
                      disabled={rowActionKey !== null || user.activeSessions === 0}
                      className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rowActionKey === `sessions:${user.id}` ? "Revocando..." : "Cerrar sesiones"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );

  const renderSecurity = () => (
    <div className="grid gap-6 xl:grid-cols-2">
      <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Supervision</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">Eventos y alertas de seguridad</h3>
          </div>
          <ShieldCheck className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Tasa de error de requests</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {((observability?.requests.windowErrorRate ?? 0) * 100).toFixed(1)}%
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Ventana activa de {observability?.alerts.requestWindowMinutes ?? 0} minutos.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Fallos Gemini en ventana</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{observability?.gemini.windowFailures ?? 0}</p>
            <p className="mt-2 text-sm text-slate-600">
              Ultimo incidente: {formatDateTime(observability?.gemini.lastFailureAt ?? null)}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Hallazgos</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">Lectura ejecutiva</h3>
          </div>
          <TriangleAlert className="h-5 w-5 text-amber-500" />
        </div>
        <div className="mt-5 space-y-3">
          {[
            observability?.alerts.highErrorRateActive
              ? "El backend reporta una tasa alta de errores. Conviene revisar las rutas con mayor errorRate."
              : "No hay una alerta activa por tasa elevada de errores HTTP.",
            observability?.alerts.geminiFailuresActive
              ? "Hay una alerta activa por fallos del proveedor Gemini en la ventana operativa."
              : "No hay una alerta activa de Gemini en este momento.",
            observability?.database.status === "degraded"
              ? `La base de datos esta degradada. Ultimo error: ${observability?.database.lastError || "sin detalle"}.`
              : "La base de datos se reporta estable en el ultimo chequeo.",
          ].map((message) => (
            <div key={message} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700">
              {message}
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs xl:col-span-2">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Auditoria</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">Eventos recientes de seguridad</h3>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={securityLevel}
              onChange={(event) => {
                const nextLevel = event.target.value as "all" | "info" | "warn" | "error";
                setSecurityLevel(nextLevel);
                void loadSecurityEvents({ level: nextLevel, search: securitySearch });
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="all">Todos los niveles</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
            <input
              value={securitySearch}
              onChange={(event) => setSecuritySearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void loadSecurityEvents({ level: securityLevel, search: securitySearch });
                }
              }}
              placeholder="Buscar evento, ruta o actor"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={() => void loadSecurityEvents({ level: securityLevel, search: securitySearch })}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Filtrar
            </button>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {securityEvents.map((entry) => (
            <div key={`${entry.timestamp}:${entry.event}:${entry.path}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                        entry.level === "error"
                          ? "bg-red-100 text-red-800"
                          : entry.level === "warn"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {entry.level}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{entry.event}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {entry.method} {entry.path} · IP {entry.ip}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(entry.timestamp)}</p>
                </div>
                <div className="max-w-xl rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
                  {JSON.stringify(entry.details)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );

  const renderObservability = () => (
    <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
      <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Backend</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">Salud operativa</h3>
          </div>
          <Database className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Uptime</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {formatDurationFromSeconds(observability?.uptimeSeconds ?? 0)}
            </p>
            <p className="mt-2 text-sm text-slate-600">Iniciado en {formatDateTime(observability?.startedAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Base de datos</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{observability?.database.status ?? "unknown"}</p>
            <p className="mt-2 text-sm text-slate-600">Latencia: {observability?.database.latencyMs ?? 0} ms</p>
            <p className="mt-1 text-sm text-slate-600">
              Ultimo chequeo: {formatDateTime(observability?.database.lastCheckedAt ?? null)}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Trafico</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">Metricas por ruta</h3>
          </div>
          <Activity className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                <th className="pb-3">Ruta</th>
                <th className="pb-3">Count</th>
                <th className="pb-3">Errores</th>
                <th className="pb-3">Promedio</th>
                <th className="pb-3">Max</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {topRoutes.map((route) => (
                <tr key={route.route} className="border-t border-slate-100">
                  <td className="py-3 font-semibold text-slate-900">{route.route}</td>
                  <td className="py-3">{route.count}</td>
                  <td className="py-3">{route.errors}</td>
                  <td className="py-3">{route.avgDurationMs.toFixed(2)} ms</td>
                  <td className="py-3">{route.maxDurationMs.toFixed(2)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );

  const renderSettings = () => (
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Configuracion</p>
      <h3 className="mt-2 text-xl font-black text-slate-950">Herramientas administrativas preparadas</h3>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
        La configuracion queda reservada para operaciones sensibles en fases posteriores. En esta fase se priorizo visibilidad de
        usuarios y observabilidad real antes de habilitar acciones de mutacion administrativa.
      </p>
    </article>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.05),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-slate-950 text-white lg:min-h-screen lg:w-80 lg:border-b-0 lg:border-r lg:border-slate-800">
          <div className="flex h-full flex-col p-6 lg:p-8">
            <div>
              <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">
                Admin workspace
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-tight">TalentoMatch Control</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Espacio administrativo aislado de la experiencia operativa del candidato.
              </p>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Sesion activa</p>
              <p className="mt-3 text-lg font-bold text-white">{authUser.name}</p>
              <p className="mt-1 text-sm text-slate-400">{authUser.email}</p>
              <div className="mt-4 inline-flex rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-200">
                Rol: {authUser.role}
              </div>
            </div>

            <nav className="mt-8 flex flex-1 flex-col gap-2">
              {ADMIN_MODULES.map((module) => {
                const Icon = module.icon;

                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => setActiveTab(module.id)}
                    className={`flex items-start gap-4 rounded-2xl px-4 py-4 text-left transition-all ${
                      activeTab === module.id
                        ? "bg-white text-slate-950 shadow-lg shadow-slate-950/20"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <div
                      className={`rounded-2xl p-2.5 ${
                        activeTab === module.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black">{module.label}</p>
                      <p
                        className={`mt-1 text-xs leading-5 ${
                          activeTab === module.id ? "text-slate-600" : "text-slate-400"
                        }`}
                      >
                        {module.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-800"
              >
                {isDarkMode ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-slate-300" />}
                Tema
              </button>
              <button
                type="button"
                onClick={() => void onLogout()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 transition-colors hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8 lg:p-10">
          <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-xs backdrop-blur md:p-8">
            <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500">Fase 3</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{activeModule.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{activeModule.description}</p>
              </div>
              <div className="rounded-3xl border border-indigo-100 bg-indigo-50 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-500">Estado</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Datos reales cargados desde `/api/admin/*` con control por rol y refresco operativo.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <AdminSectionState isLoading={combinedLoading} error={combinedError} onRetry={retryCurrentTab} />
              {!combinedLoading && !combinedError && (
                <>
                  {activeTab === "dashboard" && renderDashboard()}
                  {activeTab === "users" && renderUsers()}
                  {activeTab === "security" && renderSecurity()}
                  {activeTab === "observability" && renderObservability()}
                  {activeTab === "settings" && renderSettings()}
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
