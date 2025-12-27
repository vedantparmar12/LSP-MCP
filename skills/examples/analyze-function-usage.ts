/**
 * Analyze Function Usage
 *
 * This skill finds a function definition and analyzes its usage across the codebase.
 * Returns statistics about where and how often the function is called.
 *
 * Usage:
 * ```ts
 * import { analyzeFunctionUsage } from './skills/examples/analyze-function-usage';
 *
 * const result = await analyzeFunctionUsage({
 *   rootPath: '/path/to/project',
 *   filePath: './src/utils.ts',
 *   line: 42,
 *   character: 10
 * });
 * ```
 */

import * as lsp from '../servers/lsp-bridge/index.js';

export interface AnalyzeFunctionUsageInput {
  rootPath: string;
  filePath: string;
  line: number;
  character: number;
}

export interface UsageStats {
  functionName: string;
  definedAt: string;
  totalReferences: number;
  fileCount: number;
  topFiles: Array<{ file: string; count: number }>;
  references: Array<{ file: string; line: number }>;
}

export async function analyzeFunctionUsage(
  input: AnalyzeFunctionUsageInput
): Promise<UsageStats | null> {
  // Initialize workspace
  await lsp.initializeWorkspace({ rootPath: input.rootPath });

  // Find function definition
  const def = await lsp.gotoDefinition({
    filePath: input.filePath,
    line: input.line,
    character: input.character
  });

  if (!def.found || !def.definitions || def.definitions.length === 0) {
    console.log('Function not found');
    return null;
  }

  const definition = def.definitions[0];

  // Find all references
  const refs = await lsp.findReferences({
    filePath: definition.file,
    line: definition.line,
    character: definition.character,
    includeDeclaration: false
  });

  if (!refs.found || !refs.references) {
    return {
      functionName: 'unknown',
      definedAt: `${definition.file}:${definition.line}`,
      totalReferences: 0,
      fileCount: 0,
      topFiles: [],
      references: []
    };
  }

  // Group by file
  const byFile: Record<string, number> = {};
  for (const ref of refs.references) {
    byFile[ref.file] = (byFile[ref.file] || 0) + 1;
  }

  // Sort by usage
  const topFiles = Object.entries(byFile)
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    functionName: 'unknown', // Could extract from file content
    definedAt: `${definition.file}:${definition.line}`,
    totalReferences: refs.count,
    fileCount: Object.keys(byFile).length,
    topFiles,
    references: refs.references.slice(0, 50) // Limit to first 50
  };
}

// Example standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await analyzeFunctionUsage({
    rootPath: process.cwd(),
    filePath: process.argv[2] || './src/index.ts',
    line: parseInt(process.argv[3] || '10'),
    character: parseInt(process.argv[4] || '5')
  });

  if (result) {
    console.log(`\nFunction Usage Analysis`);
    console.log(`======================`);
    console.log(`Defined at: ${result.definedAt}`);
    console.log(`Total references: ${result.totalReferences}`);
    console.log(`Used in ${result.fileCount} files\n`);
    console.log(`Top files:`);
    for (const { file, count } of result.topFiles) {
      console.log(`  ${count}x - ${file}`);
    }
  }
}
