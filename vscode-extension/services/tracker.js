const vscode = require("vscode");
const path = require("path");

/**
 * Track text document edits
 * @param {vscode.TextDocumentChangeEvent} event
 * @param {Object} session
 */
function trackEdit(event, session) {
  if (!event.document || event.document.uri.scheme !== "file") {
    return;
  }

  const document = event.document;
  const fileName = path.basename(document.fileName);
  const filePath = document.fileName;
  const language = document.languageId;
  const projectFolder = getProjectFolder(document.uri);

  const activity = {
    type: "edit",
    timestamp: new Date().toISOString(),
    fileName,
    filePath,
    language,
    projectFolder,
    changeSize: getTotalChangeSize(event.contentChanges),
  };

  session.activities.push(activity);
}

/**
 * Track when user changes to a different file
 * @param {vscode.TextEditor} editor
 * @param {Object} session
 */
function trackEditorChange(editor, session) {
  if (!editor || editor.document.uri.scheme !== "file") {
    return;
  }

  const document = editor.document;
  const fileName = path.basename(document.fileName);
  const filePath = document.fileName;
  const language = document.languageId;
  const projectFolder = getProjectFolder(document.uri);

  const activity = {
    type: "focus",
    timestamp: new Date().toISOString(),
    fileName,
    filePath,
    language,
    projectFolder,
  };

  session.activities.push(activity);
}

/**
 * Track when files are saved
 * @param {vscode.TextDocument} document
 * @param {Object} session
 */
function trackSave(document, session) {
  if (!document || document.uri.scheme !== "file") {
    return;
  }

  const fileName = path.basename(document.fileName);
  const filePath = document.fileName;
  const language = document.languageId;
  const projectFolder = getProjectFolder(document.uri);

  const activity = {
    type: "save",
    timestamp: new Date().toISOString(),
    fileName,
    filePath,
    language,
    projectFolder,
    fileSize: document.getText().length,
  };

  session.activities.push(activity);
}

/**
 * Calculate total size of all changes in an edit
 * @param {readonly vscode.TextDocumentContentChangeEvent[]} contentChanges
 * @returns {number}
 */
function getTotalChangeSize(contentChanges) {
  let totalSize = 0;

  for (const change of contentChanges) {
    // Count the characters in the new text
    totalSize += change.text.length;
  }

  return totalSize;
}

/**
 * Get the project folder name for a file
 * @param {vscode.Uri} uri
 * @returns {string}
 */
function getProjectFolder(uri) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  return workspaceFolder
    ? path.basename(workspaceFolder.uri.fsPath)
    : "unknown";
}

module.exports = {
  trackEdit,
  trackEditorChange,
  trackSave,
};
