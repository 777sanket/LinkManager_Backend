const mongoose = require("mongoose");

const AnalysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // The registered user who owns the link
    link: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Links",
      required: true,
    }, // Reference to the specific link
    dateClicked: { type: Date, default: Date.now },
    originalLink: { type: String, required: true },
    shortenedLink: { type: String, required: true },
    ipAddress: { type: String, required: true }, // IP of the unregistered user clicking the link
    userDevice: { type: String }, // Device of the unregistered user (e.g., "Android", "iOS", "Chrome", "Safari")
    deviceType: {
      type: String,
      enum: ["Mobile", "Tablet", "Desktop"],
      default: "Desktop",
    }, // Device type
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analysis", AnalysisSchema);
