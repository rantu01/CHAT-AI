import { NextResponse } from "next/server";
import { resetWhatsAppSession, getWhatsAppBotSnapshot } from "@/lib/whatsapp";
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
        "Vercel dashboard-only mode: session reset is unavailable here because the WhatsApp bot is not running on Vercel.",
      data: getWhatsAppBotSnapshot(),
    });
  }

  try {
    await resetWhatsAppSession();

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
        error: error?.message || "Unable to reset WhatsApp session",
        data: getWhatsAppBotSnapshot(),
      },
      { status: 200 }
    );
  }
}