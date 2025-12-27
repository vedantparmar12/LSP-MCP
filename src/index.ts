import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
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
server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'initialize_workspace': {
      const { rootPath, languages } = args as { rootPath: string; languages?: string[] };
      await lspManager.initialize(rootPath, languages);
      return {
        content: [{
          type: 'text',
          text: `Initialized LSP servers for: ${languages?.join(', ') || 'auto-detected languages'}`
        }]
      };
    }

    case 'goto_definition': {
      const result = await DefinitionTool.execute(lspManager, args as any);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    }

    case 'find_references': {
      const result = await ReferencesTool.execute(lspManager, args as any);
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
