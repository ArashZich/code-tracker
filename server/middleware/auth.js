const jwt = require("jsonwebtoken");
const User = require("../models/user");

/**
 * Authentication middleware
 * Verifies JWT token in Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    );

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found.",
      });
    }

    // Add user to request
    req.user = {
      id: user._id,
      username: user.username,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired.",
      });
    }

    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

/**
 * Simplified authentication for VSCode extension
 * Allows authentication via username in request body
 */
const simpleAuthenticate = async (req, res, next) => {
  try {
    // First try JWT auth
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "default_secret"
        );
        const user = await User.findById(decoded.id);

        if (user) {
          req.user = {
            id: user._id,
            username: user.username,
          };
          return next();
        }
      } catch (tokenError) {
        // Token auth failed, continue to username auth
        console.log("Token auth failed, trying username auth");
      }
    }

    // Try username auth
    const username = req.body.username || req.query.username;
    if (!username) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed. No username provided.",
      });
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed. User not found.",
      });
    }

    // Add user to request
    req.user = {
      id: user._id,
      username: user.username,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

/**
 * Optional authentication
 * Tries to authenticate but continues even if not authenticated
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    );

    // Find user
    const user = await User.findById(decoded.id);
    if (user) {
      // Add user to request
      req.user = {
        id: user._id,
        username: user.username,
      };
    }

    next();
  } catch (error) {
    // Continue even if authentication fails
    next();
  }
};

module.exports = {
  authenticate,
  simpleAuthenticate,
  optionalAuthenticate,
};
