import { NextResponse } from "next/server";

// This endpoint is deprecated. Use /api/orders?igUsername=xxx instead.
export async function GET() {
  return NextResponse.json(
    { error: "Este endpoint está deprecado. Usa /api/orders?igUsername=xxx para consultar pedidos." },
    { status: 410 }
  );
}
