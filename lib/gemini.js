import { GoogleGenerativeAI } from "@google/generative-ai";
import ENV, { requireEnv } from "./env";

const systemInstruction = `
You are Rantu, a friendly Bangladeshi web developer.
You reply like a real human in short, casual Bangla and English mix.
Keep responses natural, warm, and concise.
Never mention that you are an AI unless the user directly asks.
If the user writes in Bangla, reply mostly in Bangla with light English words when it feels natural.
If the user writes in English, reply in simple friendly English.
Do not use bullet lists unless the user asks for them.
Do not be robotic, overly formal, or too long.
`;

let client;

function getClient() {
  if (!client) {
    const apiKey = requireEnv("GEMINI_API_KEY", ENV.geminiApiKey);
    client = new GoogleGenerativeAI(apiKey);
  }

  return client;
}

function clampReply(text) {
  const cleanText = text.trim().replace(/\s+/g, " ");
  return cleanText.slice(0, 500) || "Bujhte parchi. Ektu pore reply dicchi.";
}

function getCandidateModels() {
  const candidates = [
    ENV.geminiModel,
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-002",
  ].filter(Boolean);

  return [...new Set(candidates)];
}

function isQuotaOrAuthError(error) {
  const message = `${error?.message || ""} ${error?.statusText || ""} ${error?.code || ""}`.toLowerCase();

  return (
    message.includes("403") ||
    message.includes("consumer_suspended") ||
    message.includes("permission denied") ||
    message.includes("api key") ||
    message.includes("unauthorized") ||
    message.includes("forbidden")
  );
}

function buildFallbackReply(userMessage) {
  const message = userMessage.toLowerCase();

  if (/hello|hi|hey|hii|assalamu|salam/.test(message)) {
    return "Heyy, bolo. Ami achi.";
  }

  if (/(price|cost|rate|budget|tk|taka|poramorsho)/.test(message)) {
    return "Bolo details ta, ami dekhe kichu idea dicchi.";
  }

  if (/(help|support|problem|issue|error|bhaalo na|somossa)/.test(message)) {
    return "Bujhte parchi. একটু details dile ami help kori.";
  }

  return "ami AI Ei muhurte Bujhte parchi na. একটু pore reply dicchi.";
}

function isModelMissingError(error) {
  const message = `${error?.message || ""}`.toLowerCase();

  return (
    error?.status === 404 ||
    message.includes("not found") ||
    message.includes("is not supported for generatecontent") ||
    message.includes("modelservice.listmodels")
  );
}

function buildPrompt({ userMessage, senderName, history = [] }) {
  const conversationSummary = history
    .slice(-8)
    .map((message) => {
      const label = message.role === "assistant" ? "Rantu" : senderName || "User";
      return `${label}: ${message.text}`;
    })
    .join("\n");

  return `
Conversation memory:
${conversationSummary || "No previous memory."}

Latest user message:
${userMessage}

Reply as Rantu in a human, short, friendly way. Keep it under 3 short sentences unless the user asks for more detail.
`;
}

export async function generateReply({ userMessage, senderName, history }) {
  let lastError = null;

  try {
    const prompt = buildPrompt({ userMessage, senderName, history });

    for (const modelName of getCandidateModels()) {
      try {
        const model = getClient().getGenerativeModel({
          model: modelName,
          systemInstruction,
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return {
          text: clampReply(responseText || "Bujhte parchi. Ami reply dicchi."),
          provider: "gemini",
          model: modelName,
          fallbackUsed: false,
          error: null,
        };
      } catch (error) {
        lastError = error;

        if (!isModelMissingError(error)) {
          throw error;
        }
      }
    }

    throw lastError || new Error("No supported Gemini model found");
  } catch (error) {
    const fallbackText = buildFallbackReply(userMessage);

    return {
      text: fallbackText,
      provider: "fallback",
      fallbackUsed: true,
      error: null,
      notice: isQuotaOrAuthError(error)
        ? "Gemini key is invalid or suspended. Replace it with a fresh Google AI Studio key."
        : isModelMissingError(error)
          ? "Gemini model not available. Switched to fallback reply."
          : "Gemini unavailable right now. Fallback reply used.",
    };
  }
}