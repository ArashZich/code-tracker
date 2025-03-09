const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

/**
 * Register a new user
 * @param {String} username - Username or email
 * @param {String} password - Optional password
 * @returns {Promise<Object>} User object and success status
 */
async function registerUser(username, password = null) {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return {
        success: false,
        message: "Username already exists",
      };
    }

    // Create new user
    const user = new User({
      username,
      password,
    });

    await user.save();

    return {
      success: true,
      user: {
        id: user._id,
        username: user.username,
        settings: user.settings,
      },
      message: "User registered successfully",
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      message: "Registration failed: " + error.message,
    };
  }
}

/**
 * Login a user
 * @param {String} username - Username or email
 * @param {String} password - Optional password
 * @returns {Promise<Object>} User object, token and success status
 */
async function loginUser(username, password = null) {
  try {
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // If password is provided, validate it
    if (password && user.password) {
      const validPassword = await user.comparePassword(password);
      if (!validPassword) {
        return {
          success: false,
          message: "Invalid password",
        };
      }
    }

    // Update last active timestamp
    user.lastActive = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "30d" }
    );

    return {
      success: true,
      user: {
        id: user._id,
        username: user.username,
        settings: user.settings,
      },
      token,
      message: "Login successful",
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Login failed: " + error.message,
    };
  }
}

/**
 * Verify a JWT token
 * @param {String} token - JWT token
 * @returns {Promise<Object>} Decoded token payload or error
 */
async function verifyToken(token) {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    );

    const user = await User.findById(decoded.id);
    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    return {
      success: true,
      user: {
        id: user._id,
        username: user.username,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Invalid token",
    };
  }
}

/**
 * Update user settings
 * @param {String} username - The username
 * @param {Object} settings - Settings object
 * @returns {Promise<Object>} Updated settings and success status
 */
async function updateUserSettings(username, settings) {
  try {
    const user = await User.findOne({ username });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Update settings
    user.settings = { ...user.settings, ...settings };
    await user.save();

    return {
      success: true,
      settings: user.settings,
      message: "Settings updated successfully",
    };
  } catch (error) {
    console.error("Settings update error:", error);
    return {
      success: false,
      message: "Failed to update settings: " + error.message,
    };
  }
}

/**
 * Check if a user exists
 * @param {String} username - Username to check
 * @returns {Promise<Boolean>} True if user exists, false otherwise
 */
async function userExists(username) {
  try {
    const user = await User.findOne({ username });
    return !!user;
  } catch (error) {
    console.error("User check error:", error);
    return false;
  }
}

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  updateUserSettings,
  userExists,
};
