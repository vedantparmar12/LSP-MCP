# MCP-LSP Bridge Architecture Specification

**Version:** 1.0  
**Target:** Claude CLI Implementation  
**Purpose:** Create a universal bridge between Language Server Protocol (LSP) servers and Model Context Protocol (MCP) to enable AI-powered code navigation

---

## Executive Summary

This specification defines a **multi-language LSP-to-MCP bridge** that exposes Language Server Protocol capabilities as MCP tools. This enables AI coding assistants (Claude Code, future tools) to navigate codebases with zero hallucination by querying actual language servers instead of guessing from file contents.

### Key Benefits
- **Precision**: AI gets exact definitions, references, and type info from LSP
- **Scalability**: Works on massive codebases (10,000+ files) without reading everything
- **Extensibility**: Single bridge supports multiple languages + custom DSLs
- **Reusability**: Works across any MCP-compatible AI tool

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Agent (Claude Code)                   │
│                                                              │
│  Calls MCP tools like: goto_definition, find_references     │
└───────────────────────┬──────────────────────────────────────┘
                        │ MCP Protocol (stdio)
                        │
┌───────────────────────▼──────────────────────────────────────┐
│              MCP-LSP Bridge Server (Your Code)               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MCP Request Handler                                   │ │
│  │  - Receives tool calls from AI                         │ │
│  │  - Validates parameters                                │ │
│  │  - Routes to appropriate LSP manager                   │ │
│  └────────────┬───────────────────────────────────────────┘ │
│               │                                              │
│  ┌────────────▼───────────────────────────────────────────┐ │
│  │  LSP Manager (Multi-language)                          │ │
│  │  - Spawns/manages LSP processes                        │ │
│  │  - Handles LSP lifecycle (init, shutdown)              │ │
│  │  - Document synchronization                            │ │
│  │  - Maintains workspace state                           │ │
│  └────────────┬───────────────────────────────────────────┘ │
└───────────────┼──────────────────────────────────────────────┘
                │ JSON-RPC 2.0 (stdin/stdout)
                │
    ┌───────────┴──────────┬──────────────┬─────────────┐
    │                      │              │             │
┌───▼────┐         ┌───────▼──┐    ┌──────▼───┐  ┌─────▼─────┐
│ pylsp  │         │  gopls   │    │rust-ana- │  │ Custom    │
│(Python)│         │   (Go)   │    │ lyzer    │  │ DSL LSP   │
└────────┘         └──────────┘    └──────────┘  └───────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **MCP Server** | Expose LSP features as MCP tools, handle AI requests |
| **LSP Manager** | Lifecycle, document sync, multi-language coordination |
| **LSP Processes** | Actual language analysis (definitions, types, errors) |

---

## Core Features

### Phase 1: Essential Tools (MVP)
These tools provide 80% of the value:

1. **`initialize_workspace`**
   - Starts LSP servers for detected languages
   - Sets workspace root
   - Returns available capabilities

2. **`goto_definition`**
   - Input: file path, line, character
   - Output: Definition location(s)

3. **`find_references`**
   - Input: file path, line, character
   - Output: All reference locations

4. **`get_hover_info`**
   - Input: file path, line, character
   - Output: Type signature, documentation

5. **`get_diagnostics`**
   - Input: file path (optional)
   - Output: Errors, warnings, hints

### Phase 2: Advanced Tools
6. **`find_implementations`** - Interface/trait implementations
7. **`get_document_symbols`** - Outline of functions/classes
8. **`get_workspace_symbols`** - Search all symbols by name
9. **`get_signature_help`** - Function parameter hints
10. **`get_code_actions`** - Available refactorings/fixes

### Phase 3: Custom Extensions
11. **`analyze_imports`** - Custom dependency analysis
12. **`get_call_hierarchy`** - Call graph navigation
13. **`semantic_search`** - Domain-specific search

---

## Implementation Roadmap

### Step 1: Project Setup

```bash
# Directory structure
mcp-lsp-bridge/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── lsp-manager.ts        # LSP lifecycle management
│   ├── jsonrpc.ts            # JSON-RPC client/server
│   ├── document-sync.ts      # Track file changes
│   ├── tools/
│   │   ├── definition.ts     # goto_definition tool
│   │   ├── references.ts     # find_references tool
│   │   ├── hover.ts          # get_hover_info tool
│   │   └── diagnostics.ts    # get_diagnostics tool
│   └── config/
│       └── lsp-servers.ts    # LSP server configurations
├── package.json
├── tsconfig.json
└── README.md
```

