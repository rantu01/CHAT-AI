import mongoose from "mongoose";

const conversationMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    text: { type: String, required: true },
    messageId: { type: String, default: null },
    senderName: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true, unique: true, index: true },
    chatName: { type: String, default: null },
    messages: { type: [conversationMessageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);