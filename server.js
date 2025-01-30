const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const userRoutes = require("./routes/user");
const linkRoutes = require("./routes/links");
const analysisRoutes = require("./routes/analysis");

const app = express();
dotenv.config();
const PORT = process.env.PORT || 3000;
connectDB();

const corsOptions = {
  // origin: "http://localhost:5173",
  origin: "https://srw-lm-sanket-wasniks-projects.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/user", userRoutes);
app.use("/api/links", linkRoutes);
// app.use("/api/analysis", analysisRoutes);
app.use("/", analysisRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
