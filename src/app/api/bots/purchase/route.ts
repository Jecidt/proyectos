import { NextRequest, NextResponse } from "next/server";
import { store, getOrCreateUser } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, quantity } = body;

    if (!username || typeof username !== "string" || username.trim() === "") {
      return NextResponse.json(
        { error: "Se requiere un nombre de usuario válido" },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (!qty || qty < 1 || qty > 500) {
      return NextResponse.json(
        { error: "La cantidad debe ser entre 1 y 500" },
        { status: 400 }
      );
    }

    const available = store.botAccounts.filter((b) => b.status === "available");

    if (available.length < qty) {
      return NextResponse.json(
        {
          error: `No hay suficientes cuentas disponibles. Disponibles: ${available.length}, solicitadas: ${qty}`,
        },
        { status: 400 }
      );
    }

    const user = getOrCreateUser(username.trim());
    const purchased = available.slice(0, qty);

    for (const bot of purchased) {
      bot.status = "sold";
      user.purchasedBots.push(bot);
    }

    return NextResponse.json({
      success: true,
      username: user.username,
      purchased: purchased.length,
      accounts: purchased,
      totalPurchased: user.purchasedBots.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al procesar la compra" },
      { status: 500 }
    );
  }
}
