import { callMCPTool } from "../client.js";

export interface GotoDefinitionInput {
  /** Path to the file containing the symbol */
  filePath: string;
  /** Zero-based line number */
  line: number;
  /** Zero-based character offset */
  character: number;
}

export interface Location {
  file: string;
  line: number;
  character: number;
  endLine: number;
  endCharacter: number;
}

export interface GotoDefinitionResponse {
  found: boolean;
  definitions?: Location[];
}

/**
 * Find where a symbol is defined.
 *
 * Given a position in a file, returns the location(s) where that symbol is defined.
 * Useful for understanding code structure and navigation.
 *
 * @example
 * ```ts
 * const result = await gotoDefinition({
 *   filePath: '/project/src/main.py',
 *   line: 10,
 *   character: 5
 * });
 *
 * if (result.found) {
 *   console.log(`Definition found at ${result.definitions[0].file}:${result.definitions[0].line}`);
 * }
 * ```
 */
export async function gotoDefinition(
  input: GotoDefinitionInput
): Promise<GotoDefinitionResponse> {
  const result = await callMCPTool<{ content: Array<{ text: string }> }>(
    'goto_definition',
    input
  );

  // Parse JSON response
  const text = result.content[0]?.text || '{}';
  return JSON.parse(text);
}
