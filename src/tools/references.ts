import { LSPManager } from '../lsp-manager.js';
import { Location } from 'vscode-languageserver-protocol';

export class ReferencesTool {
  static async execute(lspManager: LSPManager, args: any) {
    const { filePath, line, character, includeDeclaration = true } = args;
    const connection = await lspManager.getConnection(filePath);

    const result = await connection.sendRequest<Location[] | null>(
      'textDocument/references',
      {
        textDocument: { uri: `file://${filePath}` },
        position: { line, character },
        context: { includeDeclaration }
      }
    );

    if (!result || result.length === 0) {
      return { found: false, count: 0 };
    }

    return {
      found: true,
      count: result.length,
      references: result.map(loc => ({
        file: loc.uri.replace('file://', ''),
        line: loc.range.start.line,
        character: loc.range.start.character
      }))
    };
  }
}
