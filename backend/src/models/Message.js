const mongoose = require("mongoose");

const MAX_MESSAGE_LENGTH = 1000;

const MessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_MESSAGE_LENGTH,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// History is read newest-first, one page at a time.
MessageSchema.index({ conversation: 1, createdAt: -1 });

const Message = mongoose.model("Message", MessageSchema);
Message.MAX_MESSAGE_LENGTH = MAX_MESSAGE_LENGTH;

module.exports = Message;
