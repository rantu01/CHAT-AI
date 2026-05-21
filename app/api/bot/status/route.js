import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/bot-store";
import { getWhatsAppBotSnapshot } from "@/lib/whatsapp";
import { getDeploymentMode } from "@/lib/deployment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const liveSnapshot = getWhatsAppBotSnapshot();
  const deploymentMode = getDeploymentMode();

  try {
    const dbSnapshot = await getDashboardSnapshot();

    return NextResponse.json({
      success: true,
      deploymentMode,
      data: {
        ...liveSnapshot,
        deploymentMode,
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
        deploymentMode,
        data: liveSnapshot,
      },
      { status: 200 }
    );
  }
}