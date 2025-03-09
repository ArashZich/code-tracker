const express = require("express");
const router = express.Router();
const Activity = require("../models/activity");
const User = require("../models/user");
const { getObjectId } = require("../utils/helpers");

// Record new activities
router.post("/", async (req, res) => {
  try {
    const { username, activities } = req.body;

    if (!username || !activities || !Array.isArray(activities)) {
      return res.status(400).json({
        success: false,
        message: "Username and activities array are required",
      });
    }

    // Find the user
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update last active timestamp
    user.lastActive = new Date();
    await user.save();

    // Prepare activities for insertion
    const activitiesToInsert = activities.map((activity) => ({
      ...activity,
      user: user._id,
      username: user.username,
    }));

    // Insert activities in bulk
    await Activity.insertMany(activitiesToInsert);

    res.status(201).json({
      success: true,
      message: `${activities.length} activities recorded successfully`,
    });
  } catch (error) {
    console.error("Error recording activities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record activities",
    });
  }
});

// Get activities for a user
router.get("/", async (req, res) => {
  try {
    const { username, from, to, type, limit } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Build query
    const query = { username };

    // Add date range if provided
    if (from || to) {
      query.timestamp = {};

      if (from) {
        query.timestamp.$gte = new Date(from);
      }

      if (to) {
        query.timestamp.$lte = new Date(to);
      }
    }

    // Add activity type if provided
    if (type) {
      query.type = type;
    }

    // Get activities
    const activities = await Activity.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit) || 100);

    res.json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// Get recent activity summary
router.get("/summary", async (req, res) => {
  try {
    const { username, days } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Calculate date for the given days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (parseInt(days) || 7));

    // Aggregate activities
    const summary = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          activities: {
            $push: {
              type: "$_id.type",
              count: "$count",
            },
          },
          totalCount: { $sum: "$count" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Error fetching activity summary:", error);
    res.status(500).json({ error: "Failed to fetch activity summary" });
  }
});

// Get language distribution
router.get("/languages", async (req, res) => {
  try {
    const { username, days } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Calculate date for the given days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (parseInt(days) || 30));

    // Aggregate by language
    const languages = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: daysAgo },
          language: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$language",
          count: { $sum: 1 },
          changeSize: { $sum: { $ifNull: ["$changeSize", 0] } },
        },
      },
      {
        $project: {
          language: "$_id",
          count: 1,
          changeSize: 1,
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.json({
      success: true,
      languages,
    });
  } catch (error) {
    console.error("Error fetching language distribution:", error);
    res.status(500).json({ error: "Failed to fetch language distribution" });
  }
});

// Get project distribution
router.get("/projects", async (req, res) => {
  try {
    const { username, days } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Calculate date for the given days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (parseInt(days) || 30));

    // Aggregate by project
    const projects = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: daysAgo },
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
          project: "$_id",
          count: 1,
          changeSize: 1,
          fileCount: { $size: "$files" },
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Error fetching project distribution:", error);
    res.status(500).json({ error: "Failed to fetch project distribution" });
  }
});

// Get file statistics
router.get("/files", async (req, res) => {
  try {
    const { username, days, limit } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Calculate date for the given days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (parseInt(days) || 30));

    // Aggregate by file
    const files = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            fileName: "$fileName",
            filePath: "$filePath",
            language: "$language",
            projectFolder: "$projectFolder",
          },
          count: { $sum: 1 },
          changeSize: { $sum: { $ifNull: ["$changeSize", 0] } },
          lastModified: { $max: "$timestamp" },
        },
      },
      {
        $project: {
          fileName: "$_id.fileName",
          filePath: "$_id.filePath",
          language: "$_id.language",
          projectFolder: "$_id.projectFolder",
          count: 1,
          changeSize: 1,
          lastModified: 1,
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: parseInt(limit) || 50,
      },
    ]);

    res.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error("Error fetching file statistics:", error);
    res.status(500).json({ error: "Failed to fetch file statistics" });
  }
});

