import { NextRequest, NextResponse } from 'next/server';
import { processSingleFile, createZipArchive } from '@/lib/converters/batch';
import { ConversionDirection } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const defaultDirection = (formData.get('direction') as ConversionDirection) || 'md-to-docx';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided for batch conversion' },
        { status: 400 }
      );
    }

    if (files.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Batch conversion supports up to 20 files per request' },
        { status: 400 }
      );
    }

    const results = [];
    const zipEntries: { name: string; buffer: Buffer }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const directionOverride = formData.get(`direction_${i}`) as ConversionDirection;
      const direction = directionOverride || detectDirectionFromName(file.name) || defaultDirection;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await processSingleFile(file.name, buffer, direction);
      results.push({
        originalName: result.originalName,
        outputName: result.outputName,
        success: result.success,
        warnings: result.warnings,
        error: result.error,
        size: result.buffer?.length || 0,
        text: result.text,
        dataBase64: result.buffer ? result.buffer.toString('base64') : undefined,
      });

      if (result.success && result.buffer) {
        zipEntries.push({
          name: result.outputName,
          buffer: result.buffer,
        });
      }
    }

    const downloadZip = req.nextUrl.searchParams.get('zip') === 'true';

    if (downloadZip && zipEntries.length > 0) {
      const zipBuffer = await createZipArchive(zipEntries);
      const zipName = `converted_documents_${new Date().toISOString().slice(0, 10)}.zip`;

      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${zipName}"`,
          'Content-Length': zipBuffer.length.toString(),
        },
      });
    }

    let zipBase64: string | undefined;
    if (zipEntries.length > 0) {
      const zipBuffer = await createZipArchive(zipEntries);
      zipBase64 = zipBuffer.toString('base64');
    }

    return NextResponse.json({
      success: true,
      total: files.length,
      successful: zipEntries.length,
      failed: files.length - zipEntries.length,
      results,
      zipBase64,
    });
  } catch (error: any) {
    console.error('Batch conversion error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Batch conversion failed' },
      { status: 500 }
    );
  }
}

function detectDirectionFromName(name: string): ConversionDirection | null {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'md' || ext === 'markdown') return 'md-to-docx';
  if (ext === 'docx') return 'docx-to-md';
  if (ext === 'pdf') return 'pdf-to-md';
  return null;
}