**Dependencies:**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "vscode-jsonrpc": "^8.2.0",
    "vscode-languageserver-protocol": "^3.17.5"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
```

### Step 2: Core MCP Server Implementation

**File:** `src/index.ts`

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { LSPManager } from './lsp-manager.js';
import { DefinitionTool } from './tools/definition.js';
import { ReferencesTool } from './tools/references.js';

const server = new Server(
  {
    name: 'mcp-lsp-bridge',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const lspManager = new LSPManager();

// Tool: Initialize workspace
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'initialize_workspace',
      description: 'Initialize LSP servers for the workspace',
      inputSchema: {
        type: 'object',
        properties: {
          rootPath: { type: 'string', description: 'Workspace root directory' },
          languages: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Languages to initialize (e.g., ["python", "go"])'
          }
        },
        required: ['rootPath']
      }
    },
    {
      name: 'goto_definition',
      description: 'Find where a symbol is defined',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          line: { type: 'number', description: 'Zero-based line number' },
          character: { type: 'number', description: 'Zero-based character offset' }
        },
        required: ['filePath', 'line', 'character']
      }
    },
    {
      name: 'find_references',
      description: 'Find all references to a symbol',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          line: { type: 'number' },
          character: { type: 'number' },
          includeDeclaration: { type: 'boolean', default: true }
        },
        required: ['filePath', 'line', 'character']
      }
    },
    {
      name: 'get_diagnostics',
      description: 'Get errors and warnings for a file',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'File to check (omit for all files)' }
        }
      }
    }
  ]
}));

// Tool call handler
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'initialize_workspace': {
      const { rootPath, languages } = args;
      await lspManager.initialize(rootPath, languages);
      return {
        content: [{
          type: 'text',
          text: `Initialized LSP servers for: ${languages?.join(', ') || 'auto-detected languages'}`
        }]
      };
    }

    case 'goto_definition': {
      const result = await DefinitionTool.execute(lspManager, args);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    }

    case 'find_references': {
      const result = await ReferencesTool.execute(lspManager, args);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Step 3: LSP Manager (Multi-Language Support)

**File:** `src/lsp-manager.ts`

```typescript
import { spawn, ChildProcess } from 'child_process';
import { MessageConnection, createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node.js';
import { InitializeParams, InitializeResult } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

interface LSPServerConfig {
  command: string;
  args: string[];
  fileExtensions: string[];
}

const LSP_CONFIGS: Record<string, LSPServerConfig> = {
  python: {
    command: 'pylsp',
    args: [],
    fileExtensions: ['.py']
  },
  go: {
    command: 'gopls',
    args: [],
    fileExtensions: ['.go']
  },
  rust: {
    command: 'rust-analyzer',
    args: [],
    fileExtensions: ['.rs']
  },
  typescript: {
    command: 'typescript-language-server',
    args: ['--stdio'],
    fileExtensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  // Add custom DSL here
  customdsl: {
    command: '/path/to/custom-dsl-lsp',
    args: ['--stdio'],
    fileExtensions: ['.cdsl']
  }
};

export class LSPManager {
  private servers: Map<string, MessageConnection> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private workspaceRoot: string = '';
  private openDocuments: Map<string, string> = new Map(); // filePath -> content

  async initialize(rootPath: string, languages?: string[]) {
    this.workspaceRoot = rootPath;

    // Auto-detect languages if not specified
    const langsToInit = languages || this.detectLanguages(rootPath);

    for (const lang of langsToInit) {
      await this.startLSP(lang);
    }
  }

  private detectLanguages(rootPath: string): string[] {
    const languages = new Set<string>();
    
    // Simple file extension scan (first 100 files)
    const scanDir = (dir: string, depth = 0) => {
      if (depth > 3) return; // Limit depth
      const files = fs.readdirSync(dir).slice(0, 100);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory() && !file.startsWith('.')) {
          scanDir(fullPath, depth + 1);
        } else {
          const ext = path.extname(file);
          for (const [lang, config] of Object.entries(LSP_CONFIGS)) {
            if (config.fileExtensions.includes(ext)) {
              languages.add(lang);
            }
          }
        }
      }
    };

    scanDir(rootPath);
    return Array.from(languages);
  }

  private async startLSP(language: string) {
    const config = LSP_CONFIGS[language];
    if (!config) {
      throw new Error(`No LSP configuration for language: ${language}`);
    }

    console.error(`Starting LSP for ${language}: ${config.command}`);

    const process = spawn(config.command, config.args, {
      stdio: 'pipe',
      cwd: this.workspaceRoot
    });

    this.processes.set(language, process);

    const connection = createMessageConnection(
      new StreamMessageReader(process.stdout),
      new StreamMessageWriter(process.stdin)
    );

    connection.listen();

    // Initialize LSP
    const initParams: InitializeParams = {
      processId: process.pid!,
      rootUri: `file://${this.workspaceRoot}`,
      capabilities: {
        textDocument: {
          synchronization: {
            didOpen: true,
            didChange: true,
            didClose: true
          },
          definition: { dynamicRegistration: false },
          references: { dynamicRegistration: false },
          hover: { dynamicRegistration: false }
        },
        workspace: {
          workspaceFolders: true,
          didChangeWatchedFiles: { dynamicRegistration: false }
        }
      },
      workspaceFolders: [{
        uri: `file://${this.workspaceRoot}`,
        name: path.basename(this.workspaceRoot)
      }]
    };

    const initResult = await connection.sendRequest<InitializeResult>('initialize', initParams);
    await connection.sendNotification('initialized', {});

    this.servers.set(language, connection);
    console.error(`LSP ${language} initialized with capabilities:`, Object.keys(initResult.capabilities));
  }

  async getConnection(filePath: string): Promise<MessageConnection> {
    const ext = path.extname(filePath);
    
    for (const [lang, config] of Object.entries(LSP_CONFIGS)) {
      if (config.fileExtensions.includes(ext)) {
        const conn = this.servers.get(lang);
        if (!conn) {
          throw new Error(`LSP for ${lang} not initialized`);
        }
        
        // Ensure document is open
        await this.ensureDocumentOpen(filePath, conn);
        return conn;
      }
    }

    throw new Error(`No LSP server for file extension: ${ext}`);
  }

  private async ensureDocumentOpen(filePath: string, connection: MessageConnection) {
    if (this.openDocuments.has(filePath)) {
      return; // Already open
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const languageId = this.getLanguageId(filePath);

    await connection.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: `file://${filePath}`,
        languageId,
        version: 1,
        text: content
      }
    });

    this.openDocuments.set(filePath, content);
  }

  private getLanguageId(filePath: string): string {
    const ext = path.extname(filePath);
    const mapping: Record<string, string> = {
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.ts': 'typescript',
      '.tsx': 'typescriptreact',
      '.js': 'javascript',
      '.jsx': 'javascriptreact'
    };
    return mapping[ext] || 'plaintext';
  }

  async shutdown() {
    for (const [lang, conn] of this.servers.entries()) {
      await conn.sendRequest('shutdown', null);
      await conn.sendNotification('exit', null);
      this.processes.get(lang)?.kill();
    }
  }
}
```

### Step 4: Tool Implementations

**File:** `src/tools/definition.ts`

```typescript
import { LSPManager } from '../lsp-manager.js';
import { Location } from 'vscode-languageserver-protocol';

