import BotState from "@/models/BotState";
import Conversation from "@/models/Conversation";
import ProcessedMessage from "@/models/ProcessedMessage";
import { connectMongo } from "./mongodb";

function toPlainDate(value) {
  return value ? new Date(value) : null;
}

export async function upsertBotState(patch = {}) {
  await connectMongo();

  const updated = await BotState.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        ...patch,
        key: "global",
        updatedAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return updated;
}

export async function getBotState() {
  await connectMongo();

  const state = await BotState.findOne({ key: "global" }).lean();
  return state || null;
}

export async function markMessageProcessed({ messageId, chatId, senderName, text }) {
  await connectMongo();

  try {
    await ProcessedMessage.create({ messageId, chatId, senderName, text });
    return { processed: true };
  } catch (error) {
    if (error?.code === 11000) {
      return { processed: false, duplicate: true };
    }

    throw error;
  }
}

export async function saveConversationTurn({
  chatId,
  chatName,
  userText,
  assistantText,
  userMessageId,
  assistantMessageId,
  senderName,
}) {
  await connectMongo();

  const messagesToStore = [
    {
      role: "user",
      text: userText,
      messageId: userMessageId,
      senderName,
      timestamp: new Date(),
    },
    {
      role: "assistant",
      text: assistantText,
      messageId: assistantMessageId,
      senderName: null,
      timestamp: new Date(),
    },
  ];

  await Conversation.findOneAndUpdate(
    { chatId },
    {
      $set: {
        chatName,
        lastMessageAt: new Date(),
      },
      $push: {
        messages: {
          $each: messagesToStore,
          $slice: -30,
        },
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

export async function getConversationHistory(chatId) {
  await connectMongo();

  const conversation = await Conversation.findOne({ chatId }).lean();
  if (!conversation?.messages?.length) {
    return [];
  }

  return conversation.messages.map((message) => ({
    role: message.role,
    text: message.text,
    senderName: message.senderName || null,
    timestamp: toPlainDate(message.timestamp),
  }));
}

export async function getDashboardSnapshot() {
  await connectMongo();

  const [botState, totalMessagesHandled, lastConversation] = await Promise.all([
    getBotState(),
    ProcessedMessage.countDocuments({}),
    Conversation.findOne({}).sort({ updatedAt: -1 }).lean(),
  ]);

  return {
    botState,
    totalMessagesHandled,
    lastConversation,
  };
}