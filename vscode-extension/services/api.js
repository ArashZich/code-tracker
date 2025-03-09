const axios = require("axios");
const vscode = require("vscode");

/**
 * Send heartbeat to server
 * @param {string} username
 */
async function heartbeat(username) {
  try {
    const serverUrl = vscode.workspace
      .getConfiguration("codeTracker")
      .get("serverUrl");
    if (!serverUrl) {
      throw new Error("Server URL not configured");
    }

    await axios.post(`${serverUrl}/api/heartbeat`, {
      username,
      timestamp: new Date().toISOString(),
      vsCodeVersion: vscode.version,
      extensionVersion: vscode.extensions.getExtension(
        "your-publisher-name.code-tracker"
      ).packageJSON.version,
    });

    return true;
  } catch (error) {
    console.error("Heartbeat failed:", error);
    return false;
  }
}

/**
 * Sync coding activities with server
 * @param {string} serverUrl
 * @param {string} username
 * @param {Array} activities
 */
async function syncActivities(serverUrl, username, activities) {
  try {
    const response = await axios.post(`${serverUrl}/api/activities`, {
      username,
      activities,
    });

    return response.data;
  } catch (error) {
    console.error("Failed to sync activities:", error);
    throw error;
  }
}

/**
 * Get user statistics from server
 * @param {string} serverUrl
 * @param {string} username
 * @param {string} timeframe - 'day', 'week', 'month', or 'year'
 */
async function getStatistics(serverUrl, username, timeframe = "day") {
  try {
    const response = await axios.get(`${serverUrl}/api/statistics`, {
      params: {
        username,
        timeframe,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Failed to get statistics:", error);
    throw error;
  }
}

/**
 * Get project breakdown
 * @param {string} serverUrl
 * @param {string} username
 * @param {string} timeframe - 'day', 'week', 'month', or 'year'
 */
async function getProjectBreakdown(serverUrl, username, timeframe = "day") {
  try {
    const response = await axios.get(`${serverUrl}/api/projects`, {
      params: {
        username,
        timeframe,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Failed to get project breakdown:", error);
    throw error;
  }
}

/**
 * Get language breakdown
 * @param {string} serverUrl
 * @param {string} username
 * @param {string} timeframe - 'day', 'week', 'month', or 'year'
 */
async function getLanguageBreakdown(serverUrl, username, timeframe = "day") {
  try {
    const response = await axios.get(`${serverUrl}/api/languages`, {
      params: {
        username,
        timeframe,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Failed to get language breakdown:", error);
    throw error;
  }
}

module.exports = {
  heartbeat,
  syncActivities,
  getStatistics,
  getProjectBreakdown,
  getLanguageBreakdown,
};
