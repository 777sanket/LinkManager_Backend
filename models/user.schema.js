const mongoose = require("mongoose");
const Links = require("./links.schema");
const Analysis = require("./analysis.schema");
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

// Middleware to cascade delete related Links and Analysis
UserSchema.pre("remove", async function (next) {
  const userId = this._id;

  // Delete all links related to this user
  await Links.deleteMany({ user: userId });

  // Delete all analysis related to this user
  await Analysis.deleteMany({ user: userId });

  next();
});

module.exports = mongoose.model("User", UserSchema);
