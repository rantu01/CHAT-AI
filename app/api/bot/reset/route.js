import { NextResponse } from "next/server";
import { resetWhatsAppSession, getWhatsAppBotSnapshot } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await resetWhatsAppSession();

  return NextResponse.json({
    success: true,
    data: getWhatsAppBotSnapshot(),
  });
}