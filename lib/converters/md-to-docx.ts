import HTMLtoDOCX from 'html-to-docx';
import { parseMarkdownToHtml } from './styles';
import { ExportSettings } from '../types';

export interface DocxOptions extends Omit<ExportSettings, 'margin'> {
  title?: string;
  creator?: string;
  description?: string;
  fontSize?: number;
  font?: string;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export async function convertMarkdownToDocx(
  markdown: string,
  options: DocxOptions = {}
): Promise<Buffer> {
  const rawHtml = parseMarkdownToHtml(markdown);

  const fontName = options.docxFont || options.font || 'Calibri';
  const fontSizePt = options.docxFontSize || options.fontSize || 11;

  const marginTwips = {
    compact: 720, // 0.5 inch
    normal: 1440, // 1 inch
    wide: 2160, // 1.5 inch
  };
  const marginSize = options.docxMargin ? marginTwips[options.docxMargin] : 1440;

  // Pre-process HTML specifically for Word compatibility
  const formattedHtml = rawHtml
    .replace(/<table(\s*[^>]*)>/gi, '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #d0d7de;">')
    .replace(/<th(\s*[^>]*)>/gi, '<th style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; text-align: left;">')
    .replace(/<td(\s*[^>]*)>/gi, '<td style="border: 1px solid #cbd5e1; padding: 8px;">')
    .replace(/<blockquote(\s*[^>]*)>/gi, '<blockquote style="border-left: 3px solid #3b82f6; padding-left: 12px; margin-left: 0; color: #475569; font-style: italic;">')
    .replace(/<pre><code(\s*[^>]*)>([\s\S]*?)<\/code><\/pre>/gi, '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; font-family: Consolas, monospace; font-size: 10pt; white-space: pre-wrap;">$2</div>');

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${options.title || 'Document'}</title>
</head>
<body style="font-family: ${fontName}; font-size: ${fontSizePt}pt; line-height: 1.5; color: #1e293b;">
  ${formattedHtml}
</body>
</html>`;

  const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
    title: options.title || 'Converted Document',
    creator: options.creator || 'DocMorph Converter',
    description: options.description || 'Generated via DocMorph Converter',
    margins: {
      top: options.margin?.top ?? marginSize,
      right: options.margin?.right ?? marginSize,
      bottom: options.margin?.bottom ?? marginSize,
      left: options.margin?.left ?? marginSize,
    },
    font: fontName,
    fontSize: fontSizePt * 2, // half-points
    table: {
      row: {
        cantSplit: true,
      },
    },
    footer: true,
    pageNumber: true,
  });

  if (Buffer.isBuffer(docxBuffer)) {
    return docxBuffer;
  }
  const arrayBuffer = await (docxBuffer as Blob).arrayBuffer();
  return Buffer.from(arrayBuffer);
}
