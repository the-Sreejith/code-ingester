// src/extension.ts

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FileTreeProvider, FileTreeItem } from "./FileTreeProvider";

export function activate(context: vscode.ExtensionContext) {
  // --- 1. Register the Tree Data Provider ---
  const fileTreeProvider = new FileTreeProvider();
  const treeView = vscode.window.createTreeView('codeIngester.fileTree', {
    treeDataProvider: fileTreeProvider,
    showCollapseAll: true,
    canSelectMany: true
  });

  context.subscriptions.push(treeView);

  // Auto-load workspace folder on activation
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0];
    fileTreeProvider.loadWorkspace(workspaceFolder.uri.fsPath);
  }

  // --- 2. Register Commands ---

  // Command to populate the tree view with files from a folder
  const ingestToTreeViewDisposable = vscode.commands.registerCommand(
    "copyFolderContents.ingestToTreeView",
    async (uri: vscode.Uri) => {
      try {
        await fileTreeProvider.loadWorkspace(uri.fsPath);
        vscode.window.showInformationMessage(
          `Loaded folder: ${path.basename(uri.fsPath)}`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error loading folder: ${error.message}`
        );
      }
    }
  );

  // Command to show selected files content in editor
  const showSelectedContentDisposable = vscode.commands.registerCommand(
    "copyFolderContents.showSelectedContent",
    async () => {
      try {
        const selectedItems = fileTreeProvider.getSelectedItems();
        if (selectedItems.length === 0) {
          vscode.window.showInformationMessage("No files selected.");
          return;
        }

        const content = await getSelectedFilesContent(selectedItems);
        if (content.trim() === "") {
          vscode.window.showInformationMessage("No content to display.");
          return;
        }

        // Create a new untitled document with the content
        const doc = await vscode.workspace.openTextDocument({
          content: content,
          language: 'plaintext'
        });
        await vscode.window.showTextDocument(doc);
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error showing content: ${error.message}`
        );
      }
    }
  );

  // Command to copy selected files content to clipboard
  const copySelectedContentDisposable = vscode.commands.registerCommand(
    "copyFolderContents.copySelectedContent",
    async () => {
      try {
        const selectedItems = fileTreeProvider.getSelectedItems();
        if (selectedItems.length === 0) {
          vscode.window.showInformationMessage("No files selected.");
          return;
        }

        const content = await getSelectedFilesContent(selectedItems);
        if (content.trim() === "") {
          vscode.window.showInformationMessage("No content to copy.");
          return;
        }

        await vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage(
          `Copied content of ${selectedItems.length} item(s) to clipboard.`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error copying content: ${error.message}`
        );
      }
    }
  );

  // Command to clear the tree view
  const clearTreeViewDisposable = vscode.commands.registerCommand(
    "copyFolderContents.clearTreeView",
    () => {
      fileTreeProvider.clear();
      vscode.window.showInformationMessage("Tree view cleared.");
    }
  );

  // Command to toggle selection of an item
  const toggleSelectionDisposable = vscode.commands.registerCommand(
    "copyFolderContents.toggleSelection",
    (item: FileTreeItem) => {
      fileTreeProvider.toggleItemSelection(item);
    }
  );

  // Command to select all items
  const selectAllDisposable = vscode.commands.registerCommand(
    "copyFolderContents.selectAll",
    () => {
      fileTreeProvider.selectAll();
      vscode.window.showInformationMessage("All items selected.");
    }
  );

  // Command to deselect all items
  const deselectAllDisposable = vscode.commands.registerCommand(
    "copyFolderContents.deselectAll",
    () => {
      fileTreeProvider.deselectAll();
      vscode.window.showInformationMessage("All items deselected.");
    }
  );

  // Original commands (keeping for backward compatibility)
  const copyContentsDisposable = vscode.commands.registerCommand(
    "copyFolderContents.copyAllFiles",
    async (uri: vscode.Uri) => {
      try {
        const folderPath = uri.fsPath;
        const allFileContents = await getAllFileContents(folderPath);

        if (allFileContents.length === 0) {
          vscode.window.showInformationMessage(
            "No text files found in the selected folder."
          );
          return;
        }

        const combinedContent = allFileContents.join(
          "\n\n" + "=".repeat(80) + "\n\n"
        );
        await vscode.env.clipboard.writeText(combinedContent);

        const fileCount = allFileContents.length;
        vscode.window.showInformationMessage(
          `Copied contents of ${fileCount} file(s) to clipboard.`
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error copying folder contents: ${error.message}`
        );
      }
    }
  );

  const copyStructureDisposable = vscode.commands.registerCommand(
    "copyFolderContents.copyFileStructure",
    async (uri: vscode.Uri) => {
      try {
        const folderPath = uri.fsPath;
        const structureTree = await getFolderStructureTree(folderPath);

        if (!structureTree || structureTree.split("\n").length <= 1) {
          vscode.window.showInformationMessage(
            "No files or directories found to create a structure."
          );
          return;
        }

        await vscode.env.clipboard.writeText(structureTree);
        vscode.window.showInformationMessage(
          "Copied folder structure to clipboard."
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error copying folder structure: ${error.message}`
        );
      }
    }
  );

  context.subscriptions.push(
    ingestToTreeViewDisposable,
    showSelectedContentDisposable,
    copySelectedContentDisposable,
    clearTreeViewDisposable,
    toggleSelectionDisposable,
    selectAllDisposable,
    deselectAllDisposable,
    copyContentsDisposable,
    copyStructureDisposable
  );
}

// --- Helper Functions ---

/**
 * Gets content for selected tree items
 */
async function getSelectedFilesContent(selectedItems: readonly FileTreeItem[]): Promise<string> {
  const contents: string[] = [];
  
  for (const item of selectedItems) {
    if (item.contextValue === 'file' && item.fullPath) {
      try {
        const content = await fs.promises.readFile(item.fullPath, 'utf8');
        const fileHeader = `// ${item.relativePath}`;
        contents.push(`${fileHeader}\n\n${content}`);
      } catch (error) {
        console.warn(`Could not read file ${item.fullPath}: ${error}`);
      }
    } else if (item.contextValue === 'folder' && item.fullPath) {
      // If folder is selected, include all files in that folder
      const folderContents = await getAllFileContentsFromFolder(item.fullPath, item.relativePath??'');
      contents.push(...folderContents);
    }
  }
  
  return contents.join("\n\n" + "=".repeat(80) + "\n\n");
}