export class DefinitionTool {
  static async execute(lspManager: LSPManager, args: any) {
    const { filePath, line, character } = args;
    const connection = await lspManager.getConnection(filePath);

    const result = await connection.sendRequest<Location | Location[] | null>(
      'textDocument/definition',
      {
        textDocument: { uri: `file://${filePath}` },
        position: { line, character }
      }
    );

    if (!result) {
      return { found: false };
    }

    const locations = Array.isArray(result) ? result : [result];
    return {
      found: true,
      definitions: locations.map(loc => ({
        file: loc.uri.replace('file://', ''),
        line: loc.range.start.line,
        character: loc.range.start.character,
        endLine: loc.range.end.line,
        endCharacter: loc.range.end.character
      }))
    };
  }
}
```

**File:** `src/tools/references.ts`

```typescript
import { LSPManager } from '../lsp-manager.js';
import { Location } from 'vscode-languageserver-protocol';

export class ReferencesTool {
  static async execute(lspManager: LSPManager, args: any) {
    const { filePath, line, character, includeDeclaration = true } = args;
    const connection = await lspManager.getConnection(filePath);

    const result = await connection.sendRequest<Location[] | null>(
      'textDocument/references',
      {
        textDocument: { uri: `file://${filePath}` },
        position: { line, character },
        context: { includeDeclaration }
      }
    );

    if (!result || result.length === 0) {
      return { found: false, count: 0 };
    }

    return {
      found: true,
      count: result.length,
      references: result.map(loc => ({
        file: loc.uri.replace('file://', ''),
        line: loc.range.start.line,
        character: loc.range.start.character
      }))
    };
  }
}
```

### Step 5: Build and Package

**File:** `package.json`

```json
{
  "name": "mcp-lsp-bridge",
  "version": "1.0.0",
  "type": "module",
  "main": "build/index.js",
  "bin": {
    "mcp-lsp-bridge": "./build/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node build/index.js",
    "dev": "tsc && node build/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "vscode-jsonrpc": "^8.2.0",
    "vscode-languageserver-protocol": "^3.17.5"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
```

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "outDir": "build",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

## Configuration for Claude Code

After building, configure Claude Code to use your MCP-LSP bridge:

**File:** `~/.config/claude/claude_desktop_config.json` (or equivalent)

```json
{
  "mcpServers": {
    "lsp-bridge": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-lsp-bridge/build/index.js"]
    }
  }
}
```

---

## Usage Examples

### Example 1: AI navigates Python codebase

**User:** "Find all places where the `calculate_total` function is called"

**Claude Code internally:**
1. Calls `initialize_workspace` with project root
2. Calls `goto_definition` on "calculate_total" to verify it exists
3. Calls `find_references` on that location
4. Returns formatted list of all call sites

### Example 2: Understanding Go interfaces

**User:** "Show me all implementations of the `Handler` interface"

**Claude Code:**
1. Calls `goto_definition` for "Handler"
2. Calls `find_implementations` (Phase 2 tool)
3. Returns all structs implementing that interface

### Example 3: Custom DSL navigation

**User:** "Where is the `user_login` workflow defined in our internal DSL?"

**Claude Code:**
1. Bridge detects `.cdsl` file extension
2. Uses custom DSL LSP (configured in `LSP_CONFIGS`)
3. Returns definition from proprietary tooling

---

## Advanced Features

### Feature 1: Caching Layer

Add a cache to avoid redundant LSP calls:

```typescript
class LSPCache {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private TTL = 30000; // 30 seconds

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.TTL) {
      return entry.result;
    }
    return null;
  }

  set(key: string, result: any) {
    this.cache.set(key, { result, timestamp: Date.now() });
  }
}
```

### Feature 2: Incremental Document Sync

Track file changes to keep LSP in sync:

```typescript
// Watch files and send didChange notifications
import { watch } from 'fs';

