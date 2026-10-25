import archiver from 'archiver';
import { Writable } from 'stream';
import { convertMarkdownToDocx } from './md-to-docx';
import { convertMarkdownToPdf } from './md-to-pdf';
import { convertDocxToMarkdown } from './docx-to-md';
import { convertPdfToMarkdown } from './pdf-to-md';
import { ConversionDirection } from '../types';

export interface BatchItemInput {
  name: string;
  buffer: Buffer;
  direction: ConversionDirection;
}

export interface BatchItemOutput {
  originalName: string;
  outputName: string;
  buffer?: Buffer;
  text?: string;
  success: boolean;
  warnings: string[];
  error?: string;
}

export async function processSingleFile(
  name: string,
  buffer: Buffer,
  direction: ConversionDirection
): Promise<BatchItemOutput> {
  const baseName = name.replace(/\.[^/.]+$/, '');
  const warnings: string[] = [];

  try {
    switch (direction) {
      case 'md-to-docx': {
        const text = buffer.toString('utf-8');
        const docxBuffer = await convertMarkdownToDocx(text, { title: baseName });
        return {
          originalName: name,
          outputName: `${baseName}.docx`,
          buffer: docxBuffer,
          success: true,
          warnings,
        };
      }

      case 'md-to-pdf': {
        const text = buffer.toString('utf-8');
        const { buffer: pdfBuffer, engine } = await convertMarkdownToPdf(text, { title: baseName });
        if (engine === 'pdfkit') {
          warnings.push('Rendered using standard typography engine.');
        }
        return {
          originalName: name,
          outputName: `${baseName}.pdf`,
          buffer: pdfBuffer,
          success: true,
          warnings,
        };
      }

      case 'docx-to-md': {
        const { markdown, warnings: docxWarnings } = await convertDocxToMarkdown(buffer);
        return {
          originalName: name,
          outputName: `${baseName}.md`,
          buffer: Buffer.from(markdown, 'utf-8'),
          text: markdown,
          success: true,
          warnings: [...warnings, ...docxWarnings],
        };
      }

      case 'pdf-to-md': {
        const { markdown, warnings: pdfWarnings } = await convertPdfToMarkdown(buffer);
        return {
          originalName: name,
          outputName: `${baseName}.md`,
          buffer: Buffer.from(markdown, 'utf-8'),
          text: markdown,
          success: true,
          warnings: [...warnings, ...pdfWarnings],
        };
      }

      default:
        throw new Error(`Unsupported conversion direction: ${direction}`);
    }
  } catch (err: any) {
    return {
      originalName: name,
      outputName: `${baseName}.failed`,
      success: false,
      warnings,
      error: err?.message || 'Conversion failed',
    };
  }
}

export async function createZipArchive(files: { name: string; buffer: Buffer }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.on('error', (err) => reject(err));
    stream.on('finish', () => resolve(Buffer.concat(chunks)));

    archive.pipe(stream);

    for (const file of files) {
      archive.append(file.buffer, { name: file.name });
    }

    archive.finalize();
  });
}
