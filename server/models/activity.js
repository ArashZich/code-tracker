const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["edit", "focus", "save", "keystroke", "close", "open"],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
    },
    language: {
      type: String,
    },
    projectFolder: {
      type: String,
    },
    workspace: {
      type: String,
    },
    // Additional data based on activity type
    fileSize: { type: Number },
    changeSize: { type: Number },
    cursorPosition: { type: Number },
    lineNumber: { type: Number },
    characterCount: { type: Number },
  },
  { timestamps: true }
);

// Create compound indexes for efficient queries
ActivitySchema.index({ username: 1, timestamp: -1 });
ActivitySchema.index({ username: 1, language: 1, timestamp: -1 });
ActivitySchema.index({ username: 1, projectFolder: 1, timestamp: -1 });
ActivitySchema.index({ username: 1, fileName: 1, timestamp: -1 });

const Activity = mongoose.model("Activity", ActivitySchema);

module.exports = Activity;
