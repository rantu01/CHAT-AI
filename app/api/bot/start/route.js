import { NextResponse } from "next/server";
import { ensureWhatsAppBot, getWhatsAppBotSnapshot } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await ensureWhatsAppBot();

  return NextResponse.json({
    success: true,
    data: getWhatsAppBotSnapshot(),
  });
}