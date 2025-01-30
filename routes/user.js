const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.schema");
const Links = require("../models/links.schema");
const Analysis = require("../models/analysis.schema");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // Extract the user ID from the auth middleware
    const user = await User.findById(userId).select("-password"); // Exclude the password field
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user data:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// POST: Register a new user
router.post("/register", async (req, res) => {
  const { name, email, mobile, password, confirmPassword } = req.body;

  // Validate input
  if (!name || !email || !mobile || !password || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password !== confirmPassword) {
    return res.status(406).json({ error: "Passwords do not match" });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "User already Exists " });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({ name, email, mobile, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST: Login a user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Wrong Username or Password" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Wrong Username or Password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { user: { id: user._id, email: user.email } },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST: Logout a user (optional)
router.post("/logout", (req, res) => {
  // Client-side can handle token removal (e.g., deleting it from storage)
  res.status(200).json({ message: "Logged out successfully" });
});

// PUT: Edit user data (name, email, mobile)
router.put("/edit", authMiddleware, async (req, res) => {
  const { name, email, mobile } = req.body;

  // Validate input
  if (!name && !email && !mobile) {
    return res
      .status(400)
      .json({ error: "At least one field is required to update" });
  }

  try {
    // Update user details
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(name && { name }),
        ...(email && { email }),
        ...(mobile && { mobile }),
      },
      { new: true }
    );

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/delete", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // Extract user ID from the authenticated token

    // Delete related links
    await Links.deleteMany({ user: userId });

    // Delete related analysis records
    await Analysis.deleteMany({ user: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    res
      .status(200)
      .json({ message: "User and related data deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
