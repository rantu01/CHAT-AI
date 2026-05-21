import { NextResponse } from "next/server";
import { resetWhatsAppSession, getWhatsAppBotSnapshot } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await resetWhatsAppSession();

    return NextResponse.json({
      success: true,
      data: getWhatsAppBotSnapshot(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unable to reset WhatsApp session",
        data: getWhatsAppBotSnapshot(),
      },
      { status: 200 }
    );
  }
}