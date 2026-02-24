import { NextRequest, NextResponse } from "next/server";
import { store, generateBotAccount, getStats, SAFE_BOT_LIMITS } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const quantity = Number(body.quantity);
    const proxy = body.proxy as string | undefined;

    if (!quantity || quantity < 1 || quantity > SAFE_BOT_LIMITS.maxBotsPerBatch) {
      return NextResponse.json(
        { error: `La cantidad debe ser entre 1 y ${SAFE_BOT_LIMITS.maxBotsPerBatch} por lote (límite seguro)` },
        { status: 400 }
      );
    }

    const generated = [];
    for (let i = 0; i < quantity; i++) {
      const bot = generateBotAccount(proxy);
      store.botAccounts.push(bot);
      generated.push(bot);
    }

    return NextResponse.json({
      success: true,
      generated: generated.length,
      stats: getStats(),
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
  return NextResponse.json(getStats());
}