watch(filePath, async (eventType) => {
  if (eventType === 'change') {
    const newContent = fs.readFileSync(filePath, 'utf-8');
    await connection.sendNotification('textDocument/didChange', {
      textDocument: { uri: `file://${filePath}`, version: ++version },
      contentChanges: [{ text: newContent }]
    });
  }
});
```

### Feature 3: Diagnostics Aggregation

Collect errors from all LSPs and format for AI:

```typescript
async getAllDiagnostics(): Promise<Diagnostic[]> {
  const allDiagnostics = [];
  
  for (const [lang, conn] of this.servers.entries()) {
    const diags = await conn.sendRequest('textDocument/publishDiagnostics', {});
    allDiagnostics.push(...diags);
  }
  
  return allDiagnostics.sort((a, b) => {
    // Sort by severity: errors first, then warnings
    return (a.severity || 99) - (b.severity || 99);
  });
}
```

---

## Error Handling

### Critical Error Scenarios

1. **LSP crashes mid-session**
   ```typescript
   process.on('exit', (code) => {
     console.error(`LSP ${language} exited with code ${code}`);
     // Auto-restart logic
     this.startLSP(language);
   });
   ```

2. **File URI mismatches** (Windows vs Unix)
   ```typescript
   function normalizeUri(filePath: string): string {
     // Windows: file:///C:/path
     // Unix: file:///path
     return process.platform === 'win32'
       ? `file:///${filePath.replace(/\\/g, '/')}`
       : `file://${filePath}`;
   }
   ```

3. **Timeout on slow LSPs**
   ```typescript
   const timeout = new Promise((_, reject) =>
     setTimeout(() => reject(new Error('LSP timeout')), 10000)
   );
   const result = await Promise.race([lspRequest, timeout]);
   ```

---

## Testing Strategy

### Unit Tests

```typescript
// test/definition.test.ts
import { LSPManager } from '../src/lsp-manager';
import { DefinitionTool } from '../src/tools/definition';

