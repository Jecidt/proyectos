import { NextRequest, NextResponse } from "next/server";
import { store, getStats, SAFE_BOT_LIMITS } from "@/lib/store";

const ADMIN_PASSWORD = "admin123"; // In production, use env variable

// GET /api/admin - Get full admin data
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password");

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });
  }

  const stats = getStats();

  return NextResponse.json({
    stats,
    safeLimits: SAFE_BOT_LIMITS,
    bots: store.botAccounts.map((b) => ({
      id: b.id,
      igUsername: b.igUsername,
      email: b.email,
      status: b.status,
      createdAt: b.createdAt,
      proxy: b.proxy,
    })),
    orders: store.orders.map((o) => ({
      id: o.id,
      igUsername: o.igUsername,
      packageName: o.packageName,
      followers: o.followers,
      price: o.price,
      status: o.status,
      createdAt: o.createdAt,
      deliveredAt: o.deliveredAt,
      receiptCode: o.receiptCode,
      botsUsed: o.botsUsed.length,
    })),
  });
}

// DELETE /api/admin - Delete a bot account
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { password, botId } = body;

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });
  }

  const idx = store.botAccounts.findIndex((b) => b.id === botId);
  if (idx === -1) {
    return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 });
  }

  store.botAccounts.splice(idx, 1);
  return NextResponse.json({ success: true, stats: getStats() });
}
