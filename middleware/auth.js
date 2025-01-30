// This middleware will be used to protect routes that require authentication

const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const authMiddleware = (req, res, next) => {
  console.log("Auth middleware triggered");

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "This action is not allowed" });
  }

  // const token = authHeader.split(" ")[1]; // Extract the token part

  try {
    const decoded = jwt.verify(authHeader, process.env.JWT_SECRET);
    req.user = decoded.user; // Assuming your payload has a `user` object
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
