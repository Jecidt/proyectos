"use client";

import { useState, useCallback } from "react";
import { SAFE_BOT_LIMITS } from "@/lib/store";

interface BotAccount {
  id: string;
  platform: string;
  igUsername: string;
  email: string;
  password: string;
  verificationStatus: string;
  status: "available" | "deployed" | "banned" | "pending_verification";
  createdAt: string;
  lastUsedAt?: string;
  proxy?: string;
  followsToday: number;
  totalFollowsDelivered: number;
  userAgent: string;
  igUserId?: string;
  notes?: string;
}

interface AdminOrder {
  id: string;
  igUsername: string;
  packageName: string;
  followers: number;
  price: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  deployedAt?: string;
  deliveredAt?: string;
  receiptCode: string;
  deliveryTime: string;
  botsUsed: number;
}

interface Stats {
  totalBots: number;
  availableBots: number;
  deployedBots: number;
  bannedBots: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  totalFollowersDelivered: number;
}

interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
  jobs: Array<{
    orderId: string;
    targetUsername: string;
    botCount: number;
    attempts: number;
  }>;
}

interface AdminData {
  stats: Stats;
  bots: BotAccount[];
  orders: AdminOrder[];
  safeLimits: typeof SAFE_BOT_LIMITS;
  queueStatus?: QueueStatus;
}

