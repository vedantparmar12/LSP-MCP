# Deployment Guide

## Prerequisites

Before deploying the MCP-LSP Bridge, ensure you have the required LSP servers installed for the languages you want to support.

### Installing LSP Servers

#### Python (pylsp)
```bash
pip install python-lsp-server
```

#### Go (gopls)
```bash
go install golang.org/x/tools/gopls@latest
```

#### TypeScript/JavaScript (typescript-language-server)
```bash
npm install -g typescript-language-server typescript
```

#### Rust (rust-analyzer)
```bash
# Via rustup
rustup component add rust-analyzer
```

## Deployment Checklist

- [x] Build TypeScript: `npm run build`
- [ ] Install required LSP servers (see above)
- [ ] Test with sample project: `node build/index.js`
- [ ] Add to Claude Code config
- [ ] Verify tools appear in Claude: "What MCP tools do you have?"
- [ ] Test end-to-end: "Find definition of X in my code"

## Configuration for Claude Code

Add the following to your Claude Code configuration file:

**Windows:** `%APPDATA%\claude\claude_desktop_config.json`
**macOS/Linux:** `~/.config/claude/claude_desktop_config.json`

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

Replace `/absolute/path/to/mcp-lsp-bridge/` with the actual path to your installation.

## Verifying Installation

1. Restart Claude Code (if running)
2. Ask Claude: "What MCP tools do you have?"
3. You should see: `initialize_workspace`, `goto_definition`, `find_references`, and `get_diagnostics`

## Testing

Test with a simple Python file:

1. Create a test file: `test.py`
```python
def hello():
    return "world"

print(hello())
```

2. Ask Claude: "Find all references to the `hello` function in test.py"

## Troubleshooting

### "LSP not found" error
- Ensure the LSP is in your PATH: `which pylsp` (macOS/Linux) or `where pylsp` (Windows)
- Try running the LSP directly to verify it works

### "No definition found" error
- Check if the file is being opened in the LSP
- Look for `didOpen` notification in logs
- Ensure the workspace is initialized correctly

### "Timeout errors"
- Increase timeout in the code
- Check LSP performance: `time pylsp --version`

## Next Steps

Once deployed, you can use the bridge to navigate your codebase with AI assistance:

- "Find where function X is defined"
- "Show me all references to class Y"
- "What are the errors in file Z?"