describe('DefinitionTool', () => {
  it('should find Python function definition', async () => {
    const manager = new LSPManager();
    await manager.initialize('/path/to/project', ['python']);
    
    const result = await DefinitionTool.execute(manager, {
      filePath: '/path/to/project/main.py',
      line: 10,
      character: 5
    });
    
    expect(result.found).toBe(true);
    expect(result.definitions).toHaveLength(1);
  });
});
```

### Integration Tests

Create a test repository with known code and verify LSP responses:

```bash
# test-fixtures/python-sample/
├── module_a.py  # defines function foo()
└── module_b.py  # calls foo()
```

---

## Performance Optimization

### Optimization 1: Lazy LSP Initialization

Don't start all LSPs upfront:

```typescript
async getConnection(filePath: string): Promise<MessageConnection> {
  const lang = this.detectLanguage(filePath);
  
  if (!this.servers.has(lang)) {
    // Start LSP on-demand
    await this.startLSP(lang);
  }
  
  return this.servers.get(lang)!;
}
```

### Optimization 2: Batch Requests

If AI asks for definitions of 10 symbols, batch them:

```typescript
async batchDefinitions(requests: Array<{filePath, line, char}>) {
  const grouped = this.groupByLanguage(requests);
  
  const results = await Promise.all(
    Object.entries(grouped).map(([lang, reqs]) =>
      this.sendBatchRequest(lang, reqs)
    )
  );
  
  return results.flat();
}
```

---

## Security Considerations

1. **Path Traversal Prevention**
   ```typescript
   function validatePath(filePath: string, workspaceRoot: string): boolean {
     const resolved = path.resolve(filePath);
     return resolved.startsWith(workspaceRoot);
   }
   ```

2. **LSP Process Isolation**
   - Run LSPs with limited file system access
   - Use `--no-sandbox` flags carefully

3. **Timeout All Requests**
   - Never let LSP hang indefinitely
   - Default timeout: 10 seconds

---

## Deployment Checklist

- [ ] Install required LSP servers (pylsp, gopls, etc.)
- [ ] Build TypeScript: `npm run build`
- [ ] Test with sample project: `node build/index.js`
- [ ] Add to Claude Code config
- [ ] Verify tools appear in Claude: "What MCP tools do you have?"
- [ ] Test end-to-end: "Find definition of X in my code"

---

## Troubleshooting

### Issue: "LSP not found"
**Solution:** Ensure LSP is in PATH: `which pylsp`

### Issue: "No definition found"
**Solution:** Check if file is opened in LSP: look for `didOpen` notification in logs

### Issue: "Timeout errors"
**Solution:** Increase timeout or check LSP performance with `time pylsp --version`

---

## Future Enhancements

1. **Workspace-wide refactoring** via LSP's `workspace/executeCommand`
2. **Semantic highlighting** for better code comprehension
3. **Code lens integration** for inline metrics (references count, etc.)
4. **Multi-root workspace support** for monorepos
5. **LSP middleware** for custom transformations (e.g., redact sensitive info)

---

## References

- MCP SDK Docs: https://modelcontextprotocol.io
- LSP Specification: https://microsoft.github.io/language-server-protocol/
- vscode-jsonrpc: https://github.com/microsoft/vscode-languageserver-node

---

## License

This specification is provided as-is for educational and implementation purposes.

---

**Ready to implement?** Provide this entire markdown file to Claude CLI with:

```bash
claude code --file MCP_LSP_BRIDGE_SPEC.md "Please implement this MCP-LSP bridge following the specification. Start with Step 1 and proceed through all steps."
```
