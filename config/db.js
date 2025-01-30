const moongose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await moongose.connect(MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.log("Error Connecting DB ", error);
    process.exit(1);
  }
};

module.exports = connectDB;
