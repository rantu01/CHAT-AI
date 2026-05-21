import fs from "fs/promises";
import pino from "pino";
import QRCode from "qrcode";
import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  getContentType,
  jidNormalizedUser,
  makeWASocket,
  useMultiFileAuthState as createMultiFileAuthState,
} from "@whiskeysockets/baileys";
import ENV from "./env";
import {
  getConversationHistory,
  markMessageProcessed,
  saveConversationTurn,
  upsertBotState,
} from "./bot-store";
import { generateReply } from "./gemini";

const globalForWhatsApp = globalThis;

if (!globalForWhatsApp.__rantuWhatsAppBot) {
  globalForWhatsApp.__rantuWhatsAppBot = {
    started: false,
    startingPromise: null,
    reconnectTimer: null,
    socket: null,
    authPath: ENV.whatsappAuthDir || "storage/wa-auth",
    snapshot: {
      connectionStatus: "disconnected",
      qrStatus: "idle",
      qrCodeDataUrl: null,
      lastError: null,
      lastReceivedMessage: null,
      lastReply: null,
      totalMessagesHandled: 0,
      sessionStatus: "not-started",
      startedAt: null,
      updatedAt: new Date().toISOString(),
    },
  };
}

const runtime = globalForWhatsApp.__rantuWhatsAppBot;