// Get time distribution by hour
router.get("/hours", async (req, res) => {
  try {
    const { username, days } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Calculate date for the given days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (parseInt(days) || 30));

    // Aggregate by hour
    const hourlyActivity = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            hour: { $hour: "$timestamp" },
          },
          count: { $sum: 1 },
          changeSize: { $sum: { $ifNull: ["$changeSize", 0] } },
        },
      },
      {
        $project: {
          hour: "$_id.hour",
          count: 1,
          changeSize: 1,
          _id: 0,
        },
      },
      {
        $sort: { hour: 1 },
      },
    ]);

    // Create a full 24-hour distribution, filling in zeros for missing hours
    const hoursDistribution = Array.from({ length: 24 }, (_, i) => {
      const hourData = hourlyActivity.find((item) => item.hour === i);
      return {
        hour: i,
        count: hourData ? hourData.count : 0,
        changeSize: hourData ? hourData.changeSize : 0,
      };
    });

    res.json({
      success: true,
      hoursDistribution,
    });
  } catch (error) {
    console.error("Error fetching hourly distribution:", error);
    res.status(500).json({ error: "Failed to fetch hourly distribution" });
  }
});

// Get day of week distribution
router.get("/weekdays", async (req, res) => {
  try {
    const { username, days } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Calculate date for the given days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (parseInt(days) || 90)); // Longer period for better week distribution

    // Aggregate by day of week
    const weekdayActivity = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: "$timestamp" }, // 1 for Sunday, 2 for Monday, etc.
          },
          count: { $sum: 1 },
          changeSize: { $sum: { $ifNull: ["$changeSize", 0] } },
        },
      },
      {
        $project: {
          dayOfWeek: "$_id.dayOfWeek",
          count: 1,
          changeSize: 1,
          _id: 0,
        },
      },
      {
        $sort: { dayOfWeek: 1 },
      },
    ]);

    // Create a full week distribution, filling in zeros for missing days
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const weekdayDistribution = Array.from({ length: 7 }, (_, i) => {
      const dayIndex = i + 1; // MongoDB dayOfWeek starts from 1
      const dayData = weekdayActivity.find(
        (item) => item.dayOfWeek === dayIndex
      );
      return {
        dayOfWeek: dayIndex,
        dayName: dayNames[i],
        count: dayData ? dayData.count : 0,
        changeSize: dayData ? dayData.changeSize : 0,
      };
    });

    res.json({
      success: true,
      weekdayDistribution,
    });
  } catch (error) {
    console.error("Error fetching weekday distribution:", error);
    res.status(500).json({ error: "Failed to fetch weekday distribution" });
  }
});

// Get productivity score over time
router.get("/productivity", async (req, res) => {
  try {
    const { username, days } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Calculate date for the given days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (parseInt(days) || 30));

    // Aggregate daily productivity metrics
    const dailyMetrics = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          },
          totalActivities: { $sum: 1 },
          totalChangeSize: { $sum: { $ifNull: ["$changeSize", 0] } },
          uniqueFiles: { $addToSet: "$fileName" },
          startTime: { $min: "$timestamp" },
          endTime: { $max: "$timestamp" },
        },
      },
      {
        $project: {
          date: "$_id.date",
          totalActivities: 1,
          totalChangeSize: 1,
          uniqueFileCount: { $size: "$uniqueFiles" },
          sessionDuration: {
            $divide: [
              { $subtract: ["$endTime", "$startTime"] },
              60000, // Convert ms to minutes
            ],
          },
          _id: 0,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    // Calculate productivity score based on activities, changes, and file count
    const productivityScores = dailyMetrics.map((day) => {
      // Simple scoring formula - can be adjusted based on preference
      const activityScore = Math.min(day.totalActivities / 100, 10); // Cap at 10
      const changeScore = Math.min(day.totalChangeSize / 1000, 10); // Cap at 10
      const fileScore = Math.min(day.uniqueFileCount, 10); // Cap at 10

      // Combined score out of 10
      const combinedScore = (activityScore + changeScore + fileScore) / 3;

      return {
        date: day.date,
        score: parseFloat(combinedScore.toFixed(1)),
        activityCount: day.totalActivities,
        changeSize: day.totalChangeSize,
        fileCount: day.uniqueFileCount,
        sessionMinutes: Math.round(day.sessionDuration),
      };
    });

    res.json({
      success: true,
      productivityScores,
    });
  } catch (error) {
    console.error("Error calculating productivity scores:", error);
    res.status(500).json({ error: "Failed to calculate productivity scores" });
  }
});

