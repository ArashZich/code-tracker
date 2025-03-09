const express = require("express");
const router = express.Router();
const User = require("../models/user");

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already exists. Please choose another username.",
      });
    }

    // Create new user
    const user = new User({
      username,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Registration successful",
      username: user.username,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});

// Login a user
router.post("/login", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please register first.",
      });
    }

    // Update last active timestamp
    await user.updateActivity();

    res.status(200).json({
      success: true,
      message: "Login successful",
      username: user.username,
      settings: user.settings,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

// Check if username exists
router.get("/check", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const user = await User.findOne({ username });

    res.json({
      exists: !!user,
      username,
    });
  } catch (error) {
    console.error("Error checking username:", error);
    res.status(500).json({ error: "Failed to check username" });
  }
});

// Update user settings
router.patch("/settings", async (req, res) => {
  try {
    const { username, settings } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update settings
    if (settings) {
      user.settings = { ...user.settings, ...settings };
      await user.save();
    }

    res.json({
      success: true,
      settings: user.settings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

module.exports = router;
