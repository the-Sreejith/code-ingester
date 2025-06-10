# Code Ingester

Code Ingester is a powerful VS Code extension that allows you to quickly copy all file contents from any folder (including nested subdirectories) directly to your clipboard. Perfect for code reviews, documentation, AI assistance, or sharing entire project structures.

## Features

- **Right-click folder copying**: Simply right-click any folder in the Explorer and select "Copy All File Contents"
- **Recursive file traversal**: Automatically includes all files from subdirectories
- **Smart filtering**: Skips binary files, node_modules, .git, and other unnecessary directories
- **File path headers**: Each file's content includes its relative path for easy identification
- **Intelligent file detection**: Only processes text-based files (JS, TS, HTML, CSS, MD, JSON, etc.)
- **Large project support**: Efficiently handles projects with hundreds of files
- **Clipboard integration**: Seamlessly copies formatted content to your system clipboard

### Usage

1. Right-click on any folder in the VS Code Explorer
2. Select "Copy All File Contents" from the context menu
3. All file contents are copied to clipboard with proper formatting and file paths
4. Paste anywhere you need the combined code

![Feature Demo](images/demo.gif)

*Example: Right-clicking on a React project folder copies all components, utilities, and configuration files*

## Output Format

Each file is formatted with clear headers and separators:

```
// src/components/Header.tsx

import React from 'react';
// ... rest of file content

================================================================================

// src/utils/helpers.ts  

export const formatDate = (date: Date) => {
// ... rest of file content
```

## Requirements

- VS Code version 1.74.0 or higher
- No additional dependencies required

## Supported File Types

The extension intelligently processes text-based files including:
- JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`)
- Web files (`.html`, `.css`, `.scss`, `.less`)
- Configuration files (`.json`, `.yaml`, `.yml`, `.toml`)
- Documentation (`.md`, `.txt`, `.rst`)
- And many more text formats

## Excluded Files and Directories

For optimal performance and relevance, the extension automatically skips:
- **Directories**: `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`
- **File types**: Binary files, images, videos, archives, logs
- **Specific files**: `package-lock.json`, `.DS_Store`, minified files

## Extension Settings

Currently, Code Ingester works out of the box with no configuration needed. Future versions may include:

- Custom file type filtering
- Output format customization
- Directory exclusion rules

## Known Issues

- Very large folders (1000+ files) may take a few seconds to process
- Some files with special encoding might not be read correctly
- Binary files are automatically skipped to prevent clipboard corruption

## Release Notes

### 0.0.1

Initial release of Code Ingester
- Basic folder content copying functionality
- Smart file filtering and directory traversal
- Clipboard integration with formatted output

---

## Use Cases

- **Code Reviews**: Copy entire feature branches for review
- **AI Assistance**: Feed complete project context to AI tools
- **Documentation**: Generate comprehensive code documentation
- **Code Sharing**: Share complete examples with proper file structure
- **Migration**: Copy legacy code structures for modernization
- **Learning**: Study entire project codebases at once

## Contributing

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/yourusername/code-ingester).

## License

This extension is licensed under the MIT License.

---

**Enjoy coding with Code Ingester!** 🚀