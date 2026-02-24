import { NextRequest, NextResponse } from "next/server";
import { store, PACKAGES, generateReceiptCode } from "@/lib/store";

// POST /api/orders - Create a new order (purchase followers)
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

    // Clean IG username (remove @ if present)
    const cleanUsername = igUsername.trim().replace(/^@/, "");

    const pkg = PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json(
        { error: "Paquete no válido" },
        { status: 400 }
      );
    }

    // Check available bots (use botsRequired, not followers count)
    const availableBots = store.botAccounts.filter((b) => b.status === "available");
    if (availableBots.length < pkg.botsRequired) {
      return NextResponse.json(
        {
          error: `No hay suficientes bots disponibles. Disponibles: ${availableBots.length}, necesarios: ${pkg.botsRequired}. El administrador debe generar más cuentas bot.`,
        },
        { status: 400 }
      );
    }

    // Assign bots to this order (stock-based model)
    const botsToUse = availableBots.slice(0, pkg.botsRequired);
    const botIds = botsToUse.map((b) => b.id);

    // Mark bots as deployed and update their stats
    for (const bot of botsToUse) {
      bot.status = "deployed";
      bot.lastUsedAt = new Date().toISOString();
    }

    // Create order
    const receiptCode = generateReceiptCode();
    const order = {
      id: `ord_${Date.now().toString(36)}`,
      igUsername: cleanUsername,
      packageId: pkg.id,
      packageName: pkg.name,
      followers: pkg.followers,
      price: pkg.price,
      status: "processing" as const,
      paymentMethod: "demo" as const,
      createdAt: new Date().toISOString(),
      botsUsed: botIds,
      receiptCode,
      deliveryTime: pkg.deliveryTime,
    };

    store.orders.push(order);

    // Simulate delivery after a short time (in real app this would be a background job / Celery task)
    // Stock model: bots are pre-generated, delivery is near-instant
    setTimeout(() => {
      const o = store.orders.find((x) => x.id === order.id);
      if (o) {
        o.status = "delivered";
        o.deliveredAt = new Date().toISOString();
        // Update bot stats
        for (const botId of botIds) {
          const bot = store.botAccounts.find((b) => b.id === botId);
          if (bot) {
            const followsPerBot = Math.ceil(pkg.followers / pkg.botsRequired);
            bot.followsToday += followsPerBot;
            bot.totalFollowsDelivered += followsPerBot;
          }
        }
      }
    }, 5000);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        igUsername: order.igUsername,
        packageName: order.packageName,
        followers: order.followers,
        price: order.price,
        status: order.status,
        createdAt: order.createdAt,
        receiptCode: order.receiptCode,
        deliveryTime: order.deliveryTime,
      },
    });
  } catch {
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
    const order = store.orders.find((o) => o.receiptCode === receiptCode);
    if (!order) {
      return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ order });
  }

  if (igUsername) {
    const cleanUsername = igUsername.trim().replace(/^@/, "");
    const orders = store.orders.filter((o) => o.igUsername === cleanUsername);
    if (orders.length === 0) {
      return NextResponse.json({ error: "No se encontraron pedidos para este usuario" }, { status: 404 });
    }
    return NextResponse.json({
      igUsername: cleanUsername,
      totalOrders: orders.length,
      totalFollowersPurchased: orders.reduce((sum, o) => sum + o.followers, 0),
      orders: orders.map((o) => ({
        id: o.id,
        packageName: o.packageName,
        followers: o.followers,
        price: o.price,
        status: o.status,
        createdAt: o.createdAt,
        deliveredAt: o.deliveredAt,
        receiptCode: o.receiptCode,
        deliveryTime: o.deliveryTime,
      })),
    });
  }

  return NextResponse.json({ error: "Se requiere igUsername o receiptCode" }, { status: 400 });
}