// Get coding streaks
router.get("/streaks", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Get all days with activity, going back 365 days
    const yearAgo = new Date();
    yearAgo.setDate(yearAgo.getDate() - 365);

    const activeDays = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: yearAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          date: "$_id.date",
          count: 1,
          _id: 0,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    // Convert dates to actual Date objects
    const activeDateObjects = activeDays.map((day) => new Date(day.date));

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if user coded today
    const codedToday = activeDateObjects.some((date) => {
      return date.toDateString() === today.toDateString();
    });

    // Start counting from today or yesterday
    let currentDate = codedToday ? today : yesterday;

    // Calculate current streak by walking backwards through days
    while (true) {
      const found = activeDateObjects.some((date) => {
        return date.toDateString() === currentDate.toDateString();
      });

      if (!found) break;

      currentStreak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Calculate longest streak
    let longestStreak = 0;
    let currentLongestStreak = 0;
    let previousDate = null;

    // Sort dates chronologically
    activeDateObjects.sort((a, b) => a - b);

    for (const date of activeDateObjects) {
      if (!previousDate) {
        // First date
        currentLongestStreak = 1;
        previousDate = date;
        continue;
      }

      // Calculate difference in days
      const diffTime = Math.abs(date - previousDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        currentLongestStreak++;
      } else {
        // Break in streak
        if (currentLongestStreak > longestStreak) {
          longestStreak = currentLongestStreak;
        }
        currentLongestStreak = 1;
      }

      previousDate = date;
    }

    // Check if final streak is the longest
    if (currentLongestStreak > longestStreak) {
      longestStreak = currentLongestStreak;
    }

    // Get calendar heatmap data (activity count per day)
    const calendarData = activeDays.reduce((acc, day) => {
      acc[day.date] = day.count;
      return acc;
    }, {});

    res.json({
      success: true,
      currentStreak,
      longestStreak,
      totalActiveDays: activeDays.length,
      calendarData,
    });
  } catch (error) {
    console.error("Error calculating coding streaks:", error);
    res.status(500).json({ error: "Failed to calculate coding streaks" });
  }
});

// Get trends over time
router.get("/trends", async (req, res) => {
  try {
    const { username, days, interval } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const intervalValue = interval || "day"; // day, week, month
    const daysValue = parseInt(days) || 90;

    // Calculate date for the given days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - daysValue);

    // Determine date format based on interval
    let dateFormat;
    if (intervalValue === "day") {
      dateFormat = "%Y-%m-%d";
    } else if (intervalValue === "week") {
      dateFormat = "%Y-%U"; // Year and week number
    } else {
      dateFormat = "%Y-%m"; // Year and month
    }

    // Aggregate by the selected interval
    const trends = await Activity.aggregate([
      {
        $match: {
          username,
          timestamp: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            interval: {
              $dateToString: { format: dateFormat, date: "$timestamp" },
            },
          },
          count: { $sum: 1 },
          changeSize: { $sum: { $ifNull: ["$changeSize", 0] } },
          uniqueFiles: { $addToSet: "$fileName" },
          languages: { $addToSet: "$language" },
        },
      },
      {
        $project: {
          interval: "$_id.interval",
          count: 1,
          changeSize: 1,
          fileCount: { $size: "$uniqueFiles" },
          languageCount: { $size: "$languages" },
          _id: 0,
        },
      },
      {
        $sort: { interval: 1 },
      },
    ]);

    res.json({
      success: true,
      trends,
      interval: intervalValue,
    });
  } catch (error) {
    console.error("Error calculating trends:", error);
    res.status(500).json({ error: "Failed to calculate trends" });
  }
});

// Delete activities
router.delete("/", async (req, res) => {
  try {
    const { username, from, to } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Build query
    const query = { username };

    // Add date range if provided
    if (from || to) {
      query.timestamp = {};

      if (from) {
        query.timestamp.$gte = new Date(from);
      }

      if (to) {
        query.timestamp.$lte = new Date(to);
      }
    }

    // Delete activities
    const result = await Activity.deleteMany(query);

    res.json({
      success: true,
      message: `${result.deletedCount} activities deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting activities:", error);
    res.status(500).json({ error: "Failed to delete activities" });
  }
});

module.exports = router;
