# MCP-LSP Bridge

A universal bridge between Language Server Protocol (LSP) servers and Model Context Protocol (MCP) to enable AI-powered code navigation.

## Features

- **Precision**: AI gets exact definitions, references, and type info from LSP
- **Scalability**: Works on massive codebases (10,000+ files) without reading everything
- **Extensibility**: Single bridge supports multiple languages + custom DSLs
- **Reusability**: Works across any MCP-compatible AI tool
- **Efficiency**: Code execution API reduces token usage by 95%+ compared to direct MCP calls

## Two Usage Modes

### 1. Direct MCP Tool Calls (Traditional)
Claude calls LSP tools directly through the MCP protocol. All tool definitions are loaded upfront.

### 2. Code Execution API (Recommended)
Claude writes code using the LSP Bridge API for 95%+ token savings. See [skills/](./skills/) directory.

```typescript
import * as lsp from './skills/servers/lsp-bridge';

await lsp.initializeWorkspace({ rootPath: process.cwd() });
const refs = await lsp.findReferences({ filePath: './src/api.ts', line: 10, character: 5 });
console.log(`Found ${refs.count} references`);
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Install required LSP servers:
```bash
# Python
pip install python-lsp-server

# Go
go install golang.org/x/tools/gopls@latest

# TypeScript
npm install -g typescript-language-server

# Rust
# Install via rustup component add rust-analyzer
```

## Configuration

Add to your Claude Code config (`~/.config/claude/claude_desktop_config.json`):

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

## Available Tools

1. **initialize_workspace** - Starts LSP servers for detected languages
2. **goto_definition** - Find where a symbol is defined
3. **find_references** - Find all references to a symbol
4. **get_diagnostics** - Get errors and warnings for a file

## Usage

### Direct MCP Tools

Once configured, Claude Code can use these tools automatically when navigating your codebase.

Example prompts:
- "Find all places where the `calculate_total` function is called"
- "Show me where the `Handler` interface is defined"

### Code Execution Skills (Recommended)

For better efficiency, use the code execution API:

```typescript
import { analyzeFunctionUsage } from './skills/examples/analyze-function-usage';

const result = await analyzeFunctionUsage({
  rootPath: process.cwd(),
  filePath: './src/utils.ts',
  line: 42,
  character: 10
});

console.log(`Function used ${result.totalReferences} times in ${result.fileCount} files`);
```

**Available Skills:**
- `analyze-function-usage` - Find and analyze function usage patterns
- `find-call-chain` - Trace function call chains
- `generate-api-docs` - Auto-generate API documentation

See [skills/SKILL.md](./skills/SKILL.md) for complete documentation.

## Documentation

- **[MCP_LSP_BRIDGE_SPEC.md](./MCP_LSP_BRIDGE_SPEC.md)** - Complete technical specification
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment and troubleshooting guide
- **[CLAUDE_CLI_INTEGRATION.md](./CLAUDE_CLI_INTEGRATION.md)** - Integration with Claude CLI
- **[skills/SKILL.md](./skills/SKILL.md)** - Code execution skills documentation
- **[skills/examples/README.md](./skills/examples/README.md)** - Example skills

## Performance

| Approach | Typical Token Usage | Use Case |
|----------|-------------------|----------|
| Direct MCP Calls | 50,000+ tokens | Simple queries, small codebases |
| Code Execution API | 2,000-5,000 tokens | Complex analysis, large codebases |

**Token savings: 95%+** when using code execution mode

## Development

```bash
# Build
npm run build

# Run in development mode
npm run dev

# Build skills (TypeScript → JavaScript)
cd skills && tsc
```

## License

See specification document for details.
