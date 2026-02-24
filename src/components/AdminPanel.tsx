"use client";

import { useState, useCallback } from "react";
import { SAFE_BOT_LIMITS } from "@/lib/store";

interface BotAccount {
  id: string;
  igUsername: string;
  email: string;
  status: "available" | "deployed";
  createdAt: string;
  proxy?: string;
}

interface AdminOrder {
  id: string;
  igUsername: string;
  packageName: string;
  followers: number;
  price: number;
  status: string;
  createdAt: string;
  deliveredAt?: string;
  receiptCode: string;
  botsUsed: number;
}

interface Stats {
  totalBots: number;
  availableBots: number;
  deployedBots: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
}

interface AdminData {
  stats: Stats;
  bots: BotAccount[];
  orders: AdminOrder[];
  safeLimits: typeof SAFE_BOT_LIMITS;
}

type AdminTab = "dashboard" | "bots" | "orders" | "tips";

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  // Generate bots state
  const [genQty, setGenQty] = useState("10");
  const [genProxy, setGenProxy] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<string>("");
  const [genError, setGenError] = useState<string>("");

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
    setGenLoading(true);
    try {
      const res = await fetch("/api/bots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: Number(genQty), proxy: genProxy || undefined }),
      });
      const d = await res.json();
      if (!res.ok) {
        setGenError(d.error || "Error");
      } else {
        setGenResult(`✅ ${d.generated} cuentas generadas. Disponibles: ${d.stats.availableBots}`);
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

  const tabClass = (tab: AdminTab) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
      activeTab === tab
        ? "bg-indigo-600 text-white"
        : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
    }`;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      available: "bg-green-900/40 text-green-300 border-green-700",
      deployed: "bg-blue-900/40 text-blue-300 border-blue-700",
      pending: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
      processing: "bg-blue-900/40 text-blue-300 border-blue-700",
      delivered: "bg-green-900/40 text-green-300 border-green-700",
      failed: "bg-red-900/40 text-red-300 border-red-700",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${map[status] || "bg-neutral-800 text-neutral-300 border-neutral-700"}`}>
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
            <p className="text-neutral-400 text-sm mt-1">InstaBoost Pro</p>
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
              <h1 className="text-lg font-bold">Panel Admin — InstaBoost Pro</h1>
              <p className="text-xs text-neutral-500">Gestión de bots y pedidos</p>
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
              onClick={() => { setAuthenticated(false); setData(null); setPassword(""); }}
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
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Bots Totales", value: data.stats.totalBots, icon: "🤖", color: "text-indigo-400" },
                { label: "Bots Disponibles", value: data.stats.availableBots, icon: "✅", color: "text-green-400" },
                { label: "Pedidos Totales", value: data.stats.totalOrders, icon: "📦", color: "text-blue-400" },
                { label: "Ingresos", value: `$${data.stats.totalRevenue.toFixed(2)}`, icon: "💰", color: "text-yellow-400" },
              ].map((s) => (
                <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-neutral-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* More stats */}
            <div className="grid sm:grid-cols-3 gap-4">
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
                  <div className="w-full bg-neutral-800 rounded-full h-2 mt-3">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: data.stats.totalBots > 0 ? `${(data.stats.availableBots / data.stats.totalBots) * 100}%` : "0%" }}
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
                    <span className="text-green-400">● Entregados</span>
                    <span className="font-bold">{data.stats.deliveredOrders}</span>
                  </div>
                </div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <h3 className="font-semibold mb-3 text-sm text-neutral-400">Límites Seguros</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Máx. por lote</span>
                    <span className="font-bold text-orange-400">{data.safeLimits.maxBotsPerBatch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Máx. por día</span>
                    <span className="font-bold text-orange-400">{data.safeLimits.maxBotsPerDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Follows/bot/día</span>
                    <span className="font-bold text-orange-400">{data.safeLimits.maxFollowsPerBotPerDay}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate bots section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-1">⚡ Generar Cuentas Bot</h3>
              <p className="text-neutral-400 text-sm mb-5">
                Crea nuevas cuentas bot para Instagram. Máximo {SAFE_BOT_LIMITS.maxBotsPerBatch} por lote (límite seguro).
              </p>
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
                    Proxy (opcional)
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
                    {genLoading ? "Generando..." : "⚡ Generar Bots"}
                  </button>
                </div>
              </div>
              {genResult && (
                <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm">
                  {genResult}
                </div>
              )}
              {genError && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                  ❌ {genError}
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
                  {data.stats.availableBots} disponibles · {data.stats.deployedBots} desplegadas
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
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-neutral-500 border-b border-neutral-800 bg-neutral-900/50">
                        <th className="text-left px-4 py-3">ID</th>
                        <th className="text-left px-4 py-3">Usuario IG</th>
                        <th className="text-left px-4 py-3">Email</th>
                        <th className="text-left px-4 py-3">Estado</th>
                        <th className="text-left px-4 py-3">Proxy</th>
                        <th className="text-left px-4 py-3">Creado</th>
                        <th className="text-left px-4 py-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bots.map((bot) => (
                        <tr key={bot.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                          <td className="px-4 py-3 font-mono text-xs text-neutral-500">{bot.id}</td>
                          <td className="px-4 py-3 text-indigo-300 font-medium">@{bot.igUsername}</td>
                          <td className="px-4 py-3 text-neutral-400 text-xs">{bot.email}</td>
                          <td className="px-4 py-3">{statusBadge(bot.status)}</td>
                          <td className="px-4 py-3 text-xs text-neutral-500">{bot.proxy || "—"}</td>
                          <td className="px-4 py-3 text-xs text-neutral-500">
                            {new Date(bot.createdAt).toLocaleDateString("es-ES")}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteBot(bot.id)}
                              className="text-xs text-red-400 hover:text-red-300 transition"
                            >
                              🗑️ Eliminar
                            </button>
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

        {/* ORDERS TAB */}
        {activeTab === "orders" && data && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">Pedidos de Clientes</h2>
              <p className="text-neutral-400 text-sm">
                {data.stats.totalOrders} pedidos · ${data.stats.totalRevenue.toFixed(2)} USD en ingresos
              </p>
            </div>

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
                        <th className="text-left px-4 py-3">Bots Usados</th>
                        <th className="text-left px-4 py-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o) => (
                        <tr key={o.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                          <td className="px-4 py-3 font-mono text-xs text-purple-300">{o.receiptCode}</td>
                          <td className="px-4 py-3 text-pink-300 font-medium">@{o.igUsername}</td>
                          <td className="px-4 py-3 text-neutral-300">{o.packageName}</td>
                          <td className="px-4 py-3 text-purple-400 font-bold">+{o.followers.toLocaleString()}</td>
                          <td className="px-4 py-3 text-green-400 font-semibold">${o.price.toFixed(2)}</td>
                          <td className="px-4 py-3">{statusBadge(o.status)}</td>
                          <td className="px-4 py-3 text-neutral-400 text-xs">{o.botsUsed} bots</td>
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
              <h2 className="text-xl font-bold mb-1">🛡️ Guía Anti-Ban para Cuentas Bot de Instagram</h2>
              <p className="text-neutral-400 text-sm">
                Sigue estas recomendaciones para minimizar el riesgo de que tus cuentas bot sean baneadas.
              </p>
            </div>

            {/* Limits card */}
            <div className="bg-orange-900/20 border border-orange-700/50 rounded-2xl p-6">
              <h3 className="font-bold text-orange-300 mb-4">⚠️ Límites Recomendados</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Máximo de cuentas por lote", value: `${SAFE_BOT_LIMITS.maxBotsPerBatch} cuentas`, icon: "📦" },
                  { label: "Máximo de cuentas por día", value: `${SAFE_BOT_LIMITS.maxBotsPerDay} cuentas`, icon: "📅" },
                  { label: "Espera entre lotes", value: `${SAFE_BOT_LIMITS.recommendedDelayMinutes} minutos`, icon: "⏱️" },
                  { label: "Follows por bot por día", value: `${SAFE_BOT_LIMITS.maxFollowsPerBotPerDay} follows`, icon: "👥" },
                  { label: "Follows por bot por hora", value: `${SAFE_BOT_LIMITS.maxFollowsPerBotPerHour} follows`, icon: "⚡" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 bg-neutral-900/50 rounded-xl p-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="text-xs text-neutral-400">{item.label}</p>
                      <p className="font-bold text-orange-300">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips list */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h3 className="font-bold mb-4">✅ Mejores Prácticas</h3>
              <div className="space-y-3">
                {SAFE_BOT_LIMITS.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-indigo-600/30 border border-indigo-600/50 rounded-full flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-neutral-300 text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-red-900/20 border border-red-700/50 rounded-2xl p-5">
              <h3 className="font-bold text-red-300 mb-2">🚨 Advertencias Importantes</h3>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li>• Instagram detecta patrones de comportamiento automatizado. Siempre varía los tiempos.</li>
                <li>• Nunca uses la misma IP para crear múltiples cuentas bot.</li>
                <li>• Las cuentas nuevas son más vulnerables — espera 24-48h antes de usarlas.</li>
                <li>• Si una cuenta es baneada, no intentes recuperarla desde la misma IP.</li>
                <li>• Mantén un ratio de follows/unfollows natural (no seguir y dejar de seguir inmediatamente).</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
