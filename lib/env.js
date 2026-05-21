const ENV = {
  appName: process.env.APP_NAME || "Rantu AI",
  mongodbUri: process.env.MONGODB_URI || "",
  mongodbDbName: process.env.MONGODB_DB_NAME || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  whatsappAuthDir: process.env.WHATSAPP_AUTH_DIR || "storage/wa-auth",
  whatsappBotName: process.env.WHATSAPP_BOT_NAME || "Rantu AI Bot",
  dashboardTitle: process.env.DASHBOARD_TITLE || "Rantu AI WhatsApp Dashboard",
};

export function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export default ENV;