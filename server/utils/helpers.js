const mongoose = require("mongoose");

/**
 * Convert a string to MongoDB ObjectId
 * @param {String} id - String ID
 * @returns {ObjectId|null} MongoDB ObjectId or null if invalid
 */
function getObjectId(id) {
  try {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return new mongoose.Types.ObjectId(id);
    }
    return null;
  } catch (error) {
    console.error("Error converting to ObjectId:", error);
    return null;
  }
}

/**
 * Format a date to a readable string
 * @param {Date} date - Date object
 * @returns {String} Formatted date string
 */
function formatDate(date) {
  if (!date) return "";

  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format milliseconds to hours and minutes
 * @param {Number} ms - Milliseconds
 * @returns {String} Formatted time string (e.g., "2h 30m")
 */
function formatTime(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

/**
 * Calculate percentage and format it
 * @param {Number} value - Current value
 * @param {Number} total - Total value
 * @returns {String} Formatted percentage (e.g., "42.5%")
 */
function calculatePercentage(value, total) {
  if (total === 0) return "0%";

  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
}

/**
 * Generate random activity data for development
 * @param {String} username - The username
 * @param {Number} days - Number of days to generate data for
 * @returns {Array} Array of activity objects
 */
function generateRandomActivity(username, days = 7) {
  const activities = [];
  const projectFolders = ["ProjectA", "ProjectB", "Website", "Documentation"];
  const languages = ["JavaScript", "HTML", "CSS", "Python", "Markdown", "JSON"];
  const activityTypes = ["edit", "focus", "save"];

  // Create a random session ID
  const sessionId = `session_${Date.now()}`;

  // Generate activities for each day
  for (let day = 0; day < days; day++) {
    const date = new Date();
    date.setDate(date.getDate() - day);

    // Random number of activities per day (10-100)
    const activitiesCount = Math.floor(Math.random() * 90) + 10;

    for (let i = 0; i < activitiesCount; i++) {
      // Random time during the day
      const timestamp = new Date(date);
      timestamp.setHours(
        Math.floor(Math.random() * 14) + 8, // 8 AM to 10 PM
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      );

      // Random project and language
      const projectFolder =
        projectFolders[Math.floor(Math.random() * projectFolders.length)];
      const language = languages[Math.floor(Math.random() * languages.length)];
      const activityType =
        activityTypes[Math.floor(Math.random() * activityTypes.length)];

      // Create file name based on project and language
      const fileName = `${projectFolder.toLowerCase()}_${
        Math.floor(Math.random() * 5) + 1
      }.${getFileExtension(language)}`;

      // Create activity object
      const activity = {
        username,
        sessionId,
        type: activityType,
        timestamp,
        fileName,
        filePath: `/home/user/${projectFolder}/${fileName}`,
        language,
        projectFolder,
        workspace: "MainWorkspace",
      };

      // Add type-specific data
      if (activityType === "edit") {
        activity.changeSize = Math.floor(Math.random() * 100);
      } else if (activityType === "save") {
        activity.fileSize = Math.floor(Math.random() * 10000);
      }

      activities.push(activity);
    }
  }

  return activities;
}

/**
 * Get file extension based on language
 * @param {String} language - Programming language
 * @returns {String} File extension
 */
function getFileExtension(language) {
  switch (language.toLowerCase()) {
    case "javascript":
      return "js";
    case "html":
      return "html";
    case "css":
      return "css";
    case "python":
      return "py";
    case "markdown":
      return "md";
    case "json":
      return "json";
    default:
      return "txt";
  }
}

module.exports = {
  getObjectId,
  formatDate,
  formatTime,
  calculatePercentage,
  generateRandomActivity,
};