/**
 * Gets all file contents from a specific folder
 */
async function getAllFileContentsFromFolder(folderPath: string, basePath: string): Promise<string[]> {
  const fileContents: string[] = [];

  async function processDirectory(dirPath: string, currentBasePath: string) {
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const relativePath = path.join(currentBasePath, item.name).replace(/\\/g, "/");
      
      if (item.isDirectory()) {
        if (shouldSkipDirectory(item.name)) continue;
        await processDirectory(fullPath, relativePath);
      } else if (item.isFile()) {
        if (shouldSkipFile(item.name)) continue;
        try {
          const content = await fs.promises.readFile(fullPath, "utf8");
          const fileHeader = `// ${relativePath}`;
          const fileContent = `${fileHeader}\n\n${content}`;
          fileContents.push(fileContent);
        } catch (readError) {
          console.warn(`Could not read file ${fullPath}: ${readError}`);
        }
      }
    }
  }

  await processDirectory(folderPath, basePath);
  return fileContents;
}

/**
 * Gets all file contents as a flat array of formatted strings.
 */
async function getAllFileContents(folderPath: string): Promise<string[]> {
  const fileContents: string[] = [];
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(
    vscode.Uri.file(folderPath)
  );
  const workspacePath = workspaceFolder?.uri.fsPath || "";

  async function processDirectory(dirPath: string) {
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        if (shouldSkipDirectory(item.name)) continue;
        await processDirectory(fullPath);
      } else if (item.isFile()) {
        if (shouldSkipFile(item.name)) continue;
        try {
          const content = await fs.promises.readFile(fullPath, "utf8");
          const relativePath = workspacePath
            ? path.relative(workspacePath, fullPath)
            : path.relative(folderPath, fullPath);

          const fileHeader = `// ${relativePath.replace(/\\/g, "/")}`;
          const fileContent = `${fileHeader}\n\n${content}`;
          fileContents.push(fileContent);
        } catch (readError) {
          console.warn(`Could not read file ${fullPath}: ${readError}`);
        }
      }
    }
  }

  await processDirectory(folderPath);
  return fileContents;
}

/**
 * Generates a string representing the folder structure in a tree format.
 */
async function getFolderStructureTree(folderPath: string): Promise<string> {
  const treeLines: string[] = [path.basename(folderPath)];

  async function processDirectoryForTree(dirPath: string, prefix: string) {
    const items = (
      await fs.promises.readdir(dirPath, { withFileTypes: true })
    ).filter(
      (item) =>
        !(item.isDirectory()
          ? shouldSkipDirectory(item.name)
          : shouldSkipFile(item.name))
    );

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isLast = i === items.length - 1;
      const linePrefix = prefix + (isLast ? "└── " : "├── ");

      treeLines.push(`${linePrefix}${item.name}`);

      if (item.isDirectory()) {
        const newPrefix = prefix + (isLast ? "    " : "│   ");
        await processDirectoryForTree(path.join(dirPath, item.name), newPrefix);
      }
    }
  }

  await processDirectoryForTree(folderPath, "");
  return treeLines.join("\n");
}

/**
 * Checks if a directory should be skipped.
 */
function shouldSkipDirectory(dirName: string): boolean {
  const skipDirs = [
    "node_modules",
    ".git",
    ".vscode",
    "dist",
    "build",
    "out",
    ".next",
    "coverage",
    ".nyc_output",
    "logs",
    "*.log",
    "media",
  ];
  return skipDirs.includes(dirName) || dirName.startsWith(".");
}

/**
 * Checks if a file should be skipped based on its name or extension.
 */
function shouldSkipFile(fileName: string): boolean {
  const skipExtensions = [
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".ico",
    ".svg",
    ".mp4",
    ".avi",
    ".mov",
    ".wmv",
    ".mp3",
    ".wav",
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".log",
    ".tmp",
    ".cache",
    ".DS_Store",
  ];
  const skipFiles = [
    "Thumbs.db",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
  ];
  const ext = path.extname(fileName).toLowerCase();
  return (
    skipExtensions.includes(ext) ||
    skipFiles.includes(fileName) ||
    fileName.startsWith(".") ||
    fileName.includes(".min.")
  );
}

export function deactivate() {}