type AdminTab = "dashboard" | "bots" | "orders" | "tips";

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [expandedBot, setExpandedBot] = useState<string | null>(null);

  // Generate bots state
  const [genQty, setGenQty] = useState("5");
  const [genProxy, setGenProxy] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<string>("");
  const [genError, setGenError] = useState<string>("");
  const [useRealRegistration, setUseRealRegistration] = useState(false);
  const [genAccounts, setGenAccounts] = useState<Array<{
    igUsername: string;
    email: string;
    status: string;
    error?: string;
  }>>([]);

  const fetchData = useCallback(async (pwd: string) => {
    try {
      const res = await fetch(`/api/admin?password=${encodeURIComponent(pwd)}`);
      const d = await res.json();
      if (!res.ok) {
        setAuthError(d.error || "Error");
        return false;
      }
      setData(d);
      return true;
    } catch {
      setAuthError("Error de conexión");
      return false;
    }
  }, []);

  const handleLogin = async () => {
    setAuthError("");
    const ok = await fetchData(password);
    if (ok) setAuthenticated(true);
  };

  const handleGenerate = async () => {
    setGenError("");
    setGenResult("");
    setGenAccounts([]);
    setGenLoading(true);
    try {
      const res = await fetch("/api/bots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: Number(genQty),
          proxy: genProxy || undefined,
          realRegistration: useRealRegistration,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setGenError(d.error || "Error");
      } else {
        const successCount = d.accounts?.filter((a: { status: string }) => a.status === "available").length || 0;
        const pendingCount = d.accounts?.filter((a: { status: string }) => a.status === "pending_verification").length || 0;
        setGenResult(
          `✅ ${d.generated} cuentas generadas. ${successCount} disponibles, ${pendingCount} pendientes de verificación. Disponibles totales: ${d.stats?.availableBots || 0}`
        );
        setGenAccounts(d.accounts || []);
        await fetchData(password);
      }
    } catch {
      setGenError("Error de conexión");
    } finally {
      setGenLoading(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!confirm("¿Eliminar esta cuenta bot?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, botId }),
      });
      if (res.ok) {
        await fetchData(password);
      }
    } catch {
      // ignore
    }
  };

  const handleMarkBanned = async (botId: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, botId, status: "banned" }),
      });
      if (res.ok) {
        await fetchData(password);
      }
    } catch {
      // ignore
    }
  };

  const handleMarkAvailable = async (botId: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, botId, status: "available" }),
      });
      if (res.ok) {
        await fetchData(password);
      }
    } catch {
      // ignore
    }
  };

  const tabClass = (tab: AdminTab) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
      activeTab === tab
        ? "bg-indigo-600 text-white"
        : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
    }`;

  const botStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      available: "bg-green-900/40 text-green-300 border-green-700",
      deployed: "bg-blue-900/40 text-blue-300 border-blue-700",
      banned: "bg-red-900/40 text-red-300 border-red-700",
      pending_verification: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
    };
    const labels: Record<string, string> = {
      available: "✅ Disponible",
      deployed: "🚀 Desplegado",
      banned: "🚫 Baneado",
      pending_verification: "⏳ Verificando",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs border font-medium ${
          map[status] || "bg-neutral-800 text-neutral-300 border-neutral-700"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  const verificationBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      unverified: { label: "Sin verificar", cls: "text-neutral-500" },
      email_verified: { label: "✉️ Email", cls: "text-blue-400" },
      phone_verified: { label: "📱 Teléfono", cls: "text-green-400" },
      fully_verified: { label: "✅ Completo", cls: "text-emerald-400" },
    };
    const v = map[status] || { label: status, cls: "text-neutral-500" };
    return <span className={`text-xs font-medium ${v.cls}`}>{v.label}</span>;
  };

  const orderStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
      processing: "bg-blue-900/40 text-blue-300 border-blue-700",
      deployed: "bg-indigo-900/40 text-indigo-300 border-indigo-700",
      delivered: "bg-green-900/40 text-green-300 border-green-700",
      failed: "bg-red-900/40 text-red-300 border-red-700",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs border font-medium ${
          map[status] || "bg-neutral-800 text-neutral-300 border-neutral-700"
        }`}
      >
        {status}
      </span>
    );
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
              🔐
            </div>
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="text-neutral-400 text-sm mt-1">JecidtSebasBoost Pro</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Contraseña de administrador
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition mb-4"
              placeholder="••••••••"
              autoFocus
            />
            {authError && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                ❌ {authError}
              </div>
            )}
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition"
            >
              Entrar →
            </button>
          </div>
          <p className="text-center text-xs text-neutral-600 mt-4">
            Contraseña por defecto: <code className="text-neutral-400">admin123</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-lg">
              🔐
            </div>
            <div>
              <h1 className="text-lg font-bold">Panel Admin — JecidtSebasBoost Pro</h1>
              <p className="text-xs text-neutral-500">
                Gestión de bots y pedidos · Base de datos persistente
                {data?.queueStatus?.isProcessing && (
                  <span className="ml-2 text-blue-400 animate-pulse">
                    ⚙️ Procesando {data.queueStatus.queueLength} pedido(s)...
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(password)}
              className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded-lg transition text-neutral-300"
            >
              🔄 Actualizar
            </button>
            <button
              onClick={() => {
                setAuthenticated(false);
                setData(null);
                setPassword("");
              }}
              className="px-3 py-1.5 text-xs bg-red-900/40 hover:bg-red-900/60 border border-red-800 rounded-lg transition text-red-300"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button className={tabClass("dashboard")} onClick={() => setActiveTab("dashboard")}>
            📊 Dashboard
          </button>
          <button className={tabClass("bots")} onClick={() => setActiveTab("bots")}>
            🤖 Cuentas Bot ({data?.stats.totalBots || 0})
          </button>
          <button className={tabClass("orders")} onClick={() => setActiveTab("orders")}>
            📦 Pedidos ({data?.stats.totalOrders || 0})
          </button>
          <button className={tabClass("tips")} onClick={() => setActiveTab("tips")}>
            🛡️ Guía Anti-Ban
          </button>
        </div>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && data && (
          <div className="space-y-6">
            {/* Queue status alert */}
            {data.queueStatus && (data.queueStatus.isProcessing || data.queueStatus.queueLength > 0) && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl animate-spin">⚙️</div>
                  <div>
                    <p className="font-semibold text-blue-300">
                      Sistema de follows activo
                    </p>
                    <p className="text-sm text-neutral-400">
                      {data.queueStatus.queueLength} pedido(s) en cola ·{" "}
                      {data.queueStatus.jobs.map((j) => `@${j.targetUsername}`).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                {
                  label: "Bots Totales",
                  value: data.stats.totalBots,
                  icon: "🤖",
                  color: "text-indigo-400",
                },
                {
                  label: "Disponibles",
                  value: data.stats.availableBots,
                  icon: "✅",
                  color: "text-green-400",
                },
                {
                  label: "Desplegados",
                  value: data.stats.deployedBots,
                  icon: "🚀",
                  color: "text-blue-400",
                },
                {
                  label: "Baneados",
                  value: data.stats.bannedBots,
                  icon: "🚫",
                  color: "text-red-400",
                },
                {
                  label: "Ingresos",
                  value: `$${data.stats.totalRevenue.toFixed(2)}`,
                  icon: "💰",
                  color: "text-yellow-400",
                },
              ].map((s) => (
                <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-neutral-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Secondary stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <h3 className="font-semibold mb-3 text-sm text-neutral-400">Estado de Bots</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">● Disponibles</span>
                    <span className="font-bold">{data.stats.availableBots}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-400">● Desplegados</span>
                    <span className="font-bold">{data.stats.deployedBots}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-400">● Baneados</span>
                    <span className="font-bold">{data.stats.bannedBots}</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2 mt-3">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width:
                          data.stats.totalBots > 0
                            ? `${(data.stats.availableBots / data.stats.totalBots) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <h3 className="font-semibold mb-3 text-sm text-neutral-400">Estado de Pedidos</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-400">● Pendientes</span>
                    <span className="font-bold">{data.stats.pendingOrders}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-400">● Procesando</span>
                    <span className="font-bold">{data.stats.processingOrders}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">● Entregados</span>
                    <span className="font-bold">{data.stats.deliveredOrders}</span>
                  </div>
                </div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <h3 className="font-semibold mb-3 text-sm text-neutral-400">Rendimiento</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total pedidos</span>
                    <span className="font-bold text-white">{data.stats.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Seguidores entregados</span>
                    <span className="font-bold text-purple-400">
                      {data.stats.totalFollowersDelivered.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Ingresos totales</span>
                    <span className="font-bold text-green-400">
                      ${data.stats.totalRevenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <h3 className="font-semibold mb-3 text-sm text-neutral-400">Límites Seguros</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Máx. por lote</span>
                    <span className="font-bold text-orange-400">
                      {data.safeLimits.maxBotsPerBatch}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Máx. por día</span>
                    <span className="font-bold text-orange-400">
                      {data.safeLimits.maxBotsPerDay}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Follows/bot/día</span>
                    <span className="font-bold text-orange-400">
                      {data.safeLimits.maxFollowsPerBotPerDay}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate bots section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-1">⚡ Generar Cuentas Bot de Instagram</h3>
              <p className="text-neutral-400 text-sm mb-5">
                Crea nuevas cuentas bot reales en Instagram. Máximo {SAFE_BOT_LIMITS.maxBotsPerBatch} por lote.
                Con registro real, Puppeteer abre Instagram y registra cada cuenta automáticamente.
              </p>

              {/* Real registration toggle */}
              <div className="flex items-center gap-3 mb-5 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700">
                <button
                  onClick={() => setUseRealRegistration(!useRealRegistration)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    useRealRegistration ? "bg-green-600" : "bg-neutral-600"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      useRealRegistration ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {useRealRegistration ? "🌐 Registro Real en Instagram" : "🧪 Modo Simulado"}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {useRealRegistration
                      ? "Puppeteer abrirá Instagram y registrará cuentas reales (más lento, ~15-25s por cuenta)"
                      : "Genera datos de cuenta sin registrar en Instagram (instantáneo, para pruebas)"}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Cantidad (máx. {SAFE_BOT_LIMITS.maxBotsPerBatch})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={SAFE_BOT_LIMITS.maxBotsPerBatch}
                    value={genQty}
                    onChange={(e) => setGenQty(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Proxy residencial (opcional)
                  </label>
                  <input
                    type="text"
                    value={genProxy}
                    onChange={(e) => setGenProxy(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition"
                    placeholder="ip:puerto:user:pass"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleGenerate}
                    disabled={genLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition"
                  >
                    {genLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {useRealRegistration ? "Registrando en IG..." : "Generando..."}
                      </span>
                    ) : (
                      "⚡ Generar Bots"
                    )}
                  </button>
                </div>
              </div>

              {genResult && (
                <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm mb-3">
                  {genResult}
                </div>
              )}
              {genError && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm mb-3">
                  ❌ {genError}
                </div>
              )}

              {/* Show generated accounts */}
              {genAccounts.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-neutral-400 mb-2">
                    Cuentas generadas en esta sesión:
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {genAccounts.map((acc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-neutral-800/50 rounded-lg px-3 py-2 text-xs"
                      >
                        <span className="text-indigo-300 font-medium">@{acc.igUsername}</span>
                        <span className="text-neutral-400">{acc.email}</span>
                        <span
                          className={`font-medium ${
                            acc.status === "available"
                              ? "text-green-400"
                              : acc.status === "pending_verification"
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {acc.status === "available"
                            ? "✅ Activa"
                            : acc.status === "pending_verification"
                            ? "⏳ Verificando"
                            : `❌ ${acc.error || "Error"}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTS TAB */}
        {activeTab === "bots" && data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Cuentas Bot de Instagram</h2>
                <p className="text-neutral-400 text-sm">
                  {data.stats.availableBots} disponibles · {data.stats.deployedBots} desplegadas ·{" "}
                  {data.stats.bannedBots} baneadas
                </p>
              </div>
            </div>

            {data.bots.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
                <div className="text-4xl mb-3">🤖</div>
                <p className="text-neutral-400">No hay cuentas bot generadas aún.</p>
                <p className="text-neutral-500 text-sm mt-1">Ve al Dashboard para generar cuentas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.bots.map((bot) => (
                  <div
                    key={bot.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
                  >
                    {/* Bot row */}
                    <div
                      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-neutral-800/30 transition"
                      onClick={() => setExpandedBot(expandedBot === bot.id ? null : bot.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-indigo-300 font-medium">@{bot.igUsername}</span>
                          {botStatusBadge(bot.status)}
                          {verificationBadge(bot.verificationStatus)}
                          {bot.igUserId && (
                            <span className="text-xs text-emerald-500 font-mono">
                              ID: {bot.igUserId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">{bot.email}</p>
                      </div>
                      <div className="text-right text-xs text-neutral-500 hidden sm:block">
                        <p>
                          Follows hoy:{" "}
                          <span className="text-white font-medium">{bot.followsToday}</span>
                        </p>
                        <p>
                          Total:{" "}
                          <span className="text-purple-400 font-medium">
                            {bot.totalFollowsDelivered}
                          </span>
                        </p>
                      </div>
                      <div className="text-xs text-neutral-600">
                        {expandedBot === bot.id ? "▲" : "▼"}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expandedBot === bot.id && (
                      <div className="border-t border-neutral-800 px-4 py-4 bg-neutral-950/50">
                        <div className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-neutral-500">ID</span>
                              <span className="font-mono text-xs text-neutral-400">{bot.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Plataforma</span>
                              <span className="text-white capitalize">{bot.platform}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Email</span>
                              <span className="text-neutral-300 text-xs">{bot.email}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Contraseña</span>
                              <span className="font-mono text-xs text-yellow-300">
                                {bot.password}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Proxy</span>
                              <span className="text-neutral-400 text-xs">
                                {bot.proxy || "Sin proxy"}
                              </span>
                            </div>
                            {bot.igUserId && (
                              <div className="flex justify-between">
                                <span className="text-neutral-500">IG User ID</span>
                                <span className="font-mono text-xs text-emerald-400">
                                  {bot.igUserId}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Creado</span>
                              <span className="text-neutral-300 text-xs">
                                {new Date(bot.createdAt).toLocaleDateString("es-ES")}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Último uso</span>
                              <span className="text-neutral-300 text-xs">
                                {bot.lastUsedAt
                                  ? new Date(bot.lastUsedAt).toLocaleDateString("es-ES")
                                  : "Nunca"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Follows hoy</span>
                              <span className="text-white font-medium">
                                {bot.followsToday} /{" "}
                                {SAFE_BOT_LIMITS.maxFollowsPerBotPerDay}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Total entregados</span>
                              <span className="text-purple-400 font-medium">
                                {bot.totalFollowsDelivered}
                              </span>
                            </div>
                          </div>
                        </div>
                        {bot.notes && (
                          <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                            <p className="text-xs text-yellow-300">📝 {bot.notes}</p>
                          </div>
                        )}
                        <div className="mb-3">
                          <p className="text-xs text-neutral-500 mb-1">User-Agent</p>
                          <p className="text-xs text-neutral-400 bg-neutral-900 rounded p-2 font-mono break-all">
                            {bot.userAgent}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {bot.status === "pending_verification" && (
                            <button
                              onClick={() => handleMarkAvailable(bot.id)}
                              className="px-3 py-1.5 text-xs bg-green-900/40 hover:bg-green-900/60 border border-green-800 text-green-300 rounded-lg transition"
                            >
                              ✅ Marcar como disponible
                            </button>
                          )}
                          {bot.status !== "banned" && (
                            <button
                              onClick={() => handleMarkBanned(bot.id)}
                              className="px-3 py-1.5 text-xs bg-orange-900/40 hover:bg-orange-900/60 border border-orange-800 text-orange-300 rounded-lg transition"
                            >
                              🚫 Marcar como baneado
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBot(bot.id)}
                            className="px-3 py-1.5 text-xs bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded-lg transition"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && data && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">Pedidos de Clientes</h2>
              <p className="text-neutral-400 text-sm">
                {data.stats.totalOrders} pedidos · ${data.stats.totalRevenue.toFixed(2)} USD en
                ingresos · {data.stats.totalFollowersDelivered.toLocaleString()} seguidores
                entregados
              </p>
            </div>

            {/* Queue status */}
            {data.queueStatus && data.queueStatus.jobs.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-300 mb-2">
                  ⚙️ Cola de follows activa ({data.queueStatus.queueLength} en cola)
                </p>
                <div className="space-y-1">
                  {data.queueStatus.jobs.map((job) => (
                    <div key={job.orderId} className="text-xs text-neutral-400 flex gap-4">
                      <span className="font-mono text-neutral-500">{job.orderId}</span>
                      <span className="text-pink-300">@{job.targetUsername}</span>
                      <span>{job.botCount} bots</span>
                      <span>intento #{job.attempts + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.orders.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-neutral-400">No hay pedidos aún.</p>
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-neutral-500 border-b border-neutral-800 bg-neutral-900/50">
                        <th className="text-left px-4 py-3">Recibo</th>
                        <th className="text-left px-4 py-3">Usuario IG</th>
                        <th className="text-left px-4 py-3">Paquete</th>
                        <th className="text-left px-4 py-3">Seguidores</th>
                        <th className="text-left px-4 py-3">Precio</th>
                        <th className="text-left px-4 py-3">Estado</th>
                        <th className="text-left px-4 py-3">Pago</th>
                        <th className="text-left px-4 py-3">Bots</th>
                        <th className="text-left px-4 py-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o) => (
                        <tr
                          key={o.id}
                          className="border-b border-neutral-800/50 hover:bg-neutral-800/30"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-purple-300">
                            {o.receiptCode}
                          </td>
                          <td className="px-4 py-3 text-pink-300 font-medium">
                            @{o.igUsername}
                          </td>
                          <td className="px-4 py-3 text-neutral-300">{o.packageName}</td>
                          <td className="px-4 py-3 text-purple-400 font-bold">
                            +{o.followers.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-green-400 font-semibold">
                            ${o.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">{orderStatusBadge(o.status)}</td>
                          <td className="px-4 py-3 text-xs text-neutral-400 capitalize">
                            {o.paymentMethod}
                          </td>
                          <td className="px-4 py-3 text-neutral-400 text-xs">
                            {o.botsUsed} bots
                          </td>
                          <td className="px-4 py-3 text-xs text-neutral-500">
                            {new Date(o.createdAt).toLocaleDateString("es-ES")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TIPS TAB */}
        {activeTab === "tips" && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-xl font-bold mb-1">
                🛡️ Guía Anti-Ban para Cuentas Bot de Instagram
              </h2>
              <p className="text-neutral-400 text-sm">
                Sigue estas recomendaciones para minimizar el riesgo de que tus cuentas bot sean
                baneadas.
              </p>
            </div>

            {/* Limits card */}
            <div className="bg-orange-900/20 border border-orange-700/50 rounded-2xl p-6">
              <h3 className="font-bold text-orange-300 mb-4">⚠️ Límites Recomendados</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    label: "Máximo de cuentas por lote",
                    value: `${SAFE_BOT_LIMITS.maxBotsPerBatch} cuentas`,
                    icon: "📦",
                  },
                  {
                    label: "Máximo de cuentas por día",
                    value: `${SAFE_BOT_LIMITS.maxBotsPerDay} cuentas`,
                    icon: "📅",
                  },
                  {
                    label: "Espera entre lotes",
                    value: `${SAFE_BOT_LIMITS.recommendedDelayMinutes} minutos`,
                    icon: "⏱️",
                  },
                  {
                    label: "Follows por bot por día",
                    value: `${SAFE_BOT_LIMITS.maxFollowsPerBotPerDay} follows`,
                    icon: "👥",
                  },
                  {
                    label: "Follows por bot por hora",
                    value: `${SAFE_BOT_LIMITS.maxFollowsPerBotPerHour} follows`,
                    icon: "⚡",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 bg-orange-900/10 rounded-xl p-3"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="text-xs text-neutral-400">{item.label}</p>
                      <p className="font-bold text-orange-300">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h3 className="font-bold mb-4">💡 Mejores Prácticas</h3>
              <div className="space-y-3">
                {SAFE_BOT_LIMITS.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-900/40 border border-indigo-700/50 flex items-center justify-center text-xs text-indigo-300 font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-neutral-300">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture note */}
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-2xl p-6">
              <h3 className="font-bold text-blue-300 mb-3">
                🏗️ Arquitectura del Sistema (Producción)
              </h3>
              <div className="space-y-2 text-sm text-neutral-400">
                <p>
                  •{" "}
                  <span className="text-white">Motor de registro:</span> Puppeteer + Node.js con
                  proxies residenciales
                </p>
                <p>
                  •{" "}
                  <span className="text-white">Motor de follows:</span> Puppeteer automatiza el
                  seguimiento en Instagram
                </p>
                <p>
                  •{" "}
                  <span className="text-white">Resolución de CAPTCHAs:</span> 2Captcha o
                  Anti-Captcha API
                </p>
                <p>
                  •{" "}
                  <span className="text-white">Cola de tareas:</span> Sistema de jobs en memoria
                  (Next.js server)
                </p>
                <p>
                  •{" "}
                  <span className="text-white">Base de datos:</span> SQLite (better-sqlite3) para
                  persistencia real
                </p>
                <p>
                  •{" "}
                  <span className="text-white">Modelo de entrega:</span> Bots siguen al usuario
                  real en Instagram
                </p>
                <p>
                  •{" "}
                  <span className="text-white">Pasarela de pago:</span> Stripe o Coinbase Commerce
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
