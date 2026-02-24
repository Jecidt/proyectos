"use client";

import { useState, useCallback } from "react";

interface BotAccount {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
  status: "available" | "sold";
}

interface StoreStats {
  total: number;
  available: number;
  sold: number;
}

type Tab = "generate" | "purchase" | "myaccount";

export default function BotManager() {
  const [activeTab, setActiveTab] = useState<Tab>("generate");

  // Generate state
  const [genQuantity, setGenQuantity] = useState<string>("10");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<{
    generated: number;
    totalAvailable: number;
    accounts: BotAccount[];
  } | null>(null);
  const [genError, setGenError] = useState<string>("");

  // Stats state
  const [stats, setStats] = useState<StoreStats | null>(null);

  // Purchase state
  const [buyUsername, setBuyUsername] = useState<string>("");
  const [buyQuantity, setBuyQuantity] = useState<string>("1");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyResult, setBuyResult] = useState<{
    username: string;
    purchased: number;
    accounts: BotAccount[];
    totalPurchased: number;
  } | null>(null);
  const [buyError, setBuyError] = useState<string>("");

  // My account state
  const [lookupUsername, setLookupUsername] = useState<string>("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    username: string;
    totalPurchased: number;
    accounts: BotAccount[];
  } | null>(null);
  const [lookupError, setLookupError] = useState<string>("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/bots/generate");
      const data = await res.json();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  const handleGenerate = async () => {
    setGenError("");
    setGenResult(null);
    setGenLoading(true);
    try {
      const res = await fetch("/api/bots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: Number(genQuantity) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || "Error desconocido");
      } else {
        setGenResult(data);
        fetchStats();
      }
    } catch {
      setGenError("Error de conexión");
    } finally {
      setGenLoading(false);
    }
  };

  const handlePurchase = async () => {
    setBuyError("");
    setBuyResult(null);
    setBuyLoading(true);
    try {
      const res = await fetch("/api/bots/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: buyUsername, quantity: Number(buyQuantity) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBuyError(data.error || "Error desconocido");
      } else {
        setBuyResult(data);
        fetchStats();
      }
    } catch {
      setBuyError("Error de conexión");
    } finally {
      setBuyLoading(false);
    }
  };

  const handleLookup = async () => {
    setLookupError("");
    setLookupResult(null);
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/bots/user?username=${encodeURIComponent(lookupUsername)}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || "Error desconocido");
      } else {
        setLookupResult(data);
      }
    } catch {
      setLookupError("Error de conexión");
    } finally {
      setLookupLoading(false);
    }
  };

  const tabClass = (tab: Tab) =>
    `px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
      activeTab === tab
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
        : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-lg">
              🤖
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Bot Account Manager</h1>
              <p className="text-xs text-neutral-500">Generador y distribuidor de cuentas bot</p>
            </div>
          </div>
          {stats && (
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <span className="text-neutral-400">
                Total: <span className="text-white font-semibold">{stats.total}</span>
              </span>
              <span className="text-green-400">
                Disponibles: <span className="font-semibold">{stats.available}</span>
              </span>
              <span className="text-red-400">
                Vendidas: <span className="font-semibold">{stats.sold}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button className={tabClass("generate")} onClick={() => { setActiveTab("generate"); fetchStats(); }}>
            ⚙️ Generar Cuentas
          </button>
          <button className={tabClass("purchase")} onClick={() => { setActiveTab("purchase"); fetchStats(); }}>
            🛒 Comprar Cuentas
          </button>
          <button className={tabClass("myaccount")} onClick={() => setActiveTab("myaccount")}>
            👤 Mi Cuenta
          </button>
        </div>

        {/* Generate Tab */}
        {activeTab === "generate" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-1">Generar Cuentas Bot</h2>
              <p className="text-neutral-400 text-sm mb-6">
                Crea un lote de cuentas bot que estarán disponibles para compra.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Cantidad de cuentas a generar
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={genQuantity}
                    onChange={(e) => setGenQuantity(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    placeholder="Ej: 100"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Máximo 1000 por lote</p>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleGenerate}
                    disabled={genLoading}
                    className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-indigo-500/20"
                  >
                    {genLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generando...
                      </span>
                    ) : (
                      "⚡ Generar"
                    )}
                  </button>
                </div>
              </div>

              {genError && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                  ❌ {genError}
                </div>
              )}
            </div>

            {genResult && (
              <div className="bg-neutral-900 border border-green-800/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-green-400 text-xl">✅</span>
                  <div>
                    <h3 className="font-bold text-green-400">
                      {genResult.generated} cuentas generadas exitosamente
                    </h3>
                    <p className="text-sm text-neutral-400">
                      Total disponibles en el sistema: {genResult.totalAvailable}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-neutral-500 border-b border-neutral-800">
                        <th className="text-left py-2 pr-4">ID</th>
                        <th className="text-left py-2 pr-4">Usuario</th>
                        <th className="text-left py-2 pr-4">Email</th>
                        <th className="text-left py-2">Contraseña</th>
                      </tr>
                    </thead>
                    <tbody>
                      {genResult.accounts.slice(0, 20).map((acc) => (
                        <tr key={acc.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                          <td className="py-2 pr-4 font-mono text-neutral-400 text-xs">{acc.id}</td>
                          <td className="py-2 pr-4 text-indigo-300">{acc.username}</td>
                          <td className="py-2 pr-4 text-neutral-300">{acc.email}</td>
                          <td className="py-2 font-mono text-xs text-neutral-400">{acc.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {genResult.accounts.length > 20 && (
                    <p className="text-center text-neutral-500 text-xs mt-3">
                      ... y {genResult.accounts.length - 20} cuentas más
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Purchase Tab */}
        {activeTab === "purchase" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-1">Comprar Cuentas Bot</h2>
              <p className="text-neutral-400 text-sm mb-6">
                Selecciona cuántas cuentas quieres y a qué usuario se le asignarán.
              </p>

              {stats && (
                <div className="mb-5 p-3 bg-neutral-800 rounded-lg flex items-center gap-3 text-sm">
                  <span className="text-green-400">●</span>
                  <span className="text-neutral-300">
                    Cuentas disponibles para compra:{" "}
                    <span className="text-white font-bold">{stats.available}</span>
                  </span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Nombre de usuario destino
                  </label>
                  <input
                    type="text"
                    value={buyUsername}
                    onChange={(e) => setBuyUsername(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    placeholder="Ej: juan123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Cantidad a comprar
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    placeholder="Ej: 5"
                  />
                </div>
              </div>

              <button
                onClick={handlePurchase}
                disabled={buyLoading || !buyUsername.trim()}
                className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-green-500/20"
              >
                {buyLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  "🛒 Comprar Cuentas"
                )}
              </button>

              {buyError && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                  ❌ {buyError}
                </div>
              )}
            </div>

            {buyResult && (
              <div className="bg-neutral-900 border border-green-800/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-green-400 text-xl">✅</span>
                  <div>
                    <h3 className="font-bold text-green-400">
                      Compra exitosa — {buyResult.purchased} cuentas entregadas
                    </h3>
                    <p className="text-sm text-neutral-400">
                      Usuario: <span className="text-white font-semibold">@{buyResult.username}</span> —
                      Total acumulado: {buyResult.totalPurchased} cuentas
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-neutral-500 border-b border-neutral-800">
                        <th className="text-left py-2 pr-4">ID</th>
                        <th className="text-left py-2 pr-4">Usuario Bot</th>
                        <th className="text-left py-2 pr-4">Email</th>
                        <th className="text-left py-2">Contraseña</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyResult.accounts.map((acc) => (
                        <tr key={acc.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                          <td className="py-2 pr-4 font-mono text-neutral-400 text-xs">{acc.id}</td>
                          <td className="py-2 pr-4 text-indigo-300">{acc.username}</td>
                          <td className="py-2 pr-4 text-neutral-300">{acc.email}</td>
                          <td className="py-2 font-mono text-xs text-neutral-400">{acc.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Account Tab */}
        {activeTab === "myaccount" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-1">Consultar Mi Cuenta</h2>
              <p className="text-neutral-400 text-sm mb-6">
                Ingresa tu nombre de usuario para ver todas las cuentas bot que has comprado.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Tu nombre de usuario
                  </label>
                  <input
                    type="text"
                    value={lookupUsername}
                    onChange={(e) => setLookupUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && lookupUsername.trim() && handleLookup()}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    placeholder="Ej: juan123"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleLookup}
                    disabled={lookupLoading || !lookupUsername.trim()}
                    className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200"
                  >
                    {lookupLoading ? "Buscando..." : "🔍 Buscar"}
                  </button>
                </div>
              </div>

              {lookupError && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                  ❌ {lookupError}
                </div>
              )}
            </div>

            {lookupResult && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-lg">
                      👤 @{lookupResult.username}
                    </h3>
                    <p className="text-sm text-neutral-400">
                      Total de cuentas bot compradas:{" "}
                      <span className="text-indigo-400 font-bold">{lookupResult.totalPurchased}</span>
                    </p>
                  </div>
                  <div className="bg-indigo-600/20 border border-indigo-600/40 rounded-xl px-4 py-2 text-center">
                    <div className="text-2xl font-bold text-indigo-400">{lookupResult.totalPurchased}</div>
                    <div className="text-xs text-neutral-400">cuentas</div>
                  </div>
                </div>

                {lookupResult.accounts.length === 0 ? (
                  <p className="text-neutral-500 text-sm text-center py-8">
                    Este usuario no tiene cuentas bot compradas aún.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-neutral-500 border-b border-neutral-800">
                          <th className="text-left py-2 pr-4">#</th>
                          <th className="text-left py-2 pr-4">ID</th>
                          <th className="text-left py-2 pr-4">Usuario Bot</th>
                          <th className="text-left py-2 pr-4">Email</th>
                          <th className="text-left py-2 pr-4">Contraseña</th>
                          <th className="text-left py-2">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lookupResult.accounts.map((acc, i) => (
                          <tr key={acc.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                            <td className="py-2 pr-4 text-neutral-500 text-xs">{i + 1}</td>
                            <td className="py-2 pr-4 font-mono text-neutral-400 text-xs">{acc.id}</td>
                            <td className="py-2 pr-4 text-indigo-300">{acc.username}</td>
                            <td className="py-2 pr-4 text-neutral-300">{acc.email}</td>
                            <td className="py-2 pr-4 font-mono text-xs text-neutral-400">{acc.password}</td>
                            <td className="py-2 text-xs text-neutral-500">
                              {new Date(acc.createdAt).toLocaleDateString("es-ES")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
