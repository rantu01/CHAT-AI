import mongoose from "mongoose";

const botStateSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true, index: true },
    connectionStatus: { type: String, default: "disconnected" },
    qrStatus: { type: String, default: "idle" },
    qrCodeDataUrl: { type: String, default: null },
    lastError: { type: String, default: null },
    lastReceivedMessage: {
      text: { type: String, default: null },
      chatId: { type: String, default: null },
      senderName: { type: String, default: null },
      timestamp: { type: Date, default: null },
    },
    lastReply: {
      text: { type: String, default: null },
      chatId: { type: String, default: null },
      timestamp: { type: Date, default: null },
    },
    totalMessagesHandled: { type: Number, default: 0 },
    sessionStatus: { type: String, default: "not-started" },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.models.BotState || mongoose.model("BotState", botStateSchema);