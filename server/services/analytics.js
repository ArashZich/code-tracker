const Activity = require("../models/activity");
const User = require("../models/user");

/**
 * Get overall statistics for a user
 * @param {String} username - The username
 * @param {String} timeframe - day, week, month, or year
 * @returns {Object} Statistics object
 */
async function getStatistics(username, timeframe = "day") {
  try {
    // Get date range based on timeframe
    const { startDate, endDate } = getDateRange(timeframe);

    // Find the user
    const user = await User.findOne({ username });

    if (!user) {
      throw new Error("User not found");
    }

    // Count total activities
    const totalActivities = await Activity.countDocuments({
      username,
      timestamp: { $gte: startDate, $lte: endDate },
    });

    // Count edit activities
    const editActivities = await Activity.countDocuments({
      username,
      type: "edit",
      timestamp: { $gte: startDate, $lte: endDate },
    });

    // Get total change size
    const changeSizeResult = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: startDate, $lte: endDate },
          changeSize: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          totalChangeSize: { $sum: "$changeSize" },
        },
      },
    ]);

    const totalChangeSize =
      changeSizeResult.length > 0 ? changeSizeResult[0].totalChangeSize : 0;

    // Count unique files
    const uniqueFilesResult = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$fileName",
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    const uniqueFiles =
      uniqueFilesResult.length > 0 ? uniqueFilesResult[0].count : 0;

    // Count unique languages
    const uniqueLanguagesResult = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: startDate, $lte: endDate },
          language: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$language",
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    const uniqueLanguages =
      uniqueLanguagesResult.length > 0 ? uniqueLanguagesResult[0].count : 0;

    // Calculate active hours
    // This is a simple approximation - a more accurate calculation would involve
    // looking at gaps in activity to determine actual coding sessions
    const hoursActive =
      totalActivities > 0 ? Math.max(1, Math.round(totalActivities / 60)) : 0;

    // Format hours and minutes
    const hours = Math.floor(hoursActive);
    const minutes = Math.round((hoursActive - hours) * 60);
    const activeTimeFormatted = `${hours}h ${minutes}m`;

    return {
      totalActivities,
      editActivities,
      totalChangeSize,
      uniqueFiles,
      uniqueLanguages,
      activeTime: activeTimeFormatted,
      timeframe,
      startDate,
      endDate,
      stats: {
        totalTime: activeTimeFormatted,
        linesWritten: totalChangeSize.toString(),
        filesModified: uniqueFiles.toString(),
        languagesUsed: uniqueLanguages.toString(),
      },
    };
  } catch (error) {
    console.error("Error getting statistics:", error);
    throw error;
  }
}

/**
 * Get language breakdown for a user
 * @param {String} username - The username
 * @param {String} timeframe - day, week, month, or year
 * @returns {Array} Array of language statistics
 */
async function getLanguageBreakdown(username, timeframe = "day") {
  try {
    // Get date range based on timeframe
    const { startDate, endDate } = getDateRange(timeframe);

    // Aggregate language statistics
    const languages = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: startDate, $lte: endDate },
          language: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$language",
          count: { $sum: 1 },
          changeSize: { $sum: { $ifNull: ["$changeSize", 0] } },
          files: { $addToSet: "$fileName" },
        },
      },
      {
        $project: {
          name: "$_id",
          timeSpent: {
            $multiply: [{ $divide: ["$count", { $sum: "$count" }] }, 100],
          },
          changeSize: 1,
          files: { $size: "$files" },
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Calculate percentages
    const totalCount = languages.reduce((sum, lang) => sum + lang.count, 0);

    return languages.map((lang) => ({
      name: lang.name,
      timeSpent: Math.round((lang.count / totalCount) * 60), // Convert to minutes based on 1 hour
      percentage: Math.round((lang.count / totalCount) * 100),
      files: lang.files,
    }));
  } catch (error) {
    console.error("Error getting language breakdown:", error);
    throw error;
  }
}

/**
 * Get project breakdown for a user
 * @param {String} username - The username
 * @param {String} timeframe - day, week, month, or year
 * @returns {Array} Array of project statistics
 */
async function getProjectBreakdown(username, timeframe = "day") {
  try {
    // Get date range based on timeframe
    const { startDate, endDate } = getDateRange(timeframe);

    // Aggregate project statistics
    const projects = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: startDate, $lte: endDate },
          projectFolder: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$projectFolder",
          count: { $sum: 1 },
          changeSize: { $sum: { $ifNull: ["$changeSize", 0] } },
          files: { $addToSet: "$fileName" },
        },
      },
      {
        $project: {
          name: "$_id",
          count: 1,
          changeSize: 1,
          files: { $size: "$files" },
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Calculate percentages
    const totalCount = projects.reduce((sum, proj) => sum + proj.count, 0);

    return projects.map((proj) => ({
      name: proj.name,
      timeSpent: Math.round((proj.count / totalCount) * 60), // Convert to minutes based on 1 hour
      percentage: Math.round((proj.count / totalCount) * 100),
      files: proj.files,
    }));
  } catch (error) {
    console.error("Error getting project breakdown:", error);
    throw error;
  }
}

/**
 * Get file activity statistics for a user
 * @param {String} username - The username
 * @param {String} timeframe - day, week, month, or year
 * @returns {Array} Array of file activity statistics
 */
async function getFileActivity(username, timeframe = "day") {
  try {
    // Get date range based on timeframe
    const { startDate, endDate } = getDateRange(timeframe);

    // Aggregate file statistics
    const files = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            fileName: "$fileName",
            projectFolder: "$projectFolder",
            language: "$language",
          },
          count: { $sum: 1 },
          editCount: {
            $sum: {
              $cond: [{ $eq: ["$type", "edit"] }, 1, 0],
            },
          },
          changeSize: { $sum: { $ifNull: ["$changeSize", 0] } },
        },
      },
      {
        $project: {
          name: "$_id.fileName",
          project: "$_id.projectFolder",
          language: "$_id.language",
          edits: "$editCount",
          totalActivity: "$count",
          changeSize: "$changeSize",
          _id: 0,
        },
      },
      {
        $sort: { totalActivity: -1 },
      },
      {
        $limit: 50,
      },
    ]);

    // Calculate time spent
    const totalCount = files.reduce((sum, file) => sum + file.totalActivity, 0);

    return files.map((file) => ({
      name: file.name,
      timeSpent: Math.round((file.totalActivity / totalCount) * 60), // Convert to minutes based on 1 hour
      edits: file.edits,
      project: file.project || "Unknown",
      language: file.language || "Unknown",
    }));
  } catch (error) {
    console.error("Error getting file activity:", error);
    throw error;
  }
}

/**
 * Get date range based on timeframe
 * @param {String} timeframe - day, week, month, or year
 * @returns {Object} Object with startDate and endDate
 */
function getDateRange(timeframe) {
  const endDate = new Date();
  let startDate = new Date();

  switch (timeframe) {
    case "day":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case "custom":
      // For custom timeframe, we'll use a 30-day default
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

module.exports = {
  getStatistics,
  getLanguageBreakdown,
  getProjectBreakdown,
  getFileActivity,
  getDateRange,
};
