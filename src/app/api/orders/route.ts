import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  insertOrder,
  getOrderByReceiptCode,
  getOrdersByUsername,
  getAvailableBots,
  updateBotStatus,
  DbOrder,
} from "@/lib/db";
import { enqueueFollowOrder } from "@/lib/jobQueue";
import { PACKAGES } from "@/lib/store";

function generateReceiptCode(): string {
  const prefix = "JSB";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// POST /api/orders - Create a new order and trigger real Instagram follows
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { igUsername, packageId } = body;

    if (!igUsername || typeof igUsername !== "string" || igUsername.trim() === "") {
      return NextResponse.json(
        { error: "Se requiere tu usuario de Instagram" },
        { status: 400 }
      );
    }

    const cleanUsername = igUsername.trim().replace(/^@/, "");

    const pkg = PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Paquete no válido" }, { status: 400 });
    }

    // Check available bots in persistent DB
    const availableBots = getAvailableBots();
    if (availableBots.length < pkg.botsRequired) {
      return NextResponse.json(
        {
          error: `No hay suficientes bots disponibles. Disponibles: ${availableBots.length}, necesarios: ${pkg.botsRequired}. El administrador debe generar más cuentas bot.`,
        },
        { status: 400 }
      );
    }

    // Assign bots to this order
    const botsToUse = availableBots.slice(0, pkg.botsRequired);
    const botIds = botsToUse.map((b) => b.id);

    // Mark bots as deployed in DB
    for (const bot of botsToUse) {
      updateBotStatus(bot.id, "deployed");
    }

    // Create order in DB
    const receiptCode = generateReceiptCode();
    const orderId = `ord_${uuidv4().replace(/-/g, "").slice(0, 12)}`;

    const order: DbOrder = {
      id: orderId,
      ig_username: cleanUsername,
      package_id: pkg.id,
      package_name: pkg.name,
      followers: pkg.followers,
      price: pkg.price,
      status: "processing",
      payment_method: "demo",
      created_at: new Date().toISOString(),
      deployed_at: null,
      delivered_at: null,
      receipt_code: receiptCode,
      delivery_time: pkg.deliveryTime,
      notes: null,
    };

    insertOrder(order, botIds);

    // Enqueue real Instagram follow job (runs in background)
    enqueueFollowOrder(orderId, cleanUsername, botIds);

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        igUsername: cleanUsername,
        packageName: pkg.name,
        followers: pkg.followers,
        price: pkg.price,
        status: "processing",
        createdAt: order.created_at,
        receiptCode,
        deliveryTime: pkg.deliveryTime,
      },
    });
  } catch (err) {
    console.error("[Orders] Error creating order:", err);
    return NextResponse.json(
      { error: "Error al procesar el pedido" },
      { status: 500 }
    );
  }
}

// GET /api/orders?igUsername=xxx or ?receiptCode=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const igUsername = searchParams.get("igUsername");
  const receiptCode = searchParams.get("receiptCode");

  if (receiptCode) {
    const order = getOrderByReceiptCode(receiptCode);
    if (!order) {
      return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
    }
    return NextResponse.json({
      order: {
        id: order.id,
        igUsername: order.ig_username,
        packageName: order.package_name,
        followers: order.followers,
        price: order.price,
        status: order.status,
        createdAt: order.created_at,
        deliveredAt: order.delivered_at,
        receiptCode: order.receipt_code,
        deliveryTime: order.delivery_time,
      },
    });
  }

  if (igUsername) {
    const cleanUsername = igUsername.trim().replace(/^@/, "");
    const orders = getOrdersByUsername(cleanUsername);
    if (orders.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron pedidos para este usuario" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      igUsername: cleanUsername,
      totalOrders: orders.length,
      totalFollowersPurchased: orders.reduce((sum, o) => sum + o.followers, 0),
      orders: orders.map((o) => ({
        id: o.id,
        packageName: o.package_name,
        followers: o.followers,
        price: o.price,
        status: o.status,
        createdAt: o.created_at,
        deliveredAt: o.delivered_at,
        receiptCode: o.receipt_code,
        deliveryTime: o.delivery_time,
      })),
    });
  }

  return NextResponse.json(
    { error: "Se requiere igUsername o receiptCode" },
    { status: 400 }
  );
}
