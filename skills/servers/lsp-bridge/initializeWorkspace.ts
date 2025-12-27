import { callMCPTool } from "../client.js";

export interface InitializeWorkspaceInput {
  /** Workspace root directory */
  rootPath: string;
  /** Optional: Languages to initialize (e.g., ["python", "go"]). If not provided, auto-detects. */
  languages?: string[];
}

export interface InitializeWorkspaceResponse {
  message: string;
  languages: string[];
}

/**
 * Initialize LSP servers for the workspace.
 *
 * This should be called once at the start of any LSP operations.
 * It will auto-detect languages in the workspace or use the provided list.
 *
 * @example
 * ```ts
 * await initializeWorkspace({ rootPath: '/path/to/project' });
 * ```
 */
export async function initializeWorkspace(
  input: InitializeWorkspaceInput
): Promise<InitializeWorkspaceResponse> {
  const result = await callMCPTool<{ content: Array<{ text: string }> }>(
    'initialize_workspace',
    input
  );

  // Parse the response
  const text = result.content[0]?.text || '';
  const languages = input.languages || [];

  return {
    message: text,
    languages
  };
}
