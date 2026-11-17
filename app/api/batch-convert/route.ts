import { NextRequest, NextResponse } from 'next/server';
import { processSingleFile, createZipArchive } from '@/lib/converters/batch';
import { ConversionDirection, ExportSettings } from '@/lib/types';
import {
  MAX_BATCH_FILES,
  MAX_BATCH_REQUEST_SIZE,
  MAX_FILE_SIZE,
  fileTooLargeResponse,
  rejectIfTooLarge,
} from '@/lib/limits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const tooLarge = rejectIfTooLarge(req, MAX_BATCH_REQUEST_SIZE);
  if (tooLarge) return tooLarge;

  try {
    const formData = await req.formData();
    const files = formData.getAll('files').filter((f): f is File => typeof f !== 'string');
    const defaultDirection = (formData.get('direction') as ConversionDirection) || 'md-to-docx';

    let settings: ExportSettings = {};
    const rawSettings = formData.get('settings');
    if (typeof rawSettings === 'string' && rawSettings) {
      try {
        settings = JSON.parse(rawSettings);
      } catch {}
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided for batch conversion' },
        { status: 400 }
      );
    }

    if (files.length > MAX_BATCH_FILES) {
      return NextResponse.json(
        { success: false, error: `Batch conversion supports up to ${MAX_BATCH_FILES} files per request` },
        { status: 400 }
      );
    }

    const oversized = files.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      return fileTooLargeResponse(oversized.size, sanitizeFileName(oversized.name));
    }

    const results = [];
    const zipEntries: { name: string; buffer: Buffer }[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = sanitizeFileName(file.name);
      const directionOverride = formData.get(`direction_${i}`) as ConversionDirection;
      const direction = directionOverride || detectDirectionFromName(safeName) || defaultDirection;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await processSingleFile(safeName, buffer, direction, settings);
      const outputName = uniqueName(result.outputName, usedNames);
      results.push({
        originalName: result.originalName,
        outputName,
        success: result.success,
        warnings: result.warnings,
        error: result.error,
        size: result.buffer?.length || 0,
        text: result.text,
        dataBase64: result.buffer ? result.buffer.toString('base64') : undefined,
      });

      if (result.success && result.buffer) {
        zipEntries.push({
          name: outputName,
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

/** Strips path components and unsafe characters so names are safe as ZIP entries. */
function sanitizeFileName(name: string): string {
  const base = (name || '').split(/[\\/]/).pop() || '';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '').substring(0, 100);
  return cleaned || 'document';
}

/** Appends _2, _3, ... before the extension when a name is already taken (case-insensitive). */
function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name.toLowerCase())) {
    used.add(name.toLowerCase());
    return name;
  }
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 2;
  while (used.has(`${stem}_${n}${ext}`.toLowerCase())) n++;
  const candidate = `${stem}_${n}${ext}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

function detectDirectionFromName(name: string): ConversionDirection | null {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'md' || ext === 'markdown') return 'md-to-docx';
  if (ext === 'docx') return 'docx-to-md';
  if (ext === 'pdf') return 'pdf-to-md';
  return null;
}