function updateSnapshot(patch = {}) {
  runtime.snapshot = {
    ...runtime.snapshot,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  return runtime.snapshot;
}

function randomDelay(minMs, maxMs) {
  const min = Math.min(minMs, maxMs);
  const max = Math.max(minMs, maxMs);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDisconnectStatusCode(lastDisconnect) {
  return lastDisconnect?.error?.output?.statusCode || null;
}

function isQrTimeoutDisconnect(lastDisconnect) {
  const statusCode = getDisconnectStatusCode(lastDisconnect);
  const message = lastDisconnect?.error?.message || "";

  return statusCode === DisconnectReason.timedOut && message.includes("QR refs attempts ended");
}

function isReconnectableDisconnect(lastDisconnect) {
  const statusCode = getDisconnectStatusCode(lastDisconnect);

  return (
    statusCode === DisconnectReason.connectionClosed ||
    statusCode === DisconnectReason.connectionLost ||
    statusCode === DisconnectReason.restartRequired ||
    statusCode === DisconnectReason.unavailableService
  );
}

function isStatusBroadcast(remoteJid) {
  return remoteJid === "status@broadcast" || remoteJid?.endsWith("@broadcast");
}

function extractText(message) {
  if (!message) {
    return null;
  }

  const type = getContentType(message);

  if (!type) {
    return null;
  }

  const content = message[type];

  switch (type) {
    case "conversation":
      return content;
    case "extendedTextMessage":
      return content?.text || null;
    case "imageMessage":
    case "videoMessage":
    case "documentMessage":
      return content?.caption || null;
    case "buttonsResponseMessage":
      return content?.selectedButtonId || content?.selectedDisplayText || null;
    case "templateButtonReplyMessage":
      return content?.selectedId || null;
    case "listResponseMessage":
      return content?.singleSelectReply?.selectedRowId || content?.title || null;
    default:
      return content?.text || content?.caption || null;
  }
}

function getSenderName(message, remoteJid) {
  return message?.pushName || jidNormalizedUser(remoteJid)?.split("@")[0] || "User";
}

function normalizeMessageId(message) {
  return message?.key?.id || `${message?.key?.remoteJid || "unknown"}-${message?.messageTimestamp || Date.now()}`;
}

async function ensureAuthFolder() {
  await fs.mkdir(runtime.authPath, { recursive: true });
}

async function clearAuthFolder() {
  await fs.rm(runtime.authPath, { recursive: true, force: true });
  await ensureAuthFolder();
}

async function handleIncomingMessage(socket, message) {
  const remoteJid = message?.key?.remoteJid;

  if (!remoteJid || isStatusBroadcast(remoteJid) || message?.key?.fromMe) {
    return;
  }

  const incomingText = extractText(message.message);
  if (!incomingText) {
    return;
  }

  const messageId = normalizeMessageId(message);
  const senderName = getSenderName(message, remoteJid);

  const duplicateCheck = await markMessageProcessed({
    messageId,
    chatId: remoteJid,
    senderName,
    text: incomingText,
  });

  if (!duplicateCheck.processed) {
    return;
  }

  const currentCount = runtime.snapshot.totalMessagesHandled + 1;

  updateSnapshot({
    connectionStatus: runtime.snapshot.connectionStatus,
    lastReceivedMessage: {
      text: incomingText,
      chatId: remoteJid,
      senderName,
      timestamp: new Date().toISOString(),
    },
    totalMessagesHandled: currentCount,
    sessionStatus: "running",
    lastError: null,
  });

  await upsertBotState({
    connectionStatus: runtime.snapshot.connectionStatus,
    qrStatus: runtime.snapshot.qrStatus,
    qrCodeDataUrl: runtime.snapshot.qrCodeDataUrl,
    lastReceivedMessage: {
      text: incomingText,
      chatId: remoteJid,
      senderName,
      timestamp: new Date(),
    },
    totalMessagesHandled: currentCount,
    sessionStatus: "running",
    lastError: null,
  });

  const delayBeforeTyping = randomDelay(2000, 5000);
  await sleep(delayBeforeTyping);

  await socket.sendPresenceUpdate("composing", remoteJid);
  await sleep(randomDelay(800, 1600));

  const history = await getConversationHistory(remoteJid);
  const aiResult = await generateReply({
    userMessage: incomingText,
    senderName,
    history,
  });

  const assistantReply = aiResult.text;

  const sentMessage = await socket.sendMessage(remoteJid, { text: assistantReply });

  updateSnapshot({
    lastReply: {
      text: assistantReply,
      chatId: remoteJid,
      timestamp: new Date().toISOString(),
    },
    lastError: aiResult.fallbackUsed ? null : aiResult.error || null,
  });

  await upsertBotState({
    connectionStatus: runtime.snapshot.connectionStatus,
    qrStatus: runtime.snapshot.qrStatus,
    qrCodeDataUrl: runtime.snapshot.qrCodeDataUrl,
    lastReceivedMessage: runtime.snapshot.lastReceivedMessage,
    lastReply: {
      text: assistantReply,
      chatId: remoteJid,
      timestamp: new Date(),
    },
    totalMessagesHandled: currentCount,
    sessionStatus: "running",
    lastError: aiResult.fallbackUsed ? null : aiResult.error || null,
  });

  await saveConversationTurn({
    chatId: remoteJid,
    chatName: senderName,
    userText: incomingText,
    assistantText: assistantReply,
    userMessageId: messageId,
    assistantMessageId: sentMessage?.key?.id || null,
    senderName,
  });
}

async function buildSocket() {
  await ensureAuthFolder();

  const { state, saveCreds } = await createMultiFileAuthState(runtime.authPath);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Desktop"),
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrCodeDataUrl = await QRCode.toDataURL(qr, {
        margin: 2,
        scale: 8,
        width: 320,
      });

      updateSnapshot({
        connectionStatus: "connecting",
        qrStatus: "waiting",
        qrCodeDataUrl,
        sessionStatus: "qr-ready",
        lastError: null,
      });

      await upsertBotState({
        connectionStatus: "connecting",
        qrStatus: "waiting",
        qrCodeDataUrl,
        sessionStatus: "qr-ready",
        lastError: null,
      });
    }

    if (connection === "open") {
      updateSnapshot({
        connectionStatus: "connected",
        qrStatus: "scanned",
        qrCodeDataUrl: null,
        sessionStatus: "running",
        startedAt: runtime.snapshot.startedAt || new Date().toISOString(),
        lastError: null,
      });

      await upsertBotState({
        connectionStatus: "connected",
        qrStatus: "scanned",
        qrCodeDataUrl: null,
        sessionStatus: "running",
        lastError: null,
      });
    }

    if (connection === "close") {
      const statusCode = getDisconnectStatusCode(lastDisconnect);
      const qrTimedOut = isQrTimeoutDisconnect(lastDisconnect);
      const shouldReconnect = !qrTimedOut && isReconnectableDisconnect(lastDisconnect);
      const errorMessage = lastDisconnect?.error?.message || "WhatsApp socket closed";
      const nextConnectionStatus = qrTimedOut
        ? "qr-expired"
        : shouldReconnect
          ? "reconnecting"
          : "logged-out";
      const nextQrStatus = qrTimedOut
        ? "expired"
        : shouldReconnect
          ? "refreshing"
          : "expired";
      const nextSessionStatus = qrTimedOut
        ? "needs-reset"
        : shouldReconnect
          ? "reconnecting"
          : "logged-out";

      updateSnapshot({
        connectionStatus: nextConnectionStatus,
        qrStatus: nextQrStatus,
        sessionStatus: nextSessionStatus,
        lastError: errorMessage,
      });

      await upsertBotState({
        connectionStatus: nextConnectionStatus,
        qrStatus: nextQrStatus,
        sessionStatus: nextSessionStatus,
        lastError: errorMessage,
      });

      if (shouldReconnect) {
        if (runtime.reconnectTimer) {
          clearTimeout(runtime.reconnectTimer);
        }

        runtime.reconnectTimer = setTimeout(() => {
          runtime.startingPromise = null;
          runtime.started = false;
          ensureWhatsAppBot().catch((error) => {
            updateSnapshot({
              connectionStatus: "error",
              sessionStatus: "error",
              lastError: error?.message || "Reconnect failed",
            });
          });
        }, 5000);
      } else if (qrTimedOut) {
        await clearAuthFolder();
      }
    }
  });

  socket.ev.on("messages.upsert", async (event) => {
    if (event.type !== "notify") {
      return;
    }

    for (const message of event.messages) {
      try {
        await handleIncomingMessage(socket, message);
      } catch (error) {
        updateSnapshot({
          connectionStatus: runtime.snapshot.connectionStatus,
          sessionStatus: "running",
          lastError: error?.message || "Failed to process incoming message",
        });

        await upsertBotState({
          connectionStatus: runtime.snapshot.connectionStatus,
          qrStatus: runtime.snapshot.qrStatus,
          qrCodeDataUrl: runtime.snapshot.qrCodeDataUrl,
          lastReceivedMessage: runtime.snapshot.lastReceivedMessage,
          lastReply: runtime.snapshot.lastReply,
          totalMessagesHandled: runtime.snapshot.totalMessagesHandled,
          sessionStatus: "running",
          lastError: error?.message || "Failed to process incoming message",
        });
      }
    }
  });

  runtime.socket = socket;
  runtime.started = true;
  runtime.startingPromise = null;

  updateSnapshot({
    startedAt: runtime.snapshot.startedAt || new Date().toISOString(),
    sessionStatus: "starting",
    connectionStatus: "connecting",
  });

  await upsertBotState({
    connectionStatus: "connecting",
    qrStatus: runtime.snapshot.qrStatus,
    qrCodeDataUrl: runtime.snapshot.qrCodeDataUrl,
    sessionStatus: "starting",
  });

  return socket;
}

