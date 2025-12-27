/**
 * Generate API Documentation
 *
 * This skill uses LSP to extract function signatures and generate
 * documentation for a module's public API.
 *
 * Usage:
 * ```ts
 * import { generateApiDocs } from './skills/examples/generate-api-docs';
 *
 * const docs = await generateApiDocs({
 *   rootPath: '/path/to/project',
 *   filePath: './src/api.ts'
 * });
 * ```
 */

import * as lsp from '../servers/lsp-bridge/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface GenerateApiDocsInput {
  rootPath: string;
  /** File to generate documentation for */
  filePath: string;
  /** Output file path (optional) */
  outputPath?: string;
}

export interface FunctionDoc {
  name: string;
  location: string;
  usageCount: number;
  signature?: string; // Would come from hover info
}

export async function generateApiDocs(
  input: GenerateApiDocsInput
): Promise<string> {
  // Initialize workspace
  await lsp.initializeWorkspace({ rootPath: input.rootPath });

  // Read file to find exported functions
  const content = await fs.readFile(input.filePath, 'utf-8');
  const lines = content.split('\n');

  const functions: FunctionDoc[] = [];

  // Simple pattern matching for exported functions
  const exportPatterns = [
    /export\s+function\s+(\w+)/,
    /export\s+const\s+(\w+)\s*=/,
    /export\s+async\s+function\s+(\w+)/
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of exportPatterns) {
      const match = line.match(pattern);
      if (match) {
        const funcName = match[1];

        // Get definition info
        const def = await lsp.gotoDefinition({
          filePath: input.filePath,
          line: i,
          character: line.indexOf(funcName)
        });

        if (def.found && def.definitions && def.definitions.length > 0) {
          const definition = def.definitions[0];

          // Get usage count
          const refs = await lsp.findReferences({
            filePath: definition.file,
            line: definition.line,
            character: definition.character,
            includeDeclaration: false
          });

          functions.push({
            name: funcName,
            location: `${definition.file}:${definition.line}`,
            usageCount: refs.count,
            signature: line.trim() // Simplified - would use hover info in real implementation
          });
        }
      }
    }
  }

  // Generate markdown documentation
  const fileName = path.basename(input.filePath);
  let markdown = `# API Documentation: ${fileName}\n\n`;
  markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
  markdown += `**Functions:** ${functions.length}\n\n`;
  markdown += `---\n\n`;

  for (const func of functions) {
    markdown += `## ${func.name}\n\n`;
    markdown += `**Location:** \`${func.location}\`\n`;
    markdown += `**Usage:** ${func.usageCount} references\n\n`;
    if (func.signature) {
      markdown += `\`\`\`typescript\n${func.signature}\n\`\`\`\n\n`;
    }
    markdown += `---\n\n`;
  }

  // Save to file if output path provided
  if (input.outputPath) {
    await fs.writeFile(input.outputPath, markdown, 'utf-8');
    console.log(`Documentation written to: ${input.outputPath}`);
  }

  return markdown;
}

// Example standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const docs = await generateApiDocs({
    rootPath: process.cwd(),
    filePath: process.argv[2] || './src/index.ts',
    outputPath: process.argv[3] || './API.md'
  });

  console.log('\n' + docs);
}
