import { NextRequest, NextResponse } from "next/server";
import { store, generateBotAccount } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const quantity = Number(body.quantity);

    if (!quantity || quantity < 1 || quantity > 1000) {
      return NextResponse.json(
        { error: "La cantidad debe ser entre 1 y 1000" },
        { status: 400 }
      );
    }

    const generated = [];
    for (let i = 0; i < quantity; i++) {
      const bot = generateBotAccount();
      store.botAccounts.push(bot);
      generated.push(bot);
    }

    return NextResponse.json({
      success: true,
      generated: generated.length,
      totalAvailable: store.botAccounts.filter((b) => b.status === "available").length,
      accounts: generated,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al generar cuentas bot" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const available = store.botAccounts.filter((b) => b.status === "available");
  const sold = store.botAccounts.filter((b) => b.status === "sold");
  return NextResponse.json({
    total: store.botAccounts.length,
    available: available.length,
    sold: sold.length,
  });
}
