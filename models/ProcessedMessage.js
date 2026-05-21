import mongoose from "mongoose";

const processedMessageSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, unique: true, index: true },
    chatId: { type: String, required: true },
    senderName: { type: String, default: null },
    text: { type: String, default: null },
    status: { type: String, default: "processed" },
    replyMessageId: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.models.ProcessedMessage || mongoose.model("ProcessedMessage", processedMessageSchema);