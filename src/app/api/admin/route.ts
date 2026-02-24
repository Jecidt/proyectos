import { NextRequest, NextResponse } from "next/server";
import {
  getAllBots,
  getAllOrders,
  getOrderBotIds,
  getBotStats,
  getOrderStats,
  deleteBot,
  updateBotStatus,
} from "@/lib/db";
import { SAFE_BOT_LIMITS } from "@/lib/store";
import { getQueueStatus } from "@/lib/jobQueue";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// GET /api/admin - Get full admin data from persistent DB
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password");

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });
  }

  const botStats = getBotStats();
  const orderStats = getOrderStats();
  const bots = getAllBots();
  const orders = getAllOrders();
  const queueStatus = getQueueStatus();

  const stats = {
    totalBots: botStats.total,
    availableBots: botStats.available,
    deployedBots: botStats.deployed,
    bannedBots: botStats.banned,
    totalOrders: orderStats.total,
    pendingOrders: orderStats.pending,
    processingOrders: orderStats.processing,
    deliveredOrders: orderStats.delivered,
    totalRevenue: orderStats.revenue,
    totalFollowersDelivered: orderStats.total_followers,
  };

  return NextResponse.json({
    stats,
    safeLimits: SAFE_BOT_LIMITS,
    queueStatus,
    bots: bots.map((b) => ({
      id: b.id,
      platform: b.platform,
      igUsername: b.ig_username,
      email: b.email,
      password: b.password,
      verificationStatus: b.verification_status,
      status: b.status,
      createdAt: b.created_at,
      lastUsedAt: b.last_used_at,
      proxy: b.proxy,
      followsToday: b.follows_today,
      totalFollowsDelivered: b.total_follows_delivered,
      userAgent: b.user_agent,
      igUserId: b.ig_user_id,
      notes: b.notes,
    })),
    orders: orders.map((o) => {
      const botIds = getOrderBotIds(o.id);
      return {
        id: o.id,
        igUsername: o.ig_username,
        packageName: o.package_name,
        followers: o.followers,
        price: o.price,
        status: o.status,
        paymentMethod: o.payment_method,
        createdAt: o.created_at,
        deployedAt: o.deployed_at,
        deliveredAt: o.delivered_at,
        receiptCode: o.receipt_code,
        deliveryTime: o.delivery_time,
        botsUsed: botIds.length,
      };
    }),
  });
}

// DELETE /api/admin - Delete a bot account
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { password, botId } = body;

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });
  }

  try {
    deleteBot(botId);
    const botStats = getBotStats();
    const orderStats = getOrderStats();
    return NextResponse.json({
      success: true,
      stats: {
        totalBots: botStats.total,
        availableBots: botStats.available,
        deployedBots: botStats.deployed,
        bannedBots: botStats.banned,
        totalOrders: orderStats.total,
        pendingOrders: orderStats.pending,
        processingOrders: orderStats.processing,
        deliveredOrders: orderStats.delivered,
        totalRevenue: orderStats.revenue,
        totalFollowersDelivered: orderStats.total_followers,
      },
    });
  } catch {
    return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 });
  }
}

// PATCH /api/admin - Update bot status
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { password, botId, status } = body;

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });
  }

  const validStatuses = ["available", "deployed", "banned", "pending_verification"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  try {
    updateBotStatus(botId, status);
    const botStats = getBotStats();
    return NextResponse.json({
      success: true,
      stats: {
        totalBots: botStats.total,
        availableBots: botStats.available,
        deployedBots: botStats.deployed,
        bannedBots: botStats.banned,
      },
    });
  } catch {
    return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 });
  }
}
