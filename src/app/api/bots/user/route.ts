import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Se requiere el parámetro username" },
      { status: 400 }
    );
  }

  const user = store.users.find((u) => u.username === username.trim());

  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    username: user.username,
    totalPurchased: user.purchasedBots.length,
    accounts: user.purchasedBots,
  });
}
