const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const tracker = require("./services/tracker");
const api = require("./services/api");
const auth = require("./services/auth");

let statusBarItem;
let trackingEnabled = false;
let currentSession = null;
let webviewPanel = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("Code Tracker extension is now active!");

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.text = "$(clock) Code Tracker: Inactive";
  statusBarItem.tooltip = "Click to view your coding statistics";
  statusBarItem.command = "code-tracker.showDashboard";
  statusBarItem.show();

  // Get configuration
  const config = vscode.workspace.getConfiguration("codeTracker");
  trackingEnabled = config.get("trackingEnabled");

  // Register commands
  let startTrackingCmd = vscode.commands.registerCommand(
    "code-tracker.startTracking",
    startTracking
  );
  let stopTrackingCmd = vscode.commands.registerCommand(
    "code-tracker.stopTracking",
    stopTracking
  );
  let showDashboardCmd = vscode.commands.registerCommand(
    "code-tracker.showDashboard",
    showDashboard
  );
  let loginCmd = vscode.commands.registerCommand(
    "code-tracker.login",
    showLoginForm
  );
  let registerCmd = vscode.commands.registerCommand(
    "code-tracker.register",
    showRegistrationForm
  );

  context.subscriptions.push(
    startTrackingCmd,
    stopTrackingCmd,
    showDashboardCmd,
    loginCmd,
    registerCmd,
    statusBarItem
  );

  // Auto start tracking if enabled
  if (trackingEnabled) {
    startTracking();
  }

  // Setup event listeners
  setupEventListeners(context);
}

function deactivate() {
  if (currentSession) {
    stopTracking();
  }
}

function setupEventListeners(context) {
  // Track text document changes
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (!trackingEnabled || !currentSession) return;
    tracker.trackEdit(event, currentSession);
  });

  // Track active editor changes
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (!trackingEnabled || !currentSession) return;
    tracker.trackEditorChange(editor, currentSession);
  });

  // Track when files are saved
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (!trackingEnabled || !currentSession) return;
    tracker.trackSave(document, currentSession);
  });

  // Configuration changes
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("codeTracker")) {
      const config = vscode.workspace.getConfiguration("codeTracker");
      const wasEnabled = trackingEnabled;
      trackingEnabled = config.get("trackingEnabled");

      if (trackingEnabled && !wasEnabled) {
        startTracking();
      } else if (!trackingEnabled && wasEnabled) {
        stopTracking();
      }
    }
  });
}

async function startTracking() {
  try {
    // Check for user authentication
    const username = vscode.workspace
      .getConfiguration("codeTracker")
      .get("username");
    if (!username) {
      const choice = await vscode.window.showInformationMessage(
        "You need to set up your Code Tracker account first.",
        "Login",
        "Register"
      );

      if (choice === "Login") {
        showLoginForm();
      } else if (choice === "Register") {
        showRegistrationForm();
      }
      return;
    }

    // Start a new tracking session
    currentSession = {
      id: Date.now().toString(),
      startTime: new Date(),
      user: username,
      workspace: vscode.workspace.name || "unnamed-workspace",
      activities: [],
    };

    trackingEnabled = true;
    vscode.workspace
      .getConfiguration("codeTracker")
      .update("trackingEnabled", true, true);

    // Update status bar
    statusBarItem.text = "$(check) Code Tracker: Active";
    statusBarItem.tooltip =
      "Tracking your coding activity. Click to view dashboard.";

    vscode.window.showInformationMessage("Code tracking started!");

    // Send heartbeat to server
    api.heartbeat(username);

    // Set interval to sync data
    setInterval(() => {
      if (currentSession && currentSession.activities.length > 0) {
        syncData();
      }
    }, 60000); // Sync every minute
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to start tracking: ${error.message}`
    );
  }
}

function stopTracking() {
  if (currentSession) {
    // Sync remaining data
    syncData();

    // Reset session
    currentSession = null;
    statusBarItem.text = "$(clock) Code Tracker: Inactive";
    statusBarItem.tooltip = "Click to view your coding statistics";

    trackingEnabled = false;
    vscode.workspace
      .getConfiguration("codeTracker")
      .update("trackingEnabled", false, true);

    vscode.window.showInformationMessage("Code tracking stopped.");
  }
}

async function syncData() {
  if (!currentSession || currentSession.activities.length === 0) return;

  try {
    const serverUrl = vscode.workspace
      .getConfiguration("codeTracker")
      .get("serverUrl");
    const username = vscode.workspace
      .getConfiguration("codeTracker")
      .get("username");

    if (!serverUrl || !username) {
      vscode.window.showErrorMessage("Server URL or username not configured.");
      return;
    }

    // Clone the activities array and clear original
    const activitiesToSync = [...currentSession.activities];
    currentSession.activities = [];

    // Send data to server
    await api.syncActivities(serverUrl, username, activitiesToSync);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to sync data: ${error.message}`);
    // Put activities back if sync failed
    if (currentSession) {
      currentSession.activities.push(...activitiesToSync);
    }
  }
}

function showDashboard() {
  if (webviewPanel) {
    webviewPanel.reveal();
    return;
  }

  webviewPanel = vscode.window.createWebviewPanel(
    "codeTrackerDashboard",
    "Code Tracker Dashboard",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(path.join(__dirname, "web"))],
    }
  );

  // Load dashboard HTML
  const webviewPath = path.join(__dirname, "web", "index.html");
  let html = fs.readFileSync(webviewPath, "utf8");

  // Replace placeholder with server URL
  const serverUrl = vscode.workspace
    .getConfiguration("codeTracker")
    .get("serverUrl");
  html = html.replace(/SERVER_URL_PLACEHOLDER/g, serverUrl);

  // Replace username placeholder
  const username = vscode.workspace
    .getConfiguration("codeTracker")
    .get("username");
  html = html.replace(/USERNAME_PLACEHOLDER/g, username || "");

  webviewPanel.webview.html = html;

  // Handle messages from webview
  webviewPanel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case "login":
          auth.login(message.username).then((success) => {
            if (success) {
              vscode.workspace
                .getConfiguration("codeTracker")
                .update("username", message.username, true);
              webviewPanel.webview.postMessage({
                command: "loginSuccess",
                username: message.username,
              });
              startTracking();
            }
          });
          break;
        case "register":
          auth.register(message.username).then((success) => {
            if (success) {
              vscode.workspace
                .getConfiguration("codeTracker")
                .update("username", message.username, true);
              webviewPanel.webview.postMessage({
                command: "registerSuccess",
                username: message.username,
              });
              startTracking();
            }
          });
          break;
      }
    },
    undefined,
    []
  );

  // Handle panel disposal
  webviewPanel.onDidDispose(
    () => {
      webviewPanel = null;
    },
    null,
    []
  );
}

function showLoginForm() {
  if (webviewPanel) {
    webviewPanel.reveal();
    webviewPanel.webview.postMessage({ command: "showLogin" });
    return;
  }

  showDashboard();
  setTimeout(() => {
    if (webviewPanel) {
      webviewPanel.webview.postMessage({ command: "showLogin" });
    }
  }, 500);
}

function showRegistrationForm() {
  if (webviewPanel) {
    webviewPanel.reveal();
    webviewPanel.webview.postMessage({ command: "showRegister" });
    return;
  }

  showDashboard();
  setTimeout(() => {
    if (webviewPanel) {
      webviewPanel.webview.postMessage({ command: "showRegister" });
    }
  }, 500);
}

module.exports = {
  activate,
  deactivate,
};
