import { NextResponse } from "next/server";
import { ensureWhatsAppBot, getWhatsAppBotSnapshot } from "@/lib/whatsapp";
import { getDeploymentMode } from "@/lib/deployment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const deploymentMode = getDeploymentMode();

  if (deploymentMode === "vercel-dashboard-only") {
    return NextResponse.json({
      success: false,
      deploymentMode,
      error:
        "Vercel dashboard-only mode: WhatsApp auto reply cannot run on serverless hosting. Use a VPS or always-on Node server for the bot process.",
      data: getWhatsAppBotSnapshot(),
    });
  }

  try {
    await ensureWhatsAppBot();

    return NextResponse.json({
      success: true,
      deploymentMode,
      data: getWhatsAppBotSnapshot(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        deploymentMode,
        error: error?.message || "Unable to start WhatsApp bot",
        data: getWhatsAppBotSnapshot(),
      },
      { status: 200 }
    );
  }
}