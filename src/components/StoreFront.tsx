"use client";

import { useState } from "react";
import { PACKAGES } from "@/lib/store";

interface Order {
  id: string;
  igUsername: string;
  packageName: string;
  followers: number;
  price: number;
  status: string;
  createdAt: string;
  deliveredAt?: string;
  receiptCode: string;
  deliveryTime: string;
}

type Step = "home" | "checkout" | "receipt" | "lookup";

export default function StoreFront() {
  const [step, setStep] = useState<Step>("home");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [igUsername, setIgUsername] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [order, setOrder] = useState<Order | null>(null);

  // Lookup state
  const [lookupInput, setLookupInput] = useState<string>("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string>("");
  const [lookupOrders, setLookupOrders] = useState<{
    igUsername: string;
    totalOrders: number;
    totalFollowersPurchased: number;
    orders: Order[];
  } | null>(null);

  const selectedPackage = PACKAGES.find((p) => p.id === selectedPackageId);

  const handleSelectPackage = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    setStep("checkout");
    setError("");
  };

  const handlePurchase = async () => {
    if (!igUsername.trim()) {
      setError("Por favor ingresa tu usuario de Instagram");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ igUsername: igUsername.trim(), packageId: selectedPackageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al procesar el pedido");
      } else {
        setOrder(data.order);
        setStep("receipt");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupInput.trim()) return;
    setLookupError("");
    setLookupOrders(null);
    setLookupLoading(true);
    try {
      const isReceipt = lookupInput.trim().startsWith("IG-");
      const url = isReceipt
        ? `/api/orders?receiptCode=${encodeURIComponent(lookupInput.trim())}`
        : `/api/orders?igUsername=${encodeURIComponent(lookupInput.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || "No encontrado");
      } else if (isReceipt) {
        // Single order lookup
        setLookupOrders({
          igUsername: data.order.igUsername,
          totalOrders: 1,
          totalFollowersPurchased: data.order.followers,
          orders: [data.order],
        });
      } else {
        setLookupOrders(data);
      }
    } catch {
      setLookupError("Error de conexión");
    } finally {
      setLookupLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "⏳ Pendiente", cls: "bg-yellow-900/40 text-yellow-300 border-yellow-700" },
      processing: { label: "⚙️ Procesando", cls: "bg-blue-900/40 text-blue-300 border-blue-700" },
      delivered: { label: "✅ Entregado", cls: "bg-green-900/40 text-green-300 border-green-700" },
      failed: { label: "❌ Fallido", cls: "bg-red-900/40 text-red-300 border-red-700" },
    };
    const s = map[status] || { label: status, cls: "bg-neutral-800 text-neutral-300 border-neutral-700" };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-purple-950/20 to-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => setStep("home")} className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-purple-500/30">
              📸
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                InstaBoost Pro
              </h1>
              <p className="text-xs text-neutral-500">Seguidores reales para Instagram</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStep("lookup"); setLookupOrders(null); setLookupError(""); setLookupInput(""); }}
              className="px-4 py-2 text-sm text-neutral-300 hover:text-white border border-white/10 hover:border-white/30 rounded-lg transition"
            >
              📦 Mis Pedidos
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* HOME - Package Selection */}
        {step === "home" && (
          <div>
            {/* Hero */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-purple-900/30 border border-purple-700/50 rounded-full px-4 py-1.5 text-sm text-purple-300 mb-6">
                ⚡ Entrega rápida y segura
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
                Consigue más{" "}
                <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  seguidores
                </span>
                <br />en Instagram hoy
              </h2>
              <p className="text-neutral-400 text-lg max-w-xl mx-auto">
                Elige tu paquete, ingresa tu usuario de Instagram y recibe seguidores en horas.
                Sin contraseña requerida.
              </p>
            </div>

            {/* Packages */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative bg-neutral-900 border rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl ${
                    pkg.id === "pkg_500"
                      ? "border-purple-500 shadow-lg shadow-purple-500/20"
                      : "border-neutral-800 hover:border-purple-700/50"
                  }`}
                  onClick={() => handleSelectPackage(pkg.id)}
                >
                  {pkg.id === "pkg_500" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                      ⭐ MÁS POPULAR
                    </div>
                  )}
                  <div className="text-3xl font-extrabold text-white mb-1">
                    {pkg.followers.toLocaleString()}
                  </div>
                  <div className="text-sm text-neutral-400 mb-3">seguidores</div>
                  <div className="text-2xl font-bold text-purple-400 mb-1">
                    ${pkg.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-neutral-500 mb-4">USD</div>
                  <div className="text-xs text-neutral-400 mb-4">
                    🕐 {pkg.deliveryTime}
                  </div>
                  <p className="text-xs text-neutral-500 mb-5">{pkg.description}</p>
                  <button className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    pkg.id === "pkg_500"
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-lg shadow-purple-500/30"
                      : "bg-neutral-800 hover:bg-neutral-700 text-white"
                  }`}>
                    Comprar ahora →
                  </button>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { icon: "🔒", label: "100% Seguro", sub: "Sin contraseña" },
                { icon: "⚡", label: "Entrega Rápida", sub: "En horas" },
                { icon: "🌟", label: "Alta Calidad", sub: "Cuentas reales" },
                { icon: "💬", label: "Soporte 24/7", sub: "Siempre disponible" },
              ].map((b) => (
                <div key={b.label} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
                  <div className="text-2xl mb-1">{b.icon}</div>
                  <div className="text-sm font-semibold text-white">{b.label}</div>
                  <div className="text-xs text-neutral-500">{b.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHECKOUT */}
        {step === "checkout" && selectedPackage && (
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setStep("home")}
              className="flex items-center gap-2 text-neutral-400 hover:text-white text-sm mb-6 transition"
            >
              ← Volver a paquetes
            </button>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-4">
              <h2 className="text-xl font-bold mb-1">Finalizar Compra</h2>
              <p className="text-neutral-400 text-sm mb-6">
                Solo necesitamos tu usuario de Instagram. Sin contraseña.
              </p>

              {/* Order summary */}
              <div className="bg-neutral-800/50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-400 text-sm">Paquete</span>
                  <span className="font-semibold">{selectedPackage.name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-400 text-sm">Seguidores</span>
                  <span className="font-semibold text-purple-400">
                    +{selectedPackage.followers.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-400 text-sm">Entrega estimada</span>
                  <span className="text-sm text-neutral-300">{selectedPackage.deliveryTime}</span>
                </div>
                <div className="border-t border-neutral-700 mt-3 pt-3 flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-purple-400">
                    ${selectedPackage.price.toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* IG Username input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Tu usuario de Instagram
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">@</span>
                  <input
                    type="text"
                    value={igUsername}
                    onChange={(e) => setIgUsername(e.target.value.replace(/^@/, ""))}
                    onKeyDown={(e) => e.key === "Enter" && handlePurchase()}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-8 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                    placeholder="tu_usuario"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1.5">
                  ✅ No necesitamos tu contraseña. Solo tu nombre de usuario público.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm">
                  ❌ {error}
                </div>
              )}

              <button
                onClick={handlePurchase}
                disabled={loading || !igUsername.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 disabled:from-neutral-700 disabled:to-neutral-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/20 text-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  `💳 Pagar $${selectedPackage.price.toFixed(2)} USD`
                )}
              </button>
            </div>

            <p className="text-center text-xs text-neutral-600">
              🔒 Pago seguro · Garantía de entrega · Soporte 24/7
            </p>
          </div>
        )}

        {/* RECEIPT */}
        {step === "receipt" && order && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">
                ✅
              </div>
              <h2 className="text-2xl font-bold text-green-400 mb-2">¡Pedido Confirmado!</h2>
              <p className="text-neutral-400">
                Tus seguidores están en camino a{" "}
                <span className="text-white font-semibold">@{order.igUsername}</span>
              </p>
            </div>

            {/* Receipt card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden mb-4">
              {/* Receipt header */}
              <div className="bg-gradient-to-r from-pink-900/40 to-purple-900/40 border-b border-neutral-800 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">RECIBO DE COMPRA</p>
                    <p className="font-mono text-sm font-bold text-purple-300">{order.receiptCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 mb-1">FECHA</p>
                    <p className="text-sm text-neutral-300">
                      {new Date(order.createdAt).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Receipt body */}
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 text-sm">Usuario Instagram</span>
                  <span className="font-semibold text-pink-300">@{order.igUsername}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 text-sm">Paquete</span>
                  <span className="font-semibold">{order.packageName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 text-sm">Seguidores</span>
                  <span className="font-bold text-purple-400 text-lg">
                    +{order.followers.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 text-sm">Tiempo de entrega</span>
                  <span className="text-sm text-neutral-300">{order.deliveryTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 text-sm">Estado</span>
                  {statusBadge(order.status)}
                </div>
                <div className="border-t border-neutral-800 pt-3 flex justify-between items-center">
                  <span className="font-semibold">Total Pagado</span>
                  <span className="text-xl font-bold text-green-400">${order.price.toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            {/* Save receipt notice */}
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 mb-6 text-sm">
              <p className="text-yellow-300 font-semibold mb-1">💾 Guarda tu código de recibo</p>
              <p className="text-neutral-400">
                Código:{" "}
                <span className="font-mono text-white bg-neutral-800 px-2 py-0.5 rounded">
                  {order.receiptCode}
                </span>
              </p>
              <p className="text-neutral-500 text-xs mt-1">
                Úsalo en &quot;Mis Pedidos&quot; para rastrear tu entrega.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("home"); setIgUsername(""); setSelectedPackageId(""); setOrder(null); }}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl transition"
              >
                🏠 Inicio
              </button>
              <button
                onClick={() => { setStep("lookup"); setLookupInput(order.receiptCode); setLookupOrders(null); setLookupError(""); }}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-semibold rounded-xl transition"
              >
                📦 Ver Pedido
              </button>
            </div>
          </div>
        )}

        {/* LOOKUP - My Orders */}
        {step === "lookup" && (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setStep("home")}
              className="flex items-center gap-2 text-neutral-400 hover:text-white text-sm mb-6 transition"
            >
              ← Volver al inicio
            </button>

            <h2 className="text-2xl font-bold mb-2">Mis Pedidos</h2>
            <p className="text-neutral-400 text-sm mb-6">
              Ingresa tu usuario de Instagram o código de recibo para ver tus pedidos.
            </p>

            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupInput.trim() && handleLookup()}
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                placeholder="@usuario o código IG-XXXX-XXXX"
                autoFocus
              />
              <button
                onClick={handleLookup}
                disabled={lookupLoading || !lookupInput.trim()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
              >
                {lookupLoading ? "..." : "🔍 Buscar"}
              </button>
            </div>

            {lookupError && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm mb-4">
                ❌ {lookupError}
              </div>
            )}

            {lookupOrders && (
              <div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">@{lookupOrders.igUsername}</p>
                      <p className="text-sm text-neutral-400">
                        {lookupOrders.totalOrders} pedido{lookupOrders.totalOrders !== 1 ? "s" : ""} ·{" "}
                        <span className="text-purple-400 font-semibold">
                          +{lookupOrders.totalFollowersPurchased.toLocaleString()} seguidores
                        </span>
                      </p>
                    </div>
                    <div className="text-4xl">📸</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {lookupOrders.orders.map((o) => (
                    <div key={o.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{o.packageName} — +{o.followers.toLocaleString()} seguidores</p>
                          <p className="text-xs text-neutral-500 font-mono mt-0.5">{o.receiptCode}</p>
                        </div>
                        {statusBadge(o.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-400">
                          {new Date(o.createdAt).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="font-bold text-purple-400">${o.price.toFixed(2)} USD</span>
                      </div>
                      {o.deliveredAt && (
                        <p className="text-xs text-green-400 mt-1">
                          ✅ Entregado: {new Date(o.deliveredAt).toLocaleDateString("es-ES")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-8 text-center text-xs text-neutral-600">
        <p>© 2024 InstaBoost Pro · Servicio de seguidores para Instagram</p>
        <p className="mt-1">Entrega garantizada · Soporte 24/7</p>
      </footer>
    </div>
  );
}
