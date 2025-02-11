import * as vscode from 'vscode';

const tokenTypes = [
  'specification',            // For spec/concept headers: lines starting with '#' or underlined with '='
  'scenario',                 // For scenario headers: lines starting with '##' or underlined with '-'
  'stepMarker',               // For the leading "*" in a step line
  'step',                     // For the rest of the step text
  'argument',                 // For any quoted text or angle-bracketed text in step lines (or concept heading)
  'table',                    // For table cell text (non-border, non-separator)
  'tableHeaderSeparator',     // For table header separator dash characters (only '-' characters)
  'tableBorder',              // For table border characters (the '|' characters)
  'tagKeyword',               // For the literal "tags:" at the beginning of a tag line
  'tagValue',                 // For the remainder of a tag line after "tags:"
  'disabledStep',             // For lines starting with "//" (used to disable a step)
  'gaugeComment'              // For lines that do not match any of the above (fallback comment lines)
];
const tokenModifiers: string[] = [];
export const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

export class GaugeSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  public provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    const builder = new vscode.SemanticTokensBuilder(legend);
    const lines = document.getText().split(/\r?\n/);

    // Combined regular expression to match text within double quotes OR within angle brackets.
    const argumentRegex = /(?:"([^"]+)"|<([^>]+)>)/g;
    // Regular expression to detect a table header separator line.
    // Matches lines that start and end with a pipe and contain only dashes, pipes, and optional spaces.
    const tableHeaderSeparatorRegex = /^\|\s*-+\s*(\|\s*-+\s*)+\|?$/;

    // Process the document with a manual loop (to allow multi‑line heading handling).
    for (let i = 0; i < lines.length;) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // 0. Check for comment lines - lines starting with "//"
      if (trimmedLine.startsWith("//")) {
        builder.push(i, 0, line.length, tokenTypes.indexOf('disabledStep'), 0);
        i++;
        continue;
      }

      // 1. Check for underlined headings:
      // If the next line exists and is made up entirely of "=" then this is a specification header.
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const trimmedNextLine = nextLine.trim();
        if (trimmedNextLine.length > 0 && /^[=]+$/.test(trimmedNextLine)) {
          const leadingSpaces = line.length - line.trimStart().length;
          // Mark the heading line.
          builder.push(i, leadingSpaces, line.length - leadingSpaces, tokenTypes.indexOf('specification'), 0);
          // Mark the underline line.
          builder.push(i + 1, 0, nextLine.length, tokenTypes.indexOf('specification'), 0);
          i += 2;
          continue;
        }
        // If the next line is made up entirely of "-" then this is a scenario header.
        if (trimmedNextLine.length > 0 && /^[-]+$/.test(trimmedNextLine)) {
          const leadingSpaces = line.length - line.trimStart().length;
          builder.push(i, leadingSpaces, line.length - leadingSpaces, tokenTypes.indexOf('scenario'), 0);
          builder.push(i + 1, 0, nextLine.length, tokenTypes.indexOf('scenario'), 0);
          i += 2;
          continue;
        }
      }

      // 2. Check for '#' style headings.
      // Now we process any heading line that starts with '#' to also highlight arguments.
      if (trimmedLine.startsWith("#")) {
        // Find the first non‑whitespace index.
        const firstNonWhitespaceIndex = line.search(/\S/);
        let lastIndex = firstNonWhitespaceIndex;
        // Reset regex state for this line.
        argumentRegex.lastIndex = 0;
        let match: RegExpExecArray | null = argumentRegex.exec(line);
        while (match !== null) {
          const matchStart = match.index;
          if (matchStart > lastIndex) {
            // Mark the non‑argument portion as a scenario token.
            builder.push(i, lastIndex, matchStart - lastIndex, tokenTypes.indexOf('scenario'), 0);
          }
          // Mark the matched argument text as an argument token.
          builder.push(i, matchStart, match[0].length, tokenTypes.indexOf('argument'), 0);
          lastIndex = argumentRegex.lastIndex;
          match = argumentRegex.exec(line);
        }
        if (lastIndex < line.length) {
          builder.push(i, lastIndex, line.length - lastIndex, tokenTypes.indexOf('scenario'), 0);
        }
        i++;
        continue;
      }

      // 3. Check for tag lines (lines starting with "tags:" case-insensitively).
      else if (trimmedLine.toLowerCase().startsWith('tags:')) {
        const leadingSpaces = line.length - line.trimStart().length;
        const keyword = "tags:";
        builder.push(i, leadingSpaces, keyword.length, tokenTypes.indexOf('tagKeyword'), 0);
        const tagValueStart = leadingSpaces + keyword.length;
        if (tagValueStart < line.length) {
          builder.push(i, tagValueStart, line.length - tagValueStart, tokenTypes.indexOf('tagValue'), 0);
        }
        i++;
        continue;
      }

      // 4. Process step lines (lines starting with '*').
      else if (trimmedLine.startsWith('*')) {
        const firstNonWhitespaceIndex = line.indexOf('*');
        if (firstNonWhitespaceIndex !== -1) {
          // Mark the "*" as a stepMarker.
          builder.push(i, firstNonWhitespaceIndex, 1, tokenTypes.indexOf('stepMarker'), 0);
          let lastIndex = firstNonWhitespaceIndex + 1;
          // Reset regex state for this line.
          argumentRegex.lastIndex = 0;
          let match: RegExpExecArray | null = argumentRegex.exec(line);
          while (match !== null) {
            const matchStart = match.index;
            if (matchStart > lastIndex) {
              builder.push(i, lastIndex, matchStart - lastIndex, tokenTypes.indexOf('step'), 0);
            }
            // Mark the entire matched text (including quotes or angle brackets) as an argument.
            builder.push(i, matchStart, match[0].length, tokenTypes.indexOf('argument'), 0);
            lastIndex = argumentRegex.lastIndex;
            match = argumentRegex.exec(line);
          }
          // Any remaining text after the last argument is part of the step.
          if (lastIndex < line.length) {
            builder.push(i, lastIndex, line.length - lastIndex, tokenTypes.indexOf('step'), 0);
          }
        }
        i++;
        continue;
      }

      // 5. Process table lines (lines starting with '|').
      else if (trimmedLine.startsWith('|')) {
        if (tableHeaderSeparatorRegex.test(trimmedLine)) {
          // Process the table separator line character-by-character.
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '|') {
              // Mark pipe characters as tableBorder.
              builder.push(i, j, 1, tokenTypes.indexOf('tableBorder'), 0);
            } else if (char === '-') {
              let start = j;
              while (j < line.length && line[j] === '-') {
                j++;
              }
              // Group consecutive dashes as tableHeaderSeparator.
              builder.push(i, start, j - start, tokenTypes.indexOf('tableHeaderSeparator'), 0);
              j--; // adjust for outer loop increment
            } else {
              // Other characters (likely whitespace) get the "table" token.
              builder.push(i, j, 1, tokenTypes.indexOf('table'), 0);
            }
          }
        } else {
          // Process a normal table row character-by-character.
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '|') {
              builder.push(i, j, 1, tokenTypes.indexOf('tableBorder'), 0);
            } else {
              builder.push(i, j, 1, tokenTypes.indexOf('table'), 0);
            }
          }
        }
        i++;
        continue;
      }
      else {
        // For any other non-empty line, mark it as a comment.
        if (trimmedLine.length > 0) {
          builder.push(i, 0, line.length, tokenTypes.indexOf('gaugeComment'), 0);
        }
        i++;
      }
    }
    return builder.build();
  }
}
