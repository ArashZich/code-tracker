const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

/**
 * Manages the dashboard webview panel
 */
class DashboardPanel {
  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this.context = context;
    this.panel = null;
    this.disposables = [];
  }

  /**
   * Shows the dashboard panel
   */
  show() {
    // If panel already exists, just reveal it
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    // Create a new panel
    this.panel = vscode.window.createWebviewPanel(
      "codeTrackerDashboard",
      "Code Tracker Dashboard",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, "web")),
        ],
      }
    );

    // Load the HTML content
    this.panel.webview.html = this._getHtmlContent();

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message) => this._handleWebviewMessage(message),
      null,
      this.disposables
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => this._dispose(), null, this.disposables);
  }

  /**
   * Sends a message to the webview
   * @param {Object} message - Message to send
   */
  postMessage(message) {
    if (this.panel) {
      this.panel.webview.postMessage(message);
    }
  }

  /**
   * Handles messages from the webview
   * @param {Object} message - Message from webview
   */
  _handleWebviewMessage(message) {
    console.log("Received message from webview:", message);

    switch (message.command) {
      case "login":
        // Forward to extension
        vscode.commands.executeCommand("code-tracker.login", message.username);
        break;
      case "register":
        // Forward to extension
        vscode.commands.executeCommand(
          "code-tracker.register",
          message.username
        );
        break;
      case "loadStatistics":
        // Send fake data back for now
        this._fetchAndSendDataToWebview(message.timeframe);
        break;
      case "saveSettings":
        // Update settings
        vscode.workspace
          .getConfiguration("codeTracker")
          .update("serverUrl", message.settings.serverUrl, true);
        vscode.workspace
          .getConfiguration("codeTracker")
          .update("trackingEnabled", message.settings.trackingEnabled, true);
        break;
      case "logout":
        // Execute logout command
        vscode.commands.executeCommand("code-tracker.stopTracking");
        vscode.workspace
          .getConfiguration("codeTracker")
          .update("username", "", true);
        this.postMessage({ command: "logoutSuccess" });
        break;
    }
  }

  /**
   * Fetches and sends data to the webview
   * @param {String} timeframe - The timeframe (day, week, month, year)
   */
  async _fetchAndSendDataToWebview(timeframe) {
    try {
      // Show loading state
      this.postMessage({ command: "setLoading", loading: true });

      // Get config
      const config = vscode.workspace.getConfiguration("codeTracker");
      const username = config.get("username");
      const serverUrl = config.get("serverUrl");

      // For demonstration, we'll just use mock data
      // In a real implementation, you would fetch from the server
      setTimeout(() => {
        const mockData = this._generateMockData(timeframe);
        this.postMessage({
          command: "updateData",
          data: mockData,
        });
        this.postMessage({ command: "setLoading", loading: false });
      }, 1000);
    } catch (error) {
      console.error("Error fetching data:", error);
      this.postMessage({
        command: "setError",
        error: "Failed to fetch data: " + error.message,
      });
      this.postMessage({ command: "setLoading", loading: false });
    }
  }

  /**
   * Generates mock data for demonstration
   * @param {String} timeframe - The timeframe (day, week, month, year)
   * @returns {Object} Mock data
   */
  _generateMockData(timeframe) {
    // This should match the format the webview expects
    return {
      stats: {
        totalTime: "3h 45m",
        linesWritten: "342",
        filesModified: "12",
        languagesUsed: "4",
      },
      activity: {
        labels: [
          "8am",
          "9am",
          "10am",
          "11am",
          "12pm",
          "1pm",
          "2pm",
          "3pm",
          "4pm",
          "5pm",
        ],
        values: [10, 25, 40, 30, 5, 15, 35, 55, 45, 20],
        recent: [
          {
            time: "5:32 PM",
            type: "Edit",
            file: "index.js",
            project: "My Project",
            language: "JavaScript",
          },
          {
            time: "5:15 PM",
            type: "Save",
            file: "styles.css",
            project: "My Project",
            language: "CSS",
          },
          {
            time: "4:50 PM",
            type: "Edit",
            file: "app.js",
            project: "My Project",
            language: "JavaScript",
          },
          {
            time: "4:22 PM",
            type: "Edit",
            file: "index.html",
            project: "My Project",
            language: "HTML",
          },
          {
            time: "3:45 PM",
            type: "Save",
            file: "app.js",
            project: "My Project",
            language: "JavaScript",
          },
        ],
      },
      languages: [
        { name: "JavaScript", timeSpent: 120, percentage: 45, files: 5 },
        { name: "HTML", timeSpent: 60, percentage: 22, files: 3 },
        { name: "CSS", timeSpent: 45, percentage: 17, files: 2 },
        { name: "JSON", timeSpent: 25, percentage: 9, files: 1 },
        { name: "Markdown", timeSpent: 15, percentage: 6, files: 1 },
      ],
      projects: [
        { name: "My Project", timeSpent: 185, percentage: 70, files: 8 },
        { name: "Side Project", timeSpent: 65, percentage: 24, files: 3 },
        { name: "Documentation", timeSpent: 15, percentage: 6, files: 1 },
      ],
      files: [
        {
          name: "app.js",
          timeSpent: 75,
          edits: 32,
          project: "My Project",
          language: "JavaScript",
        },
        {
          name: "index.html",
          timeSpent: 45,
          edits: 18,
          project: "My Project",
          language: "HTML",
        },
        {
          name: "styles.css",
          timeSpent: 40,
          edits: 15,
          project: "My Project",
          language: "CSS",
        },
        {
          name: "main.js",
          timeSpent: 35,
          edits: 14,
          project: "Side Project",
          language: "JavaScript",
        },
        {
          name: "api.js",
          timeSpent: 30,
          edits: 10,
          project: "My Project",
          language: "JavaScript",
        },
        {
          name: "README.md",
          timeSpent: 15,
          edits: 5,
          project: "Documentation",
          language: "Markdown",
        },
        {
          name: "package.json",
          timeSpent: 10,
          edits: 3,
          project: "My Project",
          language: "JSON",
        },
      ],
    };
  }

  /**
   * Gets the HTML content for the webview
   * @returns {String} HTML content
   */
  _getHtmlContent() {
    // Get the paths to the HTML, CSS, and JS files
    const htmlPath = path.join(this.context.extensionPath, "web", "index.html");

    // Read the HTML file
    let html = fs.readFileSync(htmlPath, "utf8");

    // Get configuration
    const config = vscode.workspace.getConfiguration("codeTracker");
    const username = config.get("username") || "";
    const serverUrl = config.get("serverUrl") || "http://localhost:3000";

    // Replace placeholder variables
    html = html.replace(/SERVER_URL_PLACEHOLDER/g, serverUrl);
    html = html.replace(/USERNAME_PLACEHOLDER/g, username);

    return html;
  }

  /**
   * Updates the panel with new data
   * @param {Object} data - Data to update the panel with
   */
  update(data) {
    if (this.panel) {
      this.postMessage({ command: "updateData", data });
    }
  }

  /**
   * Shows the login form
   */
  showLogin() {
    if (this.panel) {
      this.postMessage({ command: "showLogin" });
    } else {
      this.show();
      setTimeout(() => {
        this.postMessage({ command: "showLogin" });
      }, 500);
    }
  }

  /**
   * Shows the registration form
   */
  showRegister() {
    if (this.panel) {
      this.postMessage({ command: "showRegister" });
    } else {
      this.show();
      setTimeout(() => {
        this.postMessage({ command: "showRegister" });
      }, 500);
    }
  }

  /**
   * Disposes of the webview panel
   */
  _dispose() {
    this.panel = null;

    // Dispose of all disposables
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

module.exports = DashboardPanel;
