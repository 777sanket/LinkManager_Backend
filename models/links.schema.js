const mongoose = require("mongoose");

const LinksSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateCreated: { type: Date, default: Date.now },
    originalLink: { type: String, required: true },
    shortenedLink: { type: String, required: true, unique: true },
    remark: { type: String },
    clicks: { type: Number, default: 0 },
    // status: { type: String, enum: ["active", "inactive"], default: "active" },
    expirationTime: { type: Date }, // If null, the link is always active
  },
  { timestamps: true }
);

module.exports = mongoose.model("Links", LinksSchema);
