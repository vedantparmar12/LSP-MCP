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
            dynamicRegistration: false,
            willSave: true,
            willSaveWaitUntil: true,
            didSave: true
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
