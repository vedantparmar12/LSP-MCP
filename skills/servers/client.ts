/**
 * MCP Client Helper
 *
 * This module provides the bridge between code execution and MCP tool calls.
 * In a real implementation, this would communicate with the MCP server via stdio.
 *
 * For Claude CLI integration, this uses the built-in MCP client.
 */

export async function callMCPTool<T>(toolName: string, input: Record<string, unknown>): Promise<T> {
  // In Claude CLI, this will automatically route to the configured MCP server
  // For standalone usage, implement your own MCP client here

  // @ts-ignore - This will be provided by Claude CLI runtime
  if (typeof mcp !== 'undefined') {
    // @ts-ignore
    return await mcp.callTool(toolName, input);
  }

  throw new Error('MCP client not available. This code must run in an environment with MCP support.');
}
