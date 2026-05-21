import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/bot-store";
import { getWhatsAppBotSnapshot } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const liveSnapshot = getWhatsAppBotSnapshot();

  try {
    const dbSnapshot = await getDashboardSnapshot();

    return NextResponse.json({
      success: true,
      data: {
        ...liveSnapshot,
        totalMessagesHandled:
          dbSnapshot.totalMessagesHandled || liveSnapshot.totalMessagesHandled || 0,
        lastError: liveSnapshot.lastError,
        lastReceivedMessage:
          liveSnapshot.lastReceivedMessage || dbSnapshot.botState?.lastReceivedMessage || null,
        lastReply: liveSnapshot.lastReply || dbSnapshot.botState?.lastReply || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unable to load dashboard status",
        data: liveSnapshot,
      },
      { status: 200 }
    );
  }
}