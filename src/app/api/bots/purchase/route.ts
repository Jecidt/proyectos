import { NextResponse } from "next/server";

// This endpoint is deprecated. Use /api/orders instead.
export async function POST() {
  return NextResponse.json(
    { error: "Este endpoint está deprecado. Usa /api/orders para crear pedidos." },
    { status: 410 }
  );
}
