(function () {
  // Get the vscode API
  const vscode = acquireVsCodeApi();

  // Server URL from extension
  const SERVER_URL = "SERVER_URL_PLACEHOLDER";

  // State management - persist data between page reloads
  const state = vscode.getState() || { initialized: false };

  // DOM elements
  const appContainer = document.getElementById("app-container");
  const loginView = document.getElementById("login-view");
  const registerView = document.getElementById("register-view");
  const dashboardView = document.getElementById("dashboard-view");
  const usernameDisplay = document.getElementById("username-display");
  const timeframeSelect = document.getElementById("timeframe");
  const loader = document.getElementById("loader");
  const errorMessage = document.getElementById("error-message");

  // Login elements
  const loginUsername = document.getElementById("login-username");
  const loginButton = document.getElementById("login-button");
  const loginError = document.getElementById("login-error");
  const showRegisterLink = document.getElementById("show-register-link");

  // Register elements
  const registerUsername = document.getElementById("register-username");
  const registerButton = document.getElementById("register-button");
  const registerError = document.getElementById("register-error");
  const showLoginLink = document.getElementById("show-login-link");

  // Tabs
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  // Initial state
  let currentUsername = usernameDisplay.textContent.trim();
  let currentTab = "activity";
  let currentTimeframe = "day";
  let charts = {};

  // Check if the user is already logged in
  function initialize() {
    if (currentUsername && currentUsername !== "USERNAME_PLACEHOLDER") {
      showDashboard();
      loadDashboardData();
    } else {
      showLogin();
    }

    // Restore state if available
    if (state.activeTab) {
      switchTab(state.activeTab);
    }

    if (state.timeframe) {
      timeframeSelect.value = state.timeframe;
      currentTimeframe = state.timeframe;

      if (state.timeframe === "custom" && state.fromDate && state.toDate) {
        document.getElementById("date-from").value = state.fromDate;
        document.getElementById("date-to").value = state.toDate;
        document.getElementById("custom-range").classList.remove("hidden");
      }
    }

    // Setup event listeners
    setupEventListeners();
  }

  // Save state to persist data between reloads
  function saveState(data) {
    vscode.setState({ ...state, ...data });
  }

  function setupEventListeners() {
    // Login form
    loginButton.addEventListener("click", handleLogin);
    showRegisterLink.addEventListener("click", (e) => {
      e.preventDefault();
      showRegister();
    });

    // Register form
    registerButton.addEventListener("click", handleRegister);
    showLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      showLogin();
    });

    // Tab switching
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        switchTab(tab.dataset.tab);
      });
    });

    // Timeframe change
    timeframeSelect.addEventListener("change", () => {
      currentTimeframe = timeframeSelect.value;

      // Show/hide custom date range selector
      if (currentTimeframe === "custom") {
        document.getElementById("custom-range").classList.remove("hidden");
      } else {
        document.getElementById("custom-range").classList.add("hidden");
        loadDashboardData();
      }
    });

    // Apply custom date range
    document
      .getElementById("apply-date-range")
      .addEventListener("click", () => {
        loadDashboardData();
      });

    // Comparison timeframe change
    document
      .getElementById("compare-timeframe")
      .addEventListener("change", (e) => {
        if (e.target.value === "custom") {
          document
            .getElementById("custom-compare-range")
            .classList.remove("hidden");
        } else {
          document
            .getElementById("custom-compare-range")
            .classList.add("hidden");
          updateComparisonCharts(); // Reload comparison data
        }
      });

    // Apply custom comparison range
    document
      .getElementById("apply-compare-range")
      .addEventListener("click", () => {
        updateComparisonCharts();
      });

    // Settings panel
    document.getElementById("settings-button").addEventListener("click", () => {
      const settingsPanel = document.getElementById("settings-panel");
      settingsPanel.classList.toggle("hidden");
    });

    // Save settings
    document.getElementById("save-settings").addEventListener("click", () => {
      const serverUrl = document.getElementById("settings-server-url").value;
      const trackingEnabled =
        document.getElementById("tracking-enabled").checked;
      const syncInterval = document.getElementById("sync-interval").value;

      // Send message to extension
      vscode.postMessage({
        command: "saveSettings",
        settings: {
          serverUrl,
          trackingEnabled,
          syncInterval,
        },
      });

      // Hide settings panel
      document.getElementById("settings-panel").classList.add("hidden");

      // Show success message
      showMessage("Settings saved successfully!", "success");
    });

    // Logout button
    document.getElementById("logout-button").addEventListener("click", () => {
      // Send logout message to extension
      vscode.postMessage({
        command: "logout",
      });

      // Reset UI state
      currentUsername = null;
      showLogin();
    });

    // Listen for messages from the extension
    window.addEventListener("message", (event) => {
      const message = event.data;

      switch (message.command) {
        case "showLogin":
          showLogin();
          break;
        case "showRegister":
          showRegister();
          break;
        case "loginSuccess":
          currentUsername = message.username;
          usernameDisplay.textContent = currentUsername;
          showDashboard();
          loadDashboardData();
          break;
        case "registerSuccess":
          currentUsername = message.username;
          usernameDisplay.textContent = currentUsername;
          showDashboard();
          loadDashboardData();
          break;
        case "updateData":
          updateDashboardData(message.data);
          break;
      }
    });
  }

  // View switching functions
  function showLogin() {
    loginView.classList.remove("hidden");
    registerView.classList.add("hidden");
    dashboardView.classList.add("hidden");
    loginError.classList.add("hidden");
    loginUsername.focus();

    // Save state
    saveState({ view: "login" });
  }

  function showRegister() {
    loginView.classList.add("hidden");
    registerView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    registerError.classList.add("hidden");
    registerUsername.focus();

    // Save state
    saveState({ view: "register" });
  }

  function showDashboard() {
    loginView.classList.add("hidden");
    registerView.classList.add("hidden");
    dashboardView.classList.remove("hidden");

    // Save state
    saveState({ view: "dashboard" });
  }

  // Tab switching
  function switchTab(tabName) {
    currentTab = tabName;

    // Update active tab
    tabs.forEach((tab) => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    // Show active content
    tabContents.forEach((content) => {
      if (content.id === `${tabName}-tab`) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });

    // Save active tab to state
    saveState({ activeTab: tabName });

    // If tab is one of the comparison or productivity tabs, ensure charts are rendered
    if (tabName === "productivity" && charts.productivity === undefined) {
      updateProductivityCharts(
        state.lastData || generateMockData(currentTimeframe)
      );
    } else if (tabName === "comparison" && charts.comparison === undefined) {
      updateComparisonCharts(
        state.lastData || generateMockData(currentTimeframe)
      );
    }
  }

  // Auth handlers
  function handleLogin() {
    const username = loginUsername.value.trim();
    const serverUrl = document.getElementById("server-url").value.trim();

    if (!username) {
      showLoginError("Please enter a username");
      return;
    }

    if (!serverUrl) {
      showLoginError("Please enter the server URL");
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    // Send login message to extension
    vscode.postMessage({
      command: "login",
      username: username,
      serverUrl: serverUrl,
    });

    // Save server URL to configuration
    vscode.postMessage({
      command: "saveSettings",
      settings: {
        serverUrl: serverUrl,
      },
    });

    // We'll simulate success for demo purposes
    setTimeout(() => {
      // Display success message
      document.getElementById("login-success").textContent =
        "Login successful!";
      document.getElementById("login-success").classList.remove("hidden");

      // For demo purposes, we'll navigate to dashboard
      currentUsername = username;
      usernameDisplay.textContent = username;
      showDashboard();
      loadDashboardData();

      // Reset form
      loginUsername.value = "";
      loginButton.disabled = false;
      loginButton.textContent = "Login";
    }, 1000);
  }

  function handleRegister() {
    const username = registerUsername.value.trim();
    const serverUrl = document
      .getElementById("register-server-url")
      .value.trim();

    if (!username) {
      showRegisterError("Please enter a username");
      return;
    }

    if (!serverUrl) {
      showRegisterError("Please enter the server URL");
      return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "Registering...";

    // Send register message to extension
    vscode.postMessage({
      command: "register",
      username: username,
      serverUrl: serverUrl,
    });

    // Save server URL to configuration
    vscode.postMessage({
      command: "saveSettings",
      settings: {
        serverUrl: serverUrl,
      },
    });

    // We'll simulate success for demo purposes
    setTimeout(() => {
      // Display success message
      document.getElementById("register-success").textContent =
        "Registration successful!";
      document.getElementById("register-success").classList.remove("hidden");

      // For demo purposes, we'll navigate to dashboard
      currentUsername = username;
      usernameDisplay.textContent = username;
      showDashboard();
      loadDashboardData();

      // Reset form
      registerUsername.value = "";
      registerButton.disabled = false;
      registerButton.textContent = "Register";
    }, 1000);
  }

  function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove("hidden");
    document.getElementById("login-success").classList.add("hidden");
  }

  function showRegisterError(message) {
    registerError.textContent = message;
    registerError.classList.remove("hidden");
    document.getElementById("register-success").classList.add("hidden");
  }

  // Generic message function
  function showMessage(message, type) {
    // Create message element
    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    messageElement.className =
      type === "error" ? "error-message" : "success-message";
    messageElement.style.position = "fixed";
    messageElement.style.top = "20px";
    messageElement.style.right = "20px";
    messageElement.style.zIndex = "1000";

    // Add to DOM
    document.body.appendChild(messageElement);

    // Remove after 3 seconds
    setTimeout(() => {
      messageElement.style.opacity = "0";
      messageElement.style.transition = "opacity 0.5s";
      setTimeout(() => {
        document.body.removeChild(messageElement);
      }, 500);
    }, 3000);
  }

  // Dashboard data loading
  function loadDashboardData() {
    if (!currentUsername) return;

    showLoader();

    // Get the selected timeframe
    const timeframe = timeframeSelect.value;

    // Handle custom date range
    if (timeframe === "custom") {
      const fromDate = document.getElementById("date-from").value;
      const toDate = document.getElementById("date-to").value;

      if (!fromDate || !toDate) {
        showError("Please select both start and end dates for custom range");
        return;
      }

      // Save custom dates to state
      saveState({ fromDate, toDate });
    }

    // Save timeframe to state
    saveState({ timeframe });

    // In a real implementation, you would fetch from the server with the appropriate timeframe
    // For demonstration, we'll simulate the data
    setTimeout(() => {
      const mockData = generateMockData(timeframe);
      updateDashboardData(mockData);
      hideLoader();

      // Also update the productivity and comparison tabs
      updateProductivityCharts(mockData);
      updateComparisonCharts(mockData);

      // Save data to state
      saveState({ lastData: mockData });
    }, 1000);
  }

  function updateDashboardData(data) {
    // Update stat cards
    document.getElementById("total-time").textContent = data.stats.totalTime;
    document.getElementById("lines-written").textContent =
      data.stats.linesWritten;
    document.getElementById("files-modified").textContent =
      data.stats.filesModified;
    document.getElementById("languages-used").textContent =
      data.stats.languagesUsed;

    // Update charts
    updateActivityChart(data.activity);
    updateLanguagesChart(data.languages);
    updateProjectsChart(data.projects);
    updateFilesChart(data.files);

    // Update tables
    updateActivityTable(data.activity);
    updateLanguagesTable(data.languages);
    updateProjectsTable(data.projects);
    updateFilesTable(data.files);
  }

  // Chart updates
  function updateActivityChart(activityData) {
    const ctx = document.getElementById("activity-chart").getContext("2d");

    if (charts.activity) {
      charts.activity.destroy();
    }

    charts.activity = new Chart(ctx, {
      type: "line",
      data: {
        labels: activityData.labels,
        datasets: [
          {
            label: "Coding Activity",
            data: activityData.values,
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 2,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Time (minutes)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Time",
            },
          },
        },
      },
    });
  }

  function updateLanguagesChart(languagesData) {
    const ctx = document.getElementById("languages-chart").getContext("2d");

    if (charts.languages) {
      charts.languages.destroy();
    }

    charts.languages = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: languagesData.map((lang) => lang.name),
        datasets: [
          {
            data: languagesData.map((lang) => lang.percentage),
            backgroundColor: [
              "rgba(255, 99, 132, 0.7)",
              "rgba(54, 162, 235, 0.7)",
              "rgba(255, 206, 86, 0.7)",
              "rgba(75, 192, 192, 0.7)",
              "rgba(153, 102, 255, 0.7)",
              "rgba(255, 159, 64, 0.7)",
              "rgba(199, 199, 199, 0.7)",
              "rgba(83, 102, 255, 0.7)",
              "rgba(40, 159, 64, 0.7)",
              "rgba(210, 199, 199, 0.7)",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
          },
        },
      },
    });
  }

  function updateProjectsChart(projectsData) {
    const ctx = document.getElementById("projects-chart").getContext("2d");

    if (charts.projects) {
      charts.projects.destroy();
    }

    charts.projects = new Chart(ctx, {
      type: "bar",
      data: {
        labels: projectsData.map((project) => project.name),
        datasets: [
          {
            label: "Time Spent (minutes)",
            data: projectsData.map((project) => project.timeSpent),
            backgroundColor: "rgba(54, 162, 235, 0.7)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Time (minutes)",
            },
          },
        },
      },
    });
  }

  function updateFilesChart(filesData) {
    const ctx = document.getElementById("files-chart").getContext("2d");

    if (charts.files) {
      charts.files.destroy();
    }

    // Take only top 10 files for the chart
    const topFiles = filesData.slice(0, 10);

    charts.files = new Chart(ctx, {
      type: "bar",
      data: {
        labels: topFiles.map((file) => file.name),
        datasets: [
          {
            label: "Time Spent (minutes)",
            data: topFiles.map((file) => file.timeSpent),
            backgroundColor: "rgba(75, 192, 192, 0.7)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Time (minutes)",
            },
          },
        },
      },
    });
  }

  // Productivity charts
  function updateProductivityCharts(data) {
    if (!data || !data.productivity) {
      // Generate mock productivity data if not provided
      data = data || {};
      data.productivity = generateMockProductivityData();
    }

    const focusCtx = document.getElementById("focus-chart").getContext("2d");
    const productivityCtx = document
      .getElementById("productivity-chart")
      .getContext("2d");

    // Destroy existing charts if they exist
    if (charts.focus) {
      charts.focus.destroy();
    }

    if (charts.productivity) {
      charts.productivity.destroy();
    }

    // Update stats
    document.getElementById("peak-time").textContent =
      data.productivity.peakTime;
    document.getElementById("avg-daily").textContent =
      data.productivity.avgDaily;
    document.getElementById("productive-day").textContent =
      data.productivity.productiveDay;
    document.getElementById("consistency-score").textContent =
      data.productivity.consistencyScore;

    // Create focus chart
    charts.focus = new Chart(focusCtx, {
      type: "line",
      data: {
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
          "6pm",
          "7pm",
        ],
        datasets: [
          {
            label: "Focus Score",
            data: data.productivity.focusScores,
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 2,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 10,
            title: {
              display: true,
              text: "Focus Score (0-10)",
            },
          },
        },
      },
    });

    // Create productivity chart
    charts.productivity = new Chart(productivityCtx, {
      type: "bar",
      data: {
        labels: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        datasets: [
          {
            label: "Hours Coded",
            data: data.productivity.hoursPerDay,
            backgroundColor: "rgba(54, 162, 235, 0.7)",
          },
          {
            label: "Lines Written (x100)",
            data: data.productivity.linesPerDay.map((lines) => lines / 100), // Scale down for visibility
            backgroundColor: "rgba(255, 99, 132, 0.7)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Hours / Lines (x100)",
            },
          },
        },
      },
    });
  }

  // Comparison charts
  function updateComparisonCharts(data) {
    if (!data) {
      data = generateMockData(currentTimeframe);
    }

    // Generate comparison data if not provided
    if (!data.comparison) {
      data.comparison = generateMockComparisonData();
    }

    const comparisonCtx = document
      .getElementById("time-comparison-chart")
      .getContext("2d");

    // Destroy existing chart if it exists
    if (charts.comparison) {
      charts.comparison.destroy();
    }

    // Create comparison chart
    charts.comparison = new Chart(comparisonCtx, {
      type: "bar",
      data: {
        labels: [
          "Total Time",
          "Lines Written",
          "Files Modified",
          "Languages Used",
        ],
        datasets: [
          {
            label: "Current Period",
            data: [
              parseFloat(data.comparison.current.totalTime.replace("h", "")),
              parseInt(data.comparison.current.linesWritten),
              parseInt(data.comparison.current.filesModified),
              parseInt(data.comparison.current.languagesUsed),
            ],
            backgroundColor: "rgba(54, 162, 235, 0.7)",
          },
          {
            label: "Previous Period",
            data: [
              parseFloat(data.comparison.previous.totalTime.replace("h", "")),
              parseInt(data.comparison.previous.linesWritten),
              parseInt(data.comparison.previous.filesModified),
              parseInt(data.comparison.previous.languagesUsed),
            ],
            backgroundColor: "rgba(255, 99, 132, 0.7)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    // Update comparison cards
    updateComparisonCards(data.comparison);
  }

  // Update comparison cards
  function updateComparisonCards(comparisonData) {
    // Get the DOM elements
    const timeCard = document.querySelector(
      ".comparison-card:nth-child(1) .comparison-values"
    );
    const linesCard = document.querySelector(
      ".comparison-card:nth-child(2) .comparison-values"
    );
    const filesCard = document.querySelector(
      ".comparison-card:nth-child(3) .comparison-values"
    );
    const languagesCard = document.querySelector(
      ".comparison-card:nth-child(4) .comparison-values"
    );

    // Calculate percentages
    const timeChange = calculatePercentageChange(
      parseFloat(comparisonData.previous.totalTime),
      parseFloat(comparisonData.current.totalTime)
    );

    const linesChange = calculatePercentageChange(
      parseInt(comparisonData.previous.linesWritten),
      parseInt(comparisonData.current.linesWritten)
    );

    const filesChange = calculatePercentageChange(
      parseInt(comparisonData.previous.filesModified),
      parseInt(comparisonData.current.filesModified)
    );

    const languagesChange = calculatePercentageChange(
      parseInt(comparisonData.previous.languagesUsed),
      parseInt(comparisonData.current.languagesUsed)
    );

    // Update DOM
    updateComparisonCard(
      timeCard,
      comparisonData.current.totalTime,
      comparisonData.previous.totalTime,
      timeChange
    );
    updateComparisonCard(
      linesCard,
      comparisonData.current.linesWritten,
      comparisonData.previous.linesWritten,
      linesChange
    );
    updateComparisonCard(
      filesCard,
      comparisonData.current.filesModified,
      comparisonData.previous.filesModified,
      filesChange
    );
    updateComparisonCard(
      languagesCard,
      comparisonData.current.languagesUsed,
      comparisonData.previous.languagesUsed,
      languagesChange
    );
  }

  function updateComparisonCard(
    cardElement,
    currentValue,
    previousValue,
    changePercentage
  ) {
    const currentValueElement = cardElement.querySelector(".current-value");
    const previousValueElement = cardElement.querySelector(".previous-value");
    const changeElement = cardElement.querySelector(".change");

    currentValueElement.textContent = currentValue;
    previousValueElement.textContent = previousValue;

    const changeText =
      changePercentage >= 0 ? `+${changePercentage}%` : `${changePercentage}%`;
    changeElement.textContent = changeText;

    // Update class for styling
    changeElement.className = "change";
    if (changePercentage > 0) {
      changeElement.classList.add("positive");
    } else if (changePercentage < 0) {
      changeElement.classList.add("negative");
    } else {
      changeElement.classList.add("neutral");
    }
  }

  function calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return 100; // Avoid division by zero
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  }

  // Table updates
  function updateActivityTable(activityData) {
    const tbody = document.getElementById("recent-activity-body");
    tbody.innerHTML = "";

    activityData.recent.forEach((activity) => {
      const row = document.createElement("tr");
      row.innerHTML = `
          <td>${activity.time}</td>
          <td>${activity.type}</td>
          <td>${activity.file}</td>
          <td>${activity.project}</td>
          <td>${activity.language}</td>
        `;
      tbody.appendChild(row);
    });
  }

  function updateLanguagesTable(languagesData) {
    const tbody = document.getElementById("languages-body");
    tbody.innerHTML = "";

    languagesData.forEach((language) => {
      const row = document.createElement("tr");
      row.innerHTML = `
          <td>${language.name}</td>
          <td>${language.timeSpent} mins</td>
          <td>${language.percentage}%</td>
          <td>${language.files}</td>
        `;
      tbody.appendChild(row);
    });
  }

  function updateProjectsTable(projectsData) {
    const tbody = document.getElementById("projects-body");
    tbody.innerHTML = "";

    projectsData.forEach((project) => {
      const row = document.createElement("tr");
      row.innerHTML = `
          <td>${project.name}</td>
          <td>${project.timeSpent} mins</td>
          <td>${project.percentage}%</td>
          <td>${project.files}</td>
        `;
      tbody.appendChild(row);
    });
  }

  function updateFilesTable(filesData) {
    const tbody = document.getElementById("files-body");
    tbody.innerHTML = "";

    filesData.forEach((file) => {
      const row = document.createElement("tr");
      row.innerHTML = `
          <td>${file.name}</td>
          <td>${file.timeSpent} mins</td>
          <td>${file.edits}</td>
          <td>${file.project}</td>
          <td>${file.language}</td>
        `;
      tbody.appendChild(row);
    });
  }

  // Helper functions
  function showLoader() {
    loader.classList.remove("hidden");
    errorMessage.classList.add("hidden");
  }

  function hideLoader() {
    loader.classList.add("hidden");
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
    hideLoader();
  }

  // Mock data generator (for demonstration)
  function generateMockData(timeframe) {
    // Adjust numbers based on timeframe
    let factor = 1;
    let timeLabels = [
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
    ];

    switch (timeframe) {
      case "week":
        factor = 5;
        timeLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        break;
      case "month":
        factor = 20;
        timeLabels = ["Week 1", "Week 2", "Week 3", "Week 4"];
        break;
      case "year":
        factor = 200;
        timeLabels = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        break;
      case "custom":
        // For custom, we'll use a factor between week and month
        factor = 10;
        timeLabels = [
          "Day 1",
          "Day 2",
          "Day 3",
          "Day 4",
          "Day 5",
          "Day 6",
          "Day 7",
          "Day 8",
          "Day 9",
          "Day 10",
        ];
        break;
    }

    return {
      stats: {
        totalTime: `${Math.round(3.75 * factor)}h ${Math.round(
          45 * Math.random()
        )}m`,
        linesWritten: `${Math.round(342 * factor)}`,
        filesModified: `${Math.round(12 * factor)}`,
        languagesUsed: `${Math.min(10, Math.round(4 * Math.sqrt(factor)))}`,
      },
      activity: {
        labels: timeLabels,
        values: timeLabels.map(() => Math.round(Math.random() * 50 + 10)),
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
        {
          name: "JavaScript",
          timeSpent: Math.round(120 * factor),
          percentage: 45,
          files: Math.round(5 * factor),
        },
        {
          name: "HTML",
          timeSpent: Math.round(60 * factor),
          percentage: 22,
          files: Math.round(3 * factor),
        },
        {
          name: "CSS",
          timeSpent: Math.round(45 * factor),
          percentage: 17,
          files: Math.round(2 * factor),
        },
        {
          name: "JSON",
          timeSpent: Math.round(25 * factor),
          percentage: 9,
          files: Math.round(1 * factor),
        },
        {
          name: "Markdown",
          timeSpent: Math.round(15 * factor),
          percentage: 6,
          files: Math.round(1 * factor),
        },
      ],
      projects: [
        {
          name: "My Project",
          timeSpent: Math.round(185 * factor),
          percentage: 70,
          files: Math.round(8 * factor),
        },
        {
          name: "Side Project",
          timeSpent: Math.round(65 * factor),
          percentage: 24,
          files: Math.round(3 * factor),
        },
        {
          name: "Documentation",
          timeSpent: Math.round(15 * factor),
          percentage: 6,
          files: Math.round(1 * factor),
        },
      ],
      files: [
        {
          name: "app.js",
          timeSpent: Math.round(75 * factor),
          edits: Math.round(32 * factor),
          project: "My Project",
          language: "JavaScript",
        },
        {
          name: "index.html",
          timeSpent: Math.round(45 * factor),
          edits: Math.round(18 * factor),
          project: "My Project",
          language: "HTML",
        },
        {
          name: "styles.css",
          timeSpent: Math.round(40 * factor),
          edits: Math.round(15 * factor),
          project: "My Project",
          language: "CSS",
        },
        {
          name: "main.js",
          timeSpent: Math.round(35 * factor),
          edits: Math.round(14 * factor),
          project: "Side Project",
          language: "JavaScript",
        },
        {
          name: "api.js",
          timeSpent: Math.round(30 * factor),
          edits: Math.round(10 * factor),
          project: "My Project",
          language: "JavaScript",
        },
        {
          name: "README.md",
          timeSpent: Math.round(15 * factor),
          edits: Math.round(5 * factor),
          project: "Documentation",
          language: "Markdown",
        },
        {
          name: "package.json",
          timeSpent: Math.round(10 * factor),
          edits: Math.round(3 * factor),
          project: "My Project",
          language: "JSON",
        },
      ],
      productivity: generateMockProductivityData(factor),
      comparison: generateMockComparisonData(factor),
    };
  }

  // Generate mock productivity data
  function generateMockProductivityData(factor = 1) {
    return {
      peakTime: "3 PM - 5 PM",
      avgDaily: `${Math.round(2 + Math.random() * factor)}h ${Math.round(
        Math.random() * 59
      )}m`,
      productiveDay: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][
        Math.floor(Math.random() * 5)
      ],
      consistencyScore: `${(Math.random() * 2 + 7).toFixed(1)}/10`,
      focusScores: [
        Math.random() * 3 + 5, // 8am
        Math.random() * 3 + 6, // 9am
        Math.random() * 2 + 7, // 10am
        Math.random() * 2 + 7, // 11am
        Math.random() * 3 + 5, // 12pm
        Math.random() * 3 + 5, // 1pm
        Math.random() * 2 + 7, // 2pm
        Math.random() * 1 + 8, // 3pm
        Math.random() * 1 + 8, // 4pm
        Math.random() * 2 + 7, // 5pm
        Math.random() * 3 + 6, // 6pm
        Math.random() * 4 + 4, // 7pm
      ],
      hoursPerDay: [
        Math.random() * 3 + 2, // Monday
        Math.random() * 3 + 2, // Tuesday
        Math.random() * 4 + 3, // Wednesday
        Math.random() * 3 + 2, // Thursday
        Math.random() * 3 + 2, // Friday
        Math.random() * 2 + 1, // Saturday
        Math.random() * 2 + 0, // Sunday
      ],
      linesPerDay: [
        Math.random() * 300 + 200, // Monday
        Math.random() * 300 + 200, // Tuesday
        Math.random() * 400 + 300, // Wednesday
        Math.random() * 300 + 200, // Thursday
        Math.random() * 300 + 200, // Friday
        Math.random() * 200 + 100, // Saturday
        Math.random() * 100 + 50, // Sunday
      ],
    };
  }

  // Generate mock comparison data
  function generateMockComparisonData(factor = 1) {
    // Current period data
    const current = {
      totalTime: `${Math.round(3.75 * factor)}h ${Math.round(
        45 * Math.random()
      )}m`,
      linesWritten: `${Math.round(342 * factor)}`,
      filesModified: `${Math.round(12 * factor)}`,
      languagesUsed: `${Math.min(10, Math.round(4 * Math.sqrt(factor)))}`,
    };

    // Previous period data - slightly different
    const previous = {
      totalTime: `${Math.round(3.2 * factor)}h ${Math.round(
        20 * Math.random()
      )}m`,
      linesWritten: `${Math.round(310 * factor)}`,
      filesModified: `${Math.round(15 * factor)}`,
      languagesUsed: `${Math.min(9, Math.round(3 * Math.sqrt(factor)))}`,
    };

    return {
      current,
      previous,
    };
  }

  // Initialize the dashboard
  initialize();
})();
