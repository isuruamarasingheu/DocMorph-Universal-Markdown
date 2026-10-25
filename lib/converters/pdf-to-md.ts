import pdfParse from 'pdf-parse';
import { performOcrOnPdf } from './ocr';

export interface PdfToMdOptions {
  autoOcr?: boolean;
  ocrLanguage?: string;
}

export interface PdfToMdResult {
  markdown: string;
  pageCount: number;
  warnings: string[];
  ocrUsed?: boolean;
  stats: {
    characterCount: number;
    wordCount: number;
    densityPerPage: number;
    isScannedOrEmpty: boolean;
  };
}

export async function convertPdfToMarkdown(
  pdfBuffer: Buffer,
  options: PdfToMdOptions = {}
): Promise<PdfToMdResult> {
  const warnings: string[] = [];
  const parseFn = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any).default;

  let data: any;
  try {
    data = await parseFn(pdfBuffer);
  } catch (parseErr: any) {
    // If standard parser fails (e.g. malformed XRef or pure raster scanned PDF)
    const shouldRunOcr = options.autoOcr ?? true;
    if (shouldRunOcr) {
      try {
        const ocrResult = await performOcrOnPdf(pdfBuffer, options.ocrLanguage || 'eng');
        if (ocrResult.text && ocrResult.text.length > 10) {
          return {
            markdown: `> 🔍 **OCR Extracted Document**  \n> *Recovered via Tesseract OCR* · *Confidence:* **${ocrResult.confidence}%**\n\n${ocrResult.text}`,
            pageCount: ocrResult.pagesProcessed || 1,
            warnings: ['PDF text layer unreadable or missing; successfully recovered document text using Tesseract OCR.'],
            ocrUsed: true,
            stats: {
              characterCount: ocrResult.text.length,
              wordCount: ocrResult.text.split(/\s+/).length,
              densityPerPage: ocrResult.text.length,
              isScannedOrEmpty: true,
            },
          };
        }
      } catch {}
    }

    return {
      markdown: '> ⚠️ **Warning**: This document appears to be an image-only or non-standard PDF with no selectable text layer.',
      pageCount: 1,
      warnings: ['Could not extract text layer from PDF. The document may be scanned or image-based.'],
      ocrUsed: false,
      stats: {
        characterCount: 0,
        wordCount: 0,
        densityPerPage: 0,
        isScannedOrEmpty: true,
      },
    };
  }
  const numPages = data.numpages || 1;
  const rawText = data.text || '';
  const trimmedText = rawText.trim();
  const charCount = trimmedText.length;
  const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0;
  const densityPerPage = Math.round(charCount / numPages);

  // Check for scanned or image-only PDF (less than 80 chars per page on average)
  const isScannedOrEmpty = charCount < 80 * numPages;

  if (isScannedOrEmpty) {
    const shouldRunOcr = options.autoOcr ?? true;

    if (shouldRunOcr) {
      try {
        const ocrResult = await performOcrOnPdf(pdfBuffer, options.ocrLanguage || 'eng');
        if (ocrResult.text && ocrResult.text.length > 20) {
          warnings.push(
            `Scanned PDF detected: Successfully recovered text using Tesseract OCR (Average confidence: ${ocrResult.confidence}%).`
          );
          const ocrMarkdown = `> 🔍 **OCR Extracted Document**  \n> *Extracted via Tesseract.js* · *Confidence:* **${ocrResult.confidence}%** · *Pages:* ${ocrResult.pagesProcessed}\n\n${ocrResult.text}`;
          return {
            markdown: ocrMarkdown,
            pageCount: numPages,
            warnings,
            ocrUsed: true,
            stats: {
              characterCount: ocrResult.text.length,
              wordCount: ocrResult.text.split(/\s+/).length,
              densityPerPage: Math.round(ocrResult.text.length / numPages),
              isScannedOrEmpty: true,
            },
          };
        }
      } catch (ocrErr: any) {
        warnings.push(`OCR processing attempted but failed: ${ocrErr?.message || 'No readable text'}`);
      }
    }

    warnings.push(
      'Scanned or Image-only PDF Detected: This document contains minimal or no selectable text layer. Extracted markdown may be empty or incomplete.'
    );

    return {
      markdown: `> ⚠️ **Warning**: This PDF appears to be a scanned image or contains no selectable text layer.\n>\n> *Total pages*: ${numPages}  \n> *Extracted characters*: ${charCount}\n\n${trimmedText}`,
      pageCount: numPages,
      warnings,
      ocrUsed: false,
      stats: {
        characterCount: charCount,
        wordCount,
        densityPerPage,
        isScannedOrEmpty: true,
      },
    };
  }

  // Check for complex layout indicators
  if (rawText.includes('\t\t') || /\s{6,}/.test(rawText)) {
    warnings.push(
      'Multi-column or complex layout detected: Column reading order might affect paragraph continuity.'
    );
  }

  // Parse lines and structure into Markdown
  const lines = rawText.split(/\r?\n/);
  const processedLines: string[] = [];
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

    const tableColumns = line.split(/\s{2,}|\t/).map((col: string) => col.trim()).filter(Boolean);
    if (tableColumns.length >= 2 && !line.startsWith('#') && !line.startsWith('•') && !line.startsWith('-')) {
      inTable = true;
      tableRows.push(tableColumns);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Heading 1: ALL CAPS or numbered main heading
    if (/^[A-Z0-9\s:_-]{3,60}$/.test(line) && line.length > 3 && !line.endsWith('.') && !/^\d+$/.test(line)) {
      processedLines.push(`\n## ${capitalizeHeading(line)}\n`);
      continue;
    }

    // Heading 2: Section numbers
    if (/^(\d+\.\d+(\.\d+)?|chapter\s+\d+|section\s+\d+)/i.test(line) && line.length < 80) {
      processedLines.push(`\n### ${line}\n`);
      continue;
    }

    // Bullet lists
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

    processedLines.push(line);
  }

  if (inTable) {
    flushTable();
  }

  // Join lines with paragraph continuity
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
    } else if (
      next &&
      !next.startsWith('#') &&
      !next.startsWith('-') &&
      !next.startsWith('*') &&
      !next.startsWith('>') &&
      !next.startsWith('|') &&
      !/^\d+[\.\)]/.test(next) &&
      next.trim() !== ''
    ) {
      outputMarkdown += curr + ' ';
    } else {
      outputMarkdown += curr + '\n';
    }
  }

  outputMarkdown = outputMarkdown.replace(/\n{3,}/g, '\n\n').trim();

  return {
    markdown: outputMarkdown,
    pageCount: numPages,
    warnings,
    ocrUsed: false,
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
