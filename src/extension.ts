import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('copyFolderContents.copyAllFiles', async (uri: vscode.Uri) => {
        try {
            const folderPath = uri.fsPath;
            const allFileContents = await getAllFileContents(folderPath);
            
            if (allFileContents.length === 0) {
                vscode.window.showInformationMessage('No files found in the selected folder.');
                return;
            }

            const combinedContent = allFileContents.join('\n\n' + '='.repeat(80) + '\n\n');
            
            await vscode.env.clipboard.writeText(combinedContent);
            
            const fileCount = allFileContents.length;
            vscode.window.showInformationMessage(`Copied contents of ${fileCount} file(s) to clipboard.`);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error copying folder contents: ${error}`);
        }
    });

    context.subscriptions.push(disposable);
}

async function getAllFileContents(folderPath: string): Promise<string[]> {
    const fileContents: string[] = [];
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(folderPath));
    const workspacePath = workspaceFolder?.uri.fsPath || '';

    async function processDirectory(dirPath: string) {
        try {
            const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item.name);
                
                if (item.isDirectory()) {
                    // Skip common directories that shouldn't be copied
                    if (shouldSkipDirectory(item.name)) {
                        continue;
                    }
                    await processDirectory(fullPath);
                } else if (item.isFile()) {
                    // Skip binary files and other files that shouldn't be copied
                    if (shouldSkipFile(item.name)) {
                        continue;
                    }
                    
                    try {
                        const content = await fs.promises.readFile(fullPath, 'utf8');
                        const relativePath = workspacePath 
                            ? path.relative(workspacePath, fullPath)
                            : path.relative(folderPath, fullPath);
                        
                        const fileHeader = `// ${relativePath}`;
                        const fileContent = `${fileHeader}\n\n${content}`;
                        fileContents.push(fileContent);
                    } catch (readError) {
                        // Skip files that can't be read as text
                        console.warn(`Could not read file ${fullPath}: ${readError}`);
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing directory ${dirPath}: ${error}`);
        }
    }

    await processDirectory(folderPath);
    return fileContents;
}

function shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
        'node_modules',
        '.git',
        '.vscode',
        'dist',
        'build',
        'out',
        '.next',
        'coverage',
        '.nyc_output',
        'logs',
        '*.log'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
}

function shouldSkipFile(fileName: string): boolean {
    const skipExtensions = [
        '.exe', '.dll', '.so', '.dylib',
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
        '.mp4', '.avi', '.mov', '.wmv', '.mp3', '.wav',
        '.zip', '.rar', '.7z', '.tar', '.gz',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.log', '.tmp', '.cache'
    ];
    
    const skipFiles = [
        '.DS_Store',
        'Thumbs.db',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml'
    ];
    
    const ext = path.extname(fileName).toLowerCase();
    return skipExtensions.includes(ext) || 
           skipFiles.includes(fileName) || 
           fileName.startsWith('.') ||
           fileName.includes('.min.');
}

export function deactivate() {}