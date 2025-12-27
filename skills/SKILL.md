# LSP Bridge Skills

**Type:** Code Execution API
**Purpose:** Efficient codebase navigation using Language Server Protocol
**Token Savings:** 95%+ compared to direct MCP tool calls

## Overview

The LSP Bridge Skills provide a TypeScript API for navigating codebases using Language Server Protocol servers. Instead of making direct MCP tool calls that load all definitions upfront and pass results through the context window, these skills let you write code that:

1. **Loads tools on demand** - Only read the tool definitions you need
2. **Filters data efficiently** - Process results in code before returning to context
3. **Composes operations** - Chain multiple LSP queries in a single execution
4. **Maintains state** - Persist results for multi-step workflows

## Available Tools

### Core LSP Operations

```typescript
import * as lsp from './servers/lsp-bridge';

// Initialize workspace (call this first)
await lsp.initializeWorkspace({
  rootPath: '/path/to/project',
  languages: ['python', 'typescript'] // optional
});

// Find symbol definition
const def = await lsp.gotoDefinition({
  filePath: '/path/to/file.py',
  line: 10,
  character: 5
});

// Find all references
const refs = await lsp.findReferences({
  filePath: '/path/to/file.py',
  line: 10,
  character: 5,
  includeDeclaration: false
});
```

## Usage Patterns

### Pattern 1: Progressive Disclosure

Load only what you need when you need it:

```typescript
// Bad: Load all tools upfront (thousands of tokens)
// All tools loaded into context before task starts

// Good: Import only what's needed (hundreds of tokens)
import { gotoDefinition } from './servers/lsp-bridge';

const result = await gotoDefinition({ ... });
```

### Pattern 2: Context-Efficient Results

Filter and transform data before returning to model:

```typescript
// Find all references to a function
const refs = await lsp.findReferences({
  filePath: './src/utils.ts',
  line: 42,
  character: 10
});

// Group by file in code (not in context)
const byFile: Record<string, number> = {};
for (const ref of refs.references || []) {
  byFile[ref.file] = (byFile[ref.file] || 0) + 1;
}

// Only return summary
console.log(`Found ${refs.count} references across ${Object.keys(byFile).length} files`);
console.log(byFile);
```

### Pattern 3: Multi-Step Workflows

Chain operations efficiently:

```typescript
// Find a function definition, then find all its callers
const funcDef = await lsp.gotoDefinition({
  filePath: './src/api.ts',
  line: 20,
  character: 15
});

if (funcDef.found && funcDef.definitions) {
  const def = funcDef.definitions[0];
  const callers = await lsp.findReferences({
    filePath: def.file,
    line: def.line,
    character: def.character,
    includeDeclaration: false
  });

  console.log(`Function defined at ${def.file}:${def.line}`);
  console.log(`Called from ${callers.count} locations`);
}
```

## When to Use This Skill

Use LSP Bridge Skills when you need to:

- **Navigate large codebases** - Find definitions, references, implementations
- **Analyze code structure** - Understand dependencies and call graphs
- **Refactor safely** - Find all usages before making changes
- **Generate documentation** - Extract signatures and types from LSP
- **Build code tools** - Create custom analysis workflows

## Integration with Claude CLI

### Setup

1. Ensure MCP-LSP Bridge is configured in Claude Code:

```json
{
  "mcpServers": {
    "lsp-bridge": {
      "command": "node",
      "args": ["/path/to/mcp-lsp-bridge/build/index.js"]
    }
  }
}
```

2. The skills directory is available at `./skills/`

3. Import and use in your code execution tasks

### Example Usage

**Prompt:** "Find all places where the `calculate_total` function is called and show me which files use it most"

**Agent writes:**

```typescript
import * as lsp from './skills/servers/lsp-bridge';

// Initialize workspace
await lsp.initializeWorkspace({ rootPath: process.cwd() });

// Find the function definition
const def = await lsp.gotoDefinition({
  filePath: './src/billing.ts',
  line: 45,
  character: 9
});

if (!def.found) {
  console.log('Function not found');
  process.exit(1);
}

// Find all references
const refs = await lsp.findReferences({
  filePath: def.definitions![0].file,
  line: def.definitions![0].line,
  character: def.definitions![0].character,
  includeDeclaration: false
});

// Group by file and count
const usage: Record<string, number> = {};
for (const ref of refs.references || []) {
  usage[ref.file] = (usage[ref.file] || 0) + 1;
}

// Sort by usage
const sorted = Object.entries(usage)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 10);

console.log(`\nTop 10 files calling calculate_total:\n`);
for (const [file, count] of sorted) {
  console.log(`${count}x - ${file}`);
}
```

## Performance Benefits

| Metric | Direct Tool Calls | Code Execution |
|--------|------------------|----------------|
| Tool definitions loaded | All upfront | On-demand |
| Intermediate results | Through context | In execution env |
| Multi-step operations | Sequential calls | Single execution |
| Token usage (typical) | 50,000+ | 2,000-5,000 |
| Latency | High (multiple round trips) | Low (single execution) |

## Best Practices

1. **Initialize once** - Call `initializeWorkspace()` at the start of your script
2. **Filter early** - Process data in code before logging to context
3. **Batch operations** - Chain related LSP queries in a single execution
4. **Handle errors** - Check `.found` properties before accessing results
5. **Log summaries** - Return high-level insights, not raw data

## Creating Custom Skills

You can build reusable skills on top of these primitives:

```typescript
// skills/find-unused-functions.ts
import * as lsp from './servers/lsp-bridge';
import * as fs from 'fs/promises';

export async function findUnusedFunctions(rootPath: string) {
  await lsp.initializeWorkspace({ rootPath });

  // Your custom logic here...
  // Scan files, check references, identify unused functions
}
```

Save this as a skill with its own `SKILL.md` for future reuse.

## Troubleshooting

**"MCP client not available"**
- Ensure you're running in an environment with MCP support (Claude CLI)
- Check that the MCP-LSP Bridge is configured

**"LSP not initialized"**
- Call `initializeWorkspace()` before other operations
- Verify the rootPath is correct

**"No definition found"**
- Symbol might not exist or LSP hasn't indexed the file
- Try with a different symbol to verify LSP is working

## Related Documentation

- [MCP-LSP Bridge Specification](../MCP_LSP_BRIDGE_SPEC.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Code Execution with MCP (Anthropic Blog)](https://www.anthropic.com/news/code-execution-with-mcp)
