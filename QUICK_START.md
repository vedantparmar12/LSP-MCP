# Quick Start Guide

Get up and running with MCP-LSP Bridge in 5 minutes.

## Installation

```bash
# 1. Clone/download the project
cd lsp-mcp

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Install LSP servers for your languages
pip install python-lsp-server                    # Python
npm install -g typescript-language-server         # TypeScript/JS
go install golang.org/x/tools/gopls@latest       # Go
rustup component add rust-analyzer                # Rust
```

## Configuration

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lsp-bridge": {
      "command": "node",
      "args": ["/absolute/path/to/lsp-mcp/build/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/lsp-mcp/` with your actual path.

## Usage

### Option 1: Direct MCP Tools (Simple)

Just ask Claude:

> "Find all references to the `handleRequest` function"

Claude will automatically use the MCP tools.

### Option 2: Code Execution (Efficient)

Ask Claude to write code:

> "Use the LSP Bridge skills to analyze function usage in my project"

Claude will write something like:

```typescript
import * as lsp from './skills/servers/lsp-bridge';

await lsp.initializeWorkspace({ rootPath: process.cwd() });

const def = await lsp.gotoDefinition({
  filePath: './src/api.ts',
  line: 10,
  character: 5
});

const refs = await lsp.findReferences({
  filePath: def.definitions[0].file,
  line: def.definitions[0].line,
  character: def.definitions[0].character
});

console.log(`Found ${refs.count} references`);
```

**Benefits:**
- 95% fewer tokens used
- Faster execution
- Better for large codebases

## Example Prompts

### Find References
> "Find all places where the `calculate_total` function is called"

### Analyze Usage
> "Show me which files use the `API` class most frequently"

### Generate Docs
> "Generate API documentation for my public exports in src/index.ts"

### Refactoring Impact
> "Before I rename this function, show me all the files that would be affected"

## Pre-built Skills

Use the example skills directly:

```typescript
import { analyzeFunctionUsage } from './skills/examples/analyze-function-usage';

const result = await analyzeFunctionUsage({
  rootPath: process.cwd(),
  filePath: './src/utils.ts',
  line: 42,
  character: 10
});
```

Available skills:
- `analyze-function-usage` - Analyze function usage patterns
- `find-call-chain` - Trace call dependencies
- `generate-api-docs` - Auto-generate documentation

## Troubleshooting

### "LSP not found"
```bash
# Check if LSP is installed
which pylsp          # macOS/Linux
where pylsp          # Windows

# If not, install it
pip install python-lsp-server
```

### "Cannot find module './skills/...'"
The skills directory needs to be accessible to Claude CLI. Copy it to your workspace or adjust import paths.

### "No definition found"
- Make sure the file exists
- Check that workspace is initialized
- Verify the LSP supports that language

## Performance

| Task | Without LSP | With LSP |
|------|------------|----------|
| Find definition | Read multiple files, guess | Instant, exact location |
| Find references | Search entire codebase | Query LSP index |
| Type info | Parse files manually | LSP provides types |

**Token savings with code execution: 95%+**

## Next Steps

1. **Read the docs:**
   - [CLAUDE_CLI_INTEGRATION.md](./CLAUDE_CLI_INTEGRATION.md) - Detailed integration guide
   - [skills/SKILL.md](./skills/SKILL.md) - Skills documentation

2. **Try examples:**
   - Run the example skills on your codebase
   - Modify them for your needs

3. **Create custom skills:**
   - Build reusable workflows for your team
   - Share them via the skills directory

## Support

- Issues: Check [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
- Spec: Read [MCP_LSP_BRIDGE_SPEC.md](./MCP_LSP_BRIDGE_SPEC.md)
- Examples: See [skills/examples/](./skills/examples/)
