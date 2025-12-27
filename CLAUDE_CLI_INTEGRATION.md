# Claude CLI Integration Guide

This guide shows how to use the MCP-LSP Bridge with Claude CLI's code execution capabilities for maximum efficiency.

## Two Ways to Use LSP Bridge

### 1. Direct MCP Tool Calls (Traditional)

Claude calls MCP tools directly through the protocol:

```
User: "Find all references to the calculate_total function"

Claude:
  TOOL CALL: goto_definition(file, line, char)
  → Result: {...definition...} [loaded into context]

  TOOL CALL: find_references(file, line, char)
  → Result: {...50 references...} [all loaded into context]
```

**Token usage:** ~50,000 tokens (all tool definitions + all results)

### 2. Code Execution API (Efficient)

Claude writes code that uses the LSP Bridge API:

```
User: "Find all references to the calculate_total function"

Claude writes:
import * as lsp from './skills/servers/lsp-bridge';

await lsp.initializeWorkspace({ rootPath: process.cwd() });

const def = await lsp.gotoDefinition({ filePath: './src/billing.ts', line: 45, character: 9 });
const refs = await lsp.findReferences({
  filePath: def.definitions[0].file,
  line: def.definitions[0].line,
  character: def.definitions[0].character
});

console.log(`Found ${refs.count} references`);
```

