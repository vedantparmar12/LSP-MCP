import { callMCPTool } from "../client.js";

export interface FindReferencesInput {
  /** Path to the file containing the symbol */
  filePath: string;
  /** Zero-based line number */
  line: number;
  /** Zero-based character offset */
  character: number;
  /** Include the declaration in the results (default: true) */
  includeDeclaration?: boolean;
}

export interface Reference {
  file: string;
  line: number;
  character: number;
}

export interface FindReferencesResponse {
  found: boolean;
  count: number;
  references?: Reference[];
}

/**
 * Find all references to a symbol.
 *
 * Returns all locations where a symbol is referenced throughout the codebase.
 * Useful for refactoring, understanding usage, and impact analysis.
 *
 * @example
 * ```ts
 * const result = await findReferences({
 *   filePath: '/project/src/utils.py',
 *   line: 5,
 *   character: 10,
 *   includeDeclaration: false
 * });
 *
 * console.log(`Found ${result.count} references`);
 * for (const ref of result.references || []) {
 *   console.log(`  ${ref.file}:${ref.line}`);
 * }
 * ```
 */
export async function findReferences(
  input: FindReferencesInput
): Promise<FindReferencesResponse> {
  const result = await callMCPTool<{ content: Array<{ text: string }> }>(
    'find_references',
    input
  );

  // Parse JSON response
  const text = result.content[0]?.text || '{}';
  return JSON.parse(text);
}
