import { NextRequest, NextResponse } from 'next/server';
import { convertMarkdownToDocx } from '@/lib/converters/md-to-docx';
import { convertMarkdownToPdf } from '@/lib/converters/md-to-pdf';
import { convertDocxToMarkdown } from '@/lib/converters/docx-to-md';
import { convertPdfToMarkdown } from '@/lib/converters/pdf-to-md';
import { ConversionDirection, ExportSettings } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const contentType = req.headers.get('content-type') || '';

    let direction: ConversionDirection;
    let inputBuffer: Buffer;
    let originalName = 'document';
    let settings: ExportSettings = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      direction = formData.get('direction') as ConversionDirection;

      const rawSettings = formData.get('settings') as string | null;
      if (rawSettings) {
        try {
          settings = JSON.parse(rawSettings);
        } catch {}
      }

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file uploaded' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File exceeds maximum limit of 25MB (size: ${(file.size / 1024 / 1024).toFixed(1)}MB)` },
          { status: 413 }
        );
      }

      originalName = sanitizeFileName(file.name || 'document');
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      direction = body.direction;
      const text = body.text || '';
      originalName = sanitizeFileName(body.fileName || 'document.md');
      settings = body.settings || {};

      if (!text && !body.base64) {
        return NextResponse.json(
          { success: false, error: 'No text or content provided' },
          { status: 400 }
        );
      }

      if (body.base64) {
        inputBuffer = Buffer.from(body.base64, 'base64');
      } else {
        inputBuffer = Buffer.from(text, 'utf-8');
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported Content-Type. Use multipart/form-data or application/json' },
        { status: 415 }
      );
    }

    if (!direction) {
      return NextResponse.json(
        { success: false, error: 'Conversion direction must be specified' },
        { status: 400 }
      );
    }

    const baseName = originalName.replace(/\.[^/.]+$/, '');
    let outputBuffer: Buffer;
    let outputFileName: string;
    let mimeType: string;
    const warnings: string[] = [];
    let textResult: string | undefined;
    let ocrUsed: boolean | undefined = false;

    switch (direction) {
      case 'md-to-docx': {
        const mdText = inputBuffer.toString('utf-8');
        const { margin: _m, ...docxSettings } = settings;
        outputBuffer = await convertMarkdownToDocx(mdText, { title: baseName, ...docxSettings });
        outputFileName = `${baseName}.docx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      }

      case 'md-to-pdf': {
        const mdText = inputBuffer.toString('utf-8');
        const { buffer: pdfBuf, engine } = await convertMarkdownToPdf(mdText, { title: baseName, ...settings });
        outputBuffer = pdfBuf;
        outputFileName = `${baseName}.pdf`;
        mimeType = 'application/pdf';
        if (engine === 'pdfkit') {
          warnings.push('Generated using standard layout engine.');
        }
        break;
      }

      case 'docx-to-md': {
        const { markdown, warnings: docxWarnings } = await convertDocxToMarkdown(inputBuffer);
        outputBuffer = Buffer.from(markdown, 'utf-8');
        outputFileName = `${baseName}.md`;
        mimeType = 'text/markdown; charset=utf-8';
        textResult = markdown;
        warnings.push(...docxWarnings);
        break;
      }

      case 'docx-to-pdf': {
        const { markdown, warnings: docxWarnings } = await convertDocxToMarkdown(inputBuffer);
        const { buffer: pdfBuf, engine } = await convertMarkdownToPdf(markdown, { title: baseName, ...settings });
        outputBuffer = pdfBuf;
        outputFileName = `${baseName}.pdf`;
        mimeType = 'application/pdf';
        textResult = markdown;
        if (engine === 'pdfkit') {
          warnings.push('Generated using standard layout engine.');
        }
        warnings.push(...docxWarnings);
        break;
      }

      case 'pdf-to-md': {
        const { markdown, warnings: pdfWarnings, ocrUsed: wasOcr } = await convertPdfToMarkdown(inputBuffer, {
          autoOcr: settings.autoOcr ?? true,
          ocrLanguage: settings.ocrLanguage || 'eng',
        });
        outputBuffer = Buffer.from(markdown, 'utf-8');
        outputFileName = `${baseName}.md`;
        mimeType = 'text/markdown; charset=utf-8';
        textResult = markdown;
        ocrUsed = wasOcr;
        warnings.push(...pdfWarnings);
        break;
      }

      case 'pdf-to-docx': {
        const { markdown, warnings: pdfWarnings, ocrUsed: wasOcr } = await convertPdfToMarkdown(inputBuffer, {
          autoOcr: settings.autoOcr ?? true,
          ocrLanguage: settings.ocrLanguage || 'eng',
        });
        const { margin: _m, ...docxSettings } = settings;
        outputBuffer = await convertMarkdownToDocx(markdown, { title: baseName, ...docxSettings });
        outputFileName = `${baseName}.docx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        textResult = markdown;
        ocrUsed = wasOcr;
        warnings.push(...pdfWarnings);
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Invalid conversion direction: ${direction}` },
          { status: 400 }
        );
    }

    const durationMs = Date.now() - startTime;
    const isDirectDownload = req.nextUrl.searchParams.get('download') === 'true';

    if (isDirectDownload) {
      return new NextResponse(outputBuffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(outputFileName)}"`,
          'Content-Length': outputBuffer.length.toString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      fileName: outputFileName,
      mimeType,
      dataBase64: outputBuffer.toString('base64'),
      text: textResult,
      ocrUsed,
      warnings: warnings.length > 0 ? warnings : undefined,
      stats: {
        inputBytes: inputBuffer.length,
        outputBytes: outputBuffer.length,
        durationMs,
      },
    });
  } catch (error: any) {
    console.error('Conversion endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred during conversion.',
      },
      { status: 500 }
    );
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100) || 'document';
}
