/**
 * Find Call Chain
 *
 * This skill traces the call chain from a function - finding what it calls
 * and what calls it. Useful for understanding dependencies and impact.
 *
 * Usage:
 * ```ts
 * import { findCallChain } from './skills/examples/find-call-chain';
 *
 * const result = await findCallChain({
 *   rootPath: '/path/to/project',
 *   filePath: './src/api.ts',
 *   functionName: 'handleRequest'
 * });
 * ```
 */

import * as lsp from '../servers/lsp-bridge/index.js';
import * as fs from 'fs/promises';

export interface FindCallChainInput {
  rootPath: string;
  filePath: string;
  /** Name of the function to analyze */
  functionName: string;
}

export interface CallChainResult {
  function: string;
  location: string;
  calledBy: Array<{ file: string; line: number }>;
  calls: Array<{ name: string; file: string; line: number }>;
}

/**
 * Helper to find function definition by name in a file
 */
async function findFunctionInFile(
  filePath: string,
  functionName: string
): Promise<{ line: number; character: number } | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Simple heuristic - look for function declarations
      // Matches: function foo, const foo =, foo: function, async function foo
      const patterns = [
        new RegExp(`function\\s+${functionName}\\s*\\(`),
        new RegExp(`const\\s+${functionName}\\s*=`),
        new RegExp(`${functionName}\\s*:\\s*function`),
        new RegExp(`${functionName}\\s*=\\s*\\(`),
        new RegExp(`async\\s+function\\s+${functionName}`)
      ];

      for (const pattern of patterns) {
        if (pattern.test(line)) {
          return {
            line: i,
            character: line.indexOf(functionName)
          };
        }
      }
    }
  } catch (error) {
    console.error(`Error reading file: ${error}`);
  }

  return null;
}

export async function findCallChain(
  input: FindCallChainInput
): Promise<CallChainResult | null> {
  // Initialize workspace
  await lsp.initializeWorkspace({ rootPath: input.rootPath });

  // Find the function in the file
  const position = await findFunctionInFile(input.filePath, input.functionName);

  if (!position) {
    console.log(`Function "${input.functionName}" not found in ${input.filePath}`);
    return null;
  }

  // Get function definition
  const def = await lsp.gotoDefinition({
    filePath: input.filePath,
    line: position.line,
    character: position.character
  });

  if (!def.found || !def.definitions || def.definitions.length === 0) {
    console.log('Could not resolve function definition');
    return null;
  }

  const definition = def.definitions[0];

  // Find all callers (references)
  const refs = await lsp.findReferences({
    filePath: definition.file,
    line: definition.line,
    character: definition.character,
    includeDeclaration: false
  });

  const calledBy = refs.references || [];

  // TODO: To find what this function calls, we'd need to:
  // 1. Read the function body
  // 2. Parse function calls within it
  // 3. Use goto_definition on each call
  // This is left as an exercise - would require more sophisticated parsing

  return {
    function: input.functionName,
    location: `${definition.file}:${definition.line}`,
    calledBy: calledBy.slice(0, 20), // Limit results
    calls: [] // Placeholder - would need AST parsing
  };
}

// Example standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await findCallChain({
    rootPath: process.cwd(),
    filePath: process.argv[2] || './src/index.ts',
    functionName: process.argv[3] || 'main'
  });

  if (result) {
    console.log(`\nCall Chain for: ${result.function}`);
    console.log(`======================`);
    console.log(`Location: ${result.location}\n`);
    console.log(`Called by (${result.calledBy.length} locations):`);
    for (const caller of result.calledBy.slice(0, 10)) {
      console.log(`  ${caller.file}:${caller.line}`);
    }
  }
}
