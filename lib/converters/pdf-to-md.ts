import pdfParse from 'pdf-parse';

export interface PdfToMdResult {
  markdown: string;
  pageCount: number;
  warnings: string[];
  stats: {
    characterCount: number;
    wordCount: number;
    densityPerPage: number;
    isScannedOrEmpty: boolean;
  };
}

export async function convertPdfToMarkdown(pdfBuffer: Buffer): Promise<PdfToMdResult> {
  const warnings: string[] = [];
  const parseFn = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any).default;

  const data = await parseFn(pdfBuffer);
  const numPages = data.numpages || 1;
  const rawText = data.text || '';
  const trimmedText = rawText.trim();
  const charCount = trimmedText.length;
  const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0;
  const densityPerPage = Math.round(charCount / numPages);

  // Check for scanned or image-only PDF (excluding minimal header/footer noise)
  const isScannedOrEmpty = charCount < 80 * numPages;
  if (isScannedOrEmpty) {
    warnings.push(
      'Scanned or Image-only PDF Detected: This document contains minimal or no selectable text layer. Reverse conversion cannot extract text from raster images without OCR.'
    );
  }

  // Check for complex layout indicators
  if (rawText.includes('\t\t') || /\s{6,}/.test(rawText)) {
    warnings.push(
      'Multi-column or complex layout detected: Column reading order might affect paragraph continuity.'
    );
  }

  if (isScannedOrEmpty) {
    return {
      markdown: `> ⚠️ **Warning**: This PDF appears to be a scanned image or contains no selectable text layer.\n>\n> *Total pages*: ${numPages}  \n> *Extracted characters*: ${charCount}\n\n${trimmedText}`,
      pageCount: numPages,
      warnings,
      stats: {
        characterCount: charCount,
        wordCount,
        densityPerPage,
        isScannedOrEmpty: true,
      },
    };
  }

  // Parse lines and structure into Markdown
  const lines = rawText.split(/\r?\n/);
  const processedLines: string[] = [];
  let inCodeBlock = false;
  let inTable = false;
  let tableRows: string[][] = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    if (tableRows.length >= 2) {
      const header = tableRows[0];
      const separator = header.map(() => '---');
      processedLines.push('| ' + header.join(' | ') + ' |');
      processedLines.push('| ' + separator.join(' | ') + ' |');
      for (let i = 1; i < tableRows.length; i++) {
        processedLines.push('| ' + tableRows[i].join(' | ') + ' |');
      }
      processedLines.push('');
    } else {
      // Not enough rows for a real table, output as plain text
      for (const row of tableRows) {
        processedLines.push(row.join('  '));
      }
      processedLines.push('');
    }
    tableRows = [];
    inTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      if (inTable) flushTable();
      processedLines.push('');
      continue;
    }

    // Check for table row (3 or more columns separated by 2+ spaces or tabs)
    const tableColumns = line.split(/\s{2,}|\t/).map((col: string) => col.trim()).filter(Boolean);
    if (tableColumns.length >= 2 && !line.startsWith('#') && !line.startsWith('•') && !line.startsWith('-')) {
      inTable = true;
      tableRows.push(tableColumns);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Heading 1: Numbered main sections like "1. INTRODUCTION" or ALL CAPS short line
    if (/^[A-Z0-9\s:_-]{3,60}$/.test(line) && line.length > 3 && !line.endsWith('.') && !/^\d+$/.test(line)) {
      processedLines.push(`\n## ${capitalizeHeading(line)}\n`);
      continue;
    }

    // Heading 2: Section numbers like "1.1 Background" or "Chapter 2: Methods"
    if (/^(\d+\.\d+(\.\d+)?|chapter\s+\d+|section\s+\d+)/i.test(line) && line.length < 80) {
      processedLines.push(`\n### ${line}\n`);
      continue;
    }

    // Bullet lists: normalize bullets
    if (/^[•●▪■◦–—]\s*(.+)/.test(line)) {
      const match = line.match(/^[•●▪■◦–—]\s*(.+)/);
      if (match) {
        processedLines.push(`- ${match[1]}`);
        continue;
      }
    }

    // Numbered lists
    if (/^\d+[\.\)]\s+(.+)/.test(line)) {
      processedLines.push(line);
      continue;
    }

    // Blockquote
    if (/^(note|warning|caution|tip|important):\s*(.+)/i.test(line)) {
      processedLines.push(`> **${line.substring(0, line.indexOf(':'))}**: ${line.substring(line.indexOf(':') + 1).trim()}`);
      continue;
    }

    // Regular line
    processedLines.push(line);
  }

  if (inTable) {
    flushTable();
  }

  // Join lines with paragraph preservation
  let outputMarkdown = '';
  for (let i = 0; i < processedLines.length; i++) {
    const curr = processedLines[i];
    const next = processedLines[i + 1];

    if (!curr) {
      outputMarkdown += '\n\n';
      continue;
    }

    if (
      curr.startsWith('#') ||
      curr.startsWith('-') ||
      curr.startsWith('*') ||
      curr.startsWith('>') ||
      curr.startsWith('|') ||
      /^\d+[\.\)]/.test(curr)
    ) {
      outputMarkdown += curr + '\n';
    } else if (next && !next.startsWith('#') && !next.startsWith('-') && !next.startsWith('*') && !next.startsWith('>') && !next.startsWith('|') && !/^\d+[\.\)]/.test(next) && next.trim() !== '') {
      // Merge wrapped paragraph line
      outputMarkdown += curr + ' ';
    } else {
      outputMarkdown += curr + '\n';
    }
  }

  // Clean excessive whitespace
  outputMarkdown = outputMarkdown.replace(/\n{3,}/g, '\n\n').trim();

  return {
    markdown: outputMarkdown,
    pageCount: numPages,
    warnings,
    stats: {
      characterCount: charCount,
      wordCount,
      densityPerPage,
      isScannedOrEmpty: false,
    },
  };
}

function capitalizeHeading(str: string): string {
  if (str === str.toUpperCase()) {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return str;
}
