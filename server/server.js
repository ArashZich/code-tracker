require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");

// Import middleware
const {
  simpleAuthenticate,
  optionalAuthenticate,
} = require("./middleware/auth");

// Import routes
const authRoutes = require("./routes/auth");
const activityRoutes = require("./routes/activity");

// Initialize Express app
const app = express();

// Set up security middleware
app.use(helmet());
app.disable("x-powered-by"); // Hide Express

// Set up rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes default
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

// Apply rate limiting to all API routes
app.use("/api/", limiter);

// Set up body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Set up CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Length", "X-Request-Id"],
  credentials: true,
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Set up compression
app.use(compression());

// Set up logging
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(
  morgan(morganFormat, {
    skip: function (req, res) {
      // Skip logging of heartbeat requests in production to reduce noise
      return (
        process.env.NODE_ENV === "production" && req.path === "/api/heartbeat"
      );
    },
  })
);

// Set up request timeout
const serverTimeout = parseInt(process.env.SERVER_TIMEOUT) || 120000; // 2 mins default
app.use((req, res, next) => {
  req.setTimeout(serverTimeout);
  res.setTimeout(serverTimeout);
  next();
});

// MongoDB connection with retry logic
const connectDB = async (retries = 5, delay = 5000) => {
  const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/code-tracker";
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  };

  try {
    await mongoose.connect(MONGODB_URI, options);
    console.log("MongoDB connected successfully");
  } catch (err) {
    if (retries === 0) {
      console.error("MongoDB connection error:", err);
      process.exit(1);
    }

    console.log(`Connection failed, retrying in ${delay}ms...`);
    setTimeout(() => connectDB(retries - 1, delay), delay);
  }
};

connectDB();

// Gracefully handle MongoDB disconnection
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected! Attempting to reconnect...");
  connectDB();
});

// Handle process termination
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed due to app termination");
  process.exit(0);
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/activities", simpleAuthenticate, activityRoutes);

// Public health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Heartbeat endpoint
app.post("/api/heartbeat", simpleAuthenticate, (req, res) => {
  // Update the user's last active timestamp
  const User = require("./models/user");
  User.findOneAndUpdate(
    { username: req.user.username },
    { lastActive: new Date() },
    { new: true }
  ).catch((err) => console.error("Error updating user activity:", err));

  // Log heartbeat
  console.log(`Heartbeat from ${req.user.username} at ${req.body.timestamp}`);
  res.status(200).json({ success: true });
});

// Statistics endpoints
app.get("/api/statistics", optionalAuthenticate, async (req, res) => {
  try {
    const { username, timeframe } = req.query;

    // Use authenticated user if no username provided
    const queryUsername = username || (req.user ? req.user.username : null);

    if (!queryUsername) {
      return res.status(400).json({ error: "Username is required" });
    }

    // If user is requesting data for another user, verify permissions
    if (req.user && req.user.username !== queryUsername) {
      // Simple permission check - in a real app, you would check if user has admin rights
      return res
        .status(403)
        .json({ error: "You can only access your own statistics" });
    }

    // Get statistics using analytics service
    const stats = await require("./services/analytics").getStatistics(
      queryUsername,
      timeframe
    );
    res.json(stats);
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

app.get("/api/languages", optionalAuthenticate, async (req, res) => {
  try {
    const { username, timeframe } = req.query;

    // Use authenticated user if no username provided
    const queryUsername = username || (req.user ? req.user.username : null);

    if (!queryUsername) {
      return res.status(400).json({ error: "Username is required" });
    }

    // If user is requesting data for another user, verify permissions
    if (req.user && req.user.username !== queryUsername) {
      return res
        .status(403)
        .json({ error: "You can only access your own data" });
    }

    const languages =
      await require("./services/analytics").getLanguageBreakdown(
        queryUsername,
        timeframe
      );
    res.json(languages);
  } catch (error) {
    console.error("Error fetching language breakdown:", error);
    res.status(500).json({ error: "Failed to fetch language breakdown" });
  }
});

app.get("/api/projects", optionalAuthenticate, async (req, res) => {
  try {
    const { username, timeframe } = req.query;

    // Use authenticated user if no username provided
    const queryUsername = username || (req.user ? req.user.username : null);

    if (!queryUsername) {
      return res.status(400).json({ error: "Username is required" });
    }

    // If user is requesting data for another user, verify permissions
    if (req.user && req.user.username !== queryUsername) {
      return res
        .status(403)
        .json({ error: "You can only access your own data" });
    }

    const projects = await require("./services/analytics").getProjectBreakdown(
      queryUsername,
      timeframe
    );
    res.json(projects);
  } catch (error) {
    console.error("Error fetching project breakdown:", error);
    res.status(500).json({ error: "Failed to fetch project breakdown" });
  }
});

app.get("/api/files", optionalAuthenticate, async (req, res) => {
  try {
    const { username, timeframe } = req.query;

    // Use authenticated user if no username provided
    const queryUsername = username || (req.user ? req.user.username : null);

    if (!queryUsername) {
      return res.status(400).json({ error: "Username is required" });
    }

    // If user is requesting data for another user, verify permissions
    if (req.user && req.user.username !== queryUsername) {
      return res
        .status(403)
        .json({ error: "You can only access your own data" });
    }

    const files = await require("./services/analytics").getFileActivity(
      queryUsername,
      timeframe
    );
    res.json(files);
  } catch (error) {
    console.error("Error fetching file activity:", error);
    res.status(500).json({ error: "Failed to fetch file activity" });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  // Serve frontend build
  app.use(express.static(path.join(__dirname, "public")));

  // Serve docs
  app.use("/docs", express.static(path.join(__dirname, "docs")));

  // Handle SPA routing - send all other requests to index.html
  app.get("*", (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith("/api/")) {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    } else {
      res.status(404).json({ error: "API endpoint not found" });
    }
  });
}

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Check if error is a MongoDB validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation error",
      message: err.message,
      details: err.errors,
    });
  }

  // Check if error is a MongoDB duplicate key error
  if (err.name === "MongoError" && err.code === 11000) {
    return res.status(409).json({
      error: "Duplicate key error",
      message: "A resource with that identifier already exists",
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: "Server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} in ${
      process.env.NODE_ENV || "development"
    } mode`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  // Don't crash the server in production
  if (process.env.NODE_ENV !== "production") {
    server.close(() => process.exit(1));
  }
});

module.exports = app;
