# LSP Bridge - Example Skills

This directory contains example skills that demonstrate how to use the LSP Bridge API effectively in code execution environments like Claude CLI.

## Available Examples

### 1. Analyze Function Usage (`analyze-function-usage.ts`)

Finds a function and analyzes its usage across the codebase.

**Use case:** Understanding impact before refactoring

**Example:**
```typescript
import { analyzeFunctionUsage } from './skills/examples/analyze-function-usage';

const result = await analyzeFunctionUsage({
  rootPath: '/path/to/project',
  filePath: './src/utils.ts',
  line: 42,
  character: 10
});

console.log(`Used in ${result.fileCount} files`);
```

**Output:**
- Total references
- Files using the function (sorted by usage)
- Reference locations

### 2. Find Call Chain (`find-call-chain.ts`)

Traces what calls a function and what it calls.

**Use case:** Understanding dependencies and call graphs

**Example:**
```typescript
import { findCallChain } from './skills/examples/find-call-chain';

const result = await findCallChain({
  rootPath: '/path/to/project',
  filePath: './src/api.ts',
  functionName: 'handleRequest'
});
```

**Output:**
- Function location
- List of callers
- List of called functions (placeholder)

### 3. Generate API Documentation (`generate-api-docs.ts`)

Automatically generates markdown documentation from source code.

**Use case:** Keeping documentation in sync with code

**Example:**
```typescript
import { generateApiDocs } from './skills/examples/generate-api-docs';

const docs = await generateApiDocs({
  rootPath: '/path/to/project',
  filePath: './src/public-api.ts',
  outputPath: './docs/API.md'
});
```

**Output:**
- Markdown file with all exported functions
- Usage statistics
- Function signatures

## Running Examples Standalone

Each example can be run directly:

```bash
# Analyze function usage
node skills/examples/analyze-function-usage.js ./src/utils.ts 42 10

# Find call chain
node skills/examples/find-call-chain.js ./src/api.ts handleRequest

# Generate API docs
node skills/examples/generate-api-docs.js ./src/index.ts ./API.md
```

## Creating Your Own Skills

Use these examples as templates for your own skills:

1. Import the LSP Bridge API: `import * as lsp from '../servers/lsp-bridge'`
2. Initialize the workspace: `await lsp.initializeWorkspace({ rootPath })`
3. Use LSP tools to gather data
4. Process and filter results in code
5. Return only high-level insights to the model

### Skill Template

```typescript
import * as lsp from '../servers/lsp-bridge/index.js';

export interface MySkillInput {
  rootPath: string;
  // ... your parameters
}

export async function mySkill(input: MySkillInput) {
  // Initialize
  await lsp.initializeWorkspace({ rootPath: input.rootPath });

  // Your logic here...
  const def = await lsp.gotoDefinition({ ... });
  const refs = await lsp.findReferences({ ... });

  // Process data
  const results = processData(def, refs);

  // Return summary
  return results;
}
```

## Tips for Efficient Skills

1. **Filter early** - Process large datasets in code, return summaries
2. **Batch operations** - Chain multiple LSP queries in one execution
3. **Cache results** - Store intermediate data in variables
4. **Handle errors** - Always check if results are found
5. **Limit output** - Slice arrays before logging (e.g., `.slice(0, 10)`)

## Token Savings

These skills demonstrate 95%+ token savings compared to direct MCP calls:

| Approach | Tokens | Explanation |
|----------|--------|-------------|
| Direct MCP | 50,000+ | All tool defs + all results through context |
| Code Execution | 2,000-5,000 | Load on demand + filter in code |

## Next Steps

1. Try running the examples on your codebase
2. Modify them for your specific needs
3. Create new skills combining multiple LSP operations
4. Share your skills with the community
