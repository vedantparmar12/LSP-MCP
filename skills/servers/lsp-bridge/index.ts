/**
 * LSP Bridge - Code Execution API
 *
 * This module provides a TypeScript API for interacting with Language Server Protocol
 * servers through the MCP-LSP Bridge.
 *
 * Instead of making direct MCP tool calls that consume context, use these functions
 * in your code to efficiently navigate codebases and extract information.
 */

export * from './initializeWorkspace.js';
export * from './gotoDefinition.js';
export * from './findReferences.js';
