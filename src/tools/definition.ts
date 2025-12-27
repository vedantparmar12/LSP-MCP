import { LSPManager } from '../lsp-manager.js';
import { Location } from 'vscode-languageserver-protocol';

export class DefinitionTool {
  static async execute(lspManager: LSPManager, args: any) {
    const { filePath, line, character } = args;
    const connection = await lspManager.getConnection(filePath);

    const result = await connection.sendRequest<Location | Location[] | null>(
      'textDocument/definition',
      {
        textDocument: { uri: `file://${filePath}` },
        position: { line, character }
      }
    );

    if (!result) {
      return { found: false };
    }

    const locations = Array.isArray(result) ? result : [result];
    return {
      found: true,
      definitions: locations.map(loc => ({
        file: loc.uri.replace('file://', ''),
        line: loc.range.start.line,
        character: loc.range.start.character,
        endLine: loc.range.end.line,
        endCharacter: loc.range.end.character
      }))
    };
  }
}
