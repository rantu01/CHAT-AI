import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/bot-store";
import { ensureWhatsAppBot, getWhatsAppBotSnapshot } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureWhatsAppBot();

  const liveSnapshot = getWhatsAppBotSnapshot();
  const dbSnapshot = await getDashboardSnapshot();

  return NextResponse.json({
    success: true,
    data: {
      ...liveSnapshot,
      totalMessagesHandled: dbSnapshot.totalMessagesHandled || liveSnapshot.totalMessagesHandled || 0,
      lastError: liveSnapshot.lastError,
      lastReceivedMessage:
        liveSnapshot.lastReceivedMessage || dbSnapshot.botState?.lastReceivedMessage || null,
      lastReply: liveSnapshot.lastReply || dbSnapshot.botState?.lastReply || null,
    },
  });
}