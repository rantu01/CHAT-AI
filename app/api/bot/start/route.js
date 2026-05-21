import { NextResponse } from "next/server";
import { ensureWhatsAppBot, getWhatsAppBotSnapshot } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await ensureWhatsAppBot();

    return NextResponse.json({
      success: true,
      data: getWhatsAppBotSnapshot(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unable to start WhatsApp bot",
        data: getWhatsAppBotSnapshot(),
      },
      { status: 200 }
    );
  }
}