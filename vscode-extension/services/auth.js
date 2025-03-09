const vscode = require("vscode");
const axios = require("axios");

/**
 * Login with username
 * @param {string} username
 * @returns {Promise<boolean>}
 */
async function login(username) {
  try {
    if (!username || username.trim() === "") {
      vscode.window.showErrorMessage("Username cannot be empty");
      return false;
    }

    const serverUrl = vscode.workspace
      .getConfiguration("codeTracker")
      .get("serverUrl");
    if (!serverUrl) {
      vscode.window.showErrorMessage("Server URL not configured");
      return false;
    }

    const response = await axios.post(`${serverUrl}/api/auth/login`, {
      username,
    });

    if (response.data.success) {
      vscode.window.showInformationMessage(`Logged in as ${username}`);
      return true;
    } else {
      vscode.window.showErrorMessage(response.data.message || "Login failed");
      return false;
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Login failed: ${error.message}`);
    return false;
  }
}

/**
 * Register with username
 * @param {string} username
 * @returns {Promise<boolean>}
 */
async function register(username) {
  try {
    if (!username || username.trim() === "") {
      vscode.window.showErrorMessage("Username cannot be empty");
      return false;
    }

    const serverUrl = vscode.workspace
      .getConfiguration("codeTracker")
      .get("serverUrl");
    if (!serverUrl) {
      vscode.window.showErrorMessage("Server URL not configured");
      return false;
    }

    const response = await axios.post(`${serverUrl}/api/auth/register`, {
      username,
    });

    if (response.data.success) {
      vscode.window.showInformationMessage(`Registered as ${username}`);
      return true;
    } else {
      vscode.window.showErrorMessage(
        response.data.message || "Registration failed"
      );
      return false;
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Registration failed: ${error.message}`);
    return false;
  }
}

/**
 * Check if user exists
 * @param {string} username
 * @returns {Promise<boolean>}
 */
async function checkUserExists(username) {
  try {
    const serverUrl = vscode.workspace
      .getConfiguration("codeTracker")
      .get("serverUrl");
    if (!serverUrl) {
      return false;
    }

    const response = await axios.get(`${serverUrl}/api/auth/check`, {
      params: { username },
    });

    return response.data.exists;
  } catch (error) {
    console.error("Error checking user:", error);
    return false;
  }
}

module.exports = {
  login,
  register,
  checkUserExists,
};