export async function ensureWhatsAppBot() {
  if (runtime.socket && runtime.started) {
    return runtime.socket;
  }

  if (!runtime.startingPromise) {
    runtime.startingPromise = buildSocket();
  }

  return runtime.startingPromise;
}

export function getWhatsAppBotSnapshot() {
  return runtime.snapshot;
}

export async function restartWhatsAppBot() {
  runtime.started = false;
  runtime.startingPromise = null;

  if (runtime.socket) {
    try {
      runtime.socket.end(new Error("Manual restart requested"));
    } catch (error) {
      // The socket can already be closed during reconnects.
    }
  }

  runtime.socket = null;
  updateSnapshot({
    connectionStatus: "reconnecting",
    qrStatus: "refreshing",
    sessionStatus: "reconnecting",
    lastError: null,
  });

  await upsertBotState({
    connectionStatus: "reconnecting",
    qrStatus: "refreshing",
    sessionStatus: "reconnecting",
    lastError: null,
  });

  return ensureWhatsAppBot();
}

export async function resetWhatsAppSession() {
  runtime.started = false;
  runtime.startingPromise = null;

  if (runtime.reconnectTimer) {
    clearTimeout(runtime.reconnectTimer);
    runtime.reconnectTimer = null;
  }

  if (runtime.socket) {
    try {
      runtime.socket.end(new Error("Session reset requested"));
    } catch (error) {
      // Socket may already be closed.
    }
  }

  runtime.socket = null;
  await clearAuthFolder();

  updateSnapshot({
    connectionStatus: "connecting",
    qrStatus: "idle",
    qrCodeDataUrl: null,
    sessionStatus: "starting",
    lastError: null,
  });

  await upsertBotState({
    connectionStatus: "connecting",
    qrStatus: "idle",
    qrCodeDataUrl: null,
    sessionStatus: "starting",
    lastError: null,
  });

  return ensureWhatsAppBot();
}