**Token usage:** ~2,000 tokens (only what's needed + summary output)

**Token savings:** 96%

## Setup

### Step 1: Install and Build MCP-LSP Bridge

```bash
cd /path/to/lsp-mcp
npm install
npm run build
```

### Step 2: Configure Claude CLI

Add to your Claude Code config (`~/.config/claude/claude_desktop_config.json`):

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

### Step 3: Copy Skills to Claude CLI Directory

```bash
# Copy the skills directory to your Claude CLI workspace
cp -r /path/to/lsp-mcp/skills ~/.claude/skills/lsp-bridge

# Or create a symlink
ln -s /path/to/lsp-mcp/skills ~/.claude/skills/lsp-bridge
```

### Step 4: Install LSP Servers

Install LSP servers for languages you'll use:

```bash
# Python
pip install python-lsp-server

# TypeScript/JavaScript
npm install -g typescript-language-server typescript

# Go
go install golang.org/x/tools/gopls@latest

# Rust
rustup component add rust-analyzer
```

## Usage Examples

### Example 1: Find Function Usage

**Prompt:**
> "Find all places where the `processPayment` function is called in my project"

**Claude Code execution:**
```typescript
import * as lsp from './skills/lsp-bridge/servers/lsp-bridge';

await lsp.initializeWorkspace({ rootPath: process.cwd() });

// First, find the function definition
const def = await lsp.gotoDefinition({
  filePath: './src/payments.ts',
  line: 34,
  character: 16
});

if (!def.found) {
  console.log('Function not found');
  process.exit(1);
}

// Then find all references
const refs = await lsp.findReferences({
  filePath: def.definitions[0].file,
  line: def.definitions[0].line,
  character: def.definitions[0].character,
  includeDeclaration: false
});

// Group by file in code (not in context!)
const byFile: Record<string, number> = {};
for (const ref of refs.references || []) {
  byFile[ref.file] = (byFile[ref.file] || 0) + 1;
}

console.log(`\nFound ${refs.count} calls to processPayment:\n`);
const sorted = Object.entries(byFile)
  .sort(([, a], [, b]) => b - a);

for (const [file, count] of sorted) {
  console.log(`${count}x - ${file}`);
}
```

### Example 2: Pre-built Skills

**Prompt:**
> "Show me usage statistics for the main API functions"

**Claude Code execution:**
```typescript
import { analyzeFunctionUsage } from './skills/lsp-bridge/examples/analyze-function-usage';

const functions = ['handleRequest', 'processData', 'sendResponse'];

for (const funcName of functions) {
  const result = await analyzeFunctionUsage({
    rootPath: process.cwd(),
    filePath: './src/api.ts',
    // Note: In real usage, you'd need to find the line/char first
    line: 0,
    character: 0
  });

  if (result) {
    console.log(`\n${funcName}: ${result.totalReferences} refs in ${result.fileCount} files`);
  }
}
```

### Example 3: Generate Documentation

**Prompt:**
> "Generate API documentation for all my public exports"

**Claude Code execution:**
```typescript
import { generateApiDocs } from './skills/lsp-bridge/examples/generate-api-docs';

const docs = await generateApiDocs({
  rootPath: process.cwd(),
  filePath: './src/index.ts',
  outputPath: './docs/API.md'
});

console.log('Documentation generated at ./docs/API.md');
```

## Best Practices

### 1. Initialize Once

Always initialize the workspace at the start:

```typescript
await lsp.initializeWorkspace({ rootPath: process.cwd() });
```

### 2. Filter Data in Code

Process large datasets in the execution environment:

```typescript
// Good: Filter in code
const refs = await lsp.findReferences({ ... });
const importantRefs = refs.references
  .filter(ref => ref.file.includes('src'))
  .slice(0, 10);
console.log(importantRefs);

// Bad: Log everything to context
console.log(refs.references); // Could be thousands of lines!
```

### 3. Chain Operations Efficiently

Combine multiple LSP queries in one execution:

```typescript
// Find definition, then references, all in one execution
const def = await lsp.gotoDefinition({ ... });
const refs = await lsp.findReferences({
  filePath: def.definitions[0].file,
  line: def.definitions[0].line,
  character: def.definitions[0].character
});
```

### 4. Use Progressive Disclosure

Only load what you need:

```typescript
// Good: Import specific functions
import { gotoDefinition } from './skills/lsp-bridge/servers/lsp-bridge';

// Less efficient: Load all tools upfront via direct MCP calls
```

### 5. Handle Errors Gracefully

Always check results:

```typescript
const def = await lsp.gotoDefinition({ ... });

if (!def.found || !def.definitions || def.definitions.length === 0) {
  console.log('Definition not found');
  return;
}

// Safe to use def.definitions[0] now
```

## Performance Comparison

| Task | Direct MCP | Code Execution | Savings |
|------|-----------|----------------|---------|
| Find 1 definition | 5,000 tokens | 500 tokens | 90% |
| Find 50 references | 25,000 tokens | 1,000 tokens | 96% |
| Analyze usage in 10 files | 100,000 tokens | 2,000 tokens | 98% |
| Generate docs for module | 150,000 tokens | 3,000 tokens | 98% |

## Troubleshooting

### "Cannot find module './skills/lsp-bridge'"

**Solution:** Ensure the skills directory is in the correct location relative to your code execution environment. You may need to adjust the import path.

### "MCP client not available"

**Solution:** The code is trying to call MCP tools but the client isn't initialized. Make sure you're running in Claude CLI with MCP configured.

### "LSP for python not initialized"

**Solution:** Call `initializeWorkspace()` before making other LSP calls.

### "Command 'pylsp' not found"

**Solution:** Install the Python LSP server: `pip install python-lsp-server`

## Advanced: Creating Custom Skills

You can create reusable skills for your team:

```typescript
// skills/lsp-bridge/custom/find-dead-code.ts
import * as lsp from '../servers/lsp-bridge';

export async function findDeadCode(rootPath: string) {
  await lsp.initializeWorkspace({ rootPath });

  // Your custom logic:
  // 1. Find all exported functions
  // 2. Check if they have any references
  // 3. Report unused exports
}
```

Save with a `SKILL.md` file documenting usage.

## Migration from Direct MCP Calls

If you're currently using direct MCP calls:

**Before:**
```
User: "Find references to foo"
Claude uses MCP tool: find_references
```

**After:**
```
User: "Find references to foo"
Claude writes code:
  import * as lsp from './skills/lsp-bridge/servers/lsp-bridge';
  // ... code using lsp.findReferences()
```

No changes needed to your prompts - Claude will automatically choose the most efficient approach when skills are available.

## Next Steps

1. Try the example skills on your codebase
2. Create custom skills for your common workflows
3. Share your skills with your team
4. Monitor token usage improvements

## Resources

- [Skills Documentation](./skills/SKILL.md)
- [Example Skills](./skills/examples/README.md)
- [MCP-LSP Bridge Spec](./MCP_LSP_BRIDGE_SPEC.md)
- [Anthropic: Code Execution with MCP](https://www.anthropic.com/news/code-execution-with-mcp)
