import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!phone || !/^\d{9,15}$/.test(phone)) {
    return NextResponse.json({ error: "A valid phone number is required (digits only)." }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Attendance message is required." }, { status: 400 });
  }

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return NextResponse.json({
    success: true,
    waUrl,
    message: "Simulated WhatsApp URL generated. No real message was sent.",
  });
}
