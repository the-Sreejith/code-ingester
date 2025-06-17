// src/FileTreeProvider.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class FileTreeItem extends vscode.TreeItem {
  public isSelected: boolean = true; // Default to selected

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly fullPath?: string,
    public readonly relativePath?: string,
    public readonly contextValue?: string
  ) {
    super(label, collapsibleState);
    
    this.tooltip = this.fullPath || this.label;
    this.contextValue = contextValue;
    
    if (contextValue === 'file') {
      this.iconPath = new vscode.ThemeIcon('file');
      this.command = {
        command: 'copyFolderContents.toggleSelection',
        title: 'Toggle Selection',
        arguments: [this]
      };
    } else if (contextValue === 'folder') {
      this.iconPath = new vscode.ThemeIcon('folder');
      this.command = {
        command: 'copyFolderContents.toggleSelection',
        title: 'Toggle Selection',
        arguments: [this]
      };
    }
    
    this.updateCheckmark();
  }

  updateCheckmark(): void {
    if (this.contextValue === 'file') {
      this.iconPath = this.isSelected 
        ? new vscode.ThemeIcon('file', new vscode.ThemeColor('charts.green'))
        : new vscode.ThemeIcon('file');
    } else if (this.contextValue === 'folder') {
      this.iconPath = this.isSelected 
        ? new vscode.ThemeIcon('folder', new vscode.ThemeColor('charts.green'))
        : new vscode.ThemeIcon('folder');
    }
  }

  toggleSelection(): void {
    this.isSelected = !this.isSelected;
    this.updateCheckmark();
  }
}

export class FileTreeProvider implements vscode.TreeDataProvider<FileTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FileTreeItem | undefined | null | void> = new vscode.EventEmitter<FileTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FileTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private rootPath: string | undefined;
  private workspacePath: string | undefined;
  private allItems: Map<string, FileTreeItem> = new Map();

  async loadWorkspace(folderPath: string): Promise<void> {
    this.rootPath = folderPath;
    this.workspacePath = folderPath;
    this.allItems.clear();
    
    // Load all items recursively
    await this.loadAllItems(folderPath, '');
    
    this._onDidChangeTreeData.fire();
  }

  private async loadAllItems(dirPath: string, basePath: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = basePath ? path.join(basePath, entry.name).replace(/\\/g, '/') : entry.name;
        
        if (entry.isDirectory()) {
          if (!this.shouldSkipDirectory(entry.name)) {
            const item = new FileTreeItem(
              entry.name,
              vscode.TreeItemCollapsibleState.Collapsed,
              fullPath,
              relativePath,
              'folder'
            );
            this.allItems.set(fullPath, item);
            
            // Recursively load subdirectory
            await this.loadAllItems(fullPath, relativePath);
          }
        } else if (entry.isFile()) {
          if (!this.shouldSkipFile(entry.name)) {
            const item = new FileTreeItem(
              entry.name,
              vscode.TreeItemCollapsibleState.None,
              fullPath,
              relativePath,
              'file'
            );
            this.allItems.set(fullPath, item);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }
  }

  getSelectedItems(): FileTreeItem[] {
    return Array.from(this.allItems.values()).filter(item => item.isSelected);
  }

  toggleItemSelection(item: FileTreeItem): void {
    item.toggleSelection();
    
    // If it's a folder, toggle all children
    if (item.contextValue === 'folder') {
      this.toggleFolderChildren(item.fullPath!, item.isSelected);
    }
    
    this._onDidChangeTreeData.fire(item);
  }

  private toggleFolderChildren(folderPath: string, selected: boolean): void {
    for (const [itemPath, item] of this.allItems) {
      if (itemPath.startsWith(folderPath + path.sep) || itemPath === folderPath) {
        if (item !== this.allItems.get(folderPath)) { // Don't toggle the folder itself again
          item.isSelected = selected;
          item.updateCheckmark();
        }
      }
    }
  }

  selectAll(): void {
    for (const item of this.allItems.values()) {
      item.isSelected = true;
      item.updateCheckmark();
    }
    this._onDidChangeTreeData.fire();
  }

  deselectAll(): void {
    for (const item of this.allItems.values()) {
      item.isSelected = false;
      item.updateCheckmark();
    }
    this._onDidChangeTreeData.fire();
  }

  clear(): void {
    this.rootPath = undefined;
    this.workspacePath = undefined;
    this.allItems.clear();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FileTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FileTreeItem): Thenable<FileTreeItem[]> {
    if (!this.rootPath) {
      return Promise.resolve([]);
    }

    const targetPath = element ? element.fullPath! : this.rootPath;
    return this.getDirectChildren(targetPath);
  }

  private async getDirectChildren(dirPath: string): Promise<FileTreeItem[]> {
    const items: FileTreeItem[] = [];
    
    for (const [itemPath, item] of this.allItems) {
      const parentPath = path.dirname(itemPath);
      if (parentPath === dirPath) {
        items.push(item);
      }
    }
    
    // Sort: folders first, then files, both alphabetically
    items.sort((a, b) => {
      if (a.contextValue === 'folder' && b.contextValue === 'file') return -1;
      if (a.contextValue === 'file' && b.contextValue === 'folder') return 1;
      return a.label.localeCompare(b.label);
    });
    
    return items;
  }

  private shouldSkipDirectory(dirName: string): boolean {
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
      "media",
    ];
    return skipDirs.includes(dirName) || dirName.startsWith(".");
  }

  private shouldSkipFile(fileName: string): boolean {
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
}