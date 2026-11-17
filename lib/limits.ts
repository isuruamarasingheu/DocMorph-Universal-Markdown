import { NextRequest, NextResponse } from 'next/server';

/** Maximum size of a single input document. */
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/** Maximum number of files in one batch request. */
export const MAX_BATCH_FILES = 20;

/** Maximum total request body for a batch request. */
export const MAX_BATCH_REQUEST_SIZE = 100 * 1024 * 1024; // 100 MB

/**
 * Overhead allowed on top of the document size for multipart boundaries, JSON
 * wrapping and base64 expansion (4/3).
 */
export const MAX_SINGLE_REQUEST_SIZE = Math.ceil(MAX_FILE_SIZE * 4 / 3) + 1024 * 1024;

export function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/**
 * Rejects a request up front, before its body is read, when the declared
 * Content-Length exceeds `maxBytes`. Returns null when the request may proceed.
 * Bodies without a Content-Length are still checked after parsing.
 */
export function rejectIfTooLarge(req: NextRequest, maxBytes: number): NextResponse | null {
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return NextResponse.json(
      { success: false, error: `Request body too large (${formatMb(declared)}; limit ${formatMb(maxBytes)})` },
      { status: 413 }
    );
  }
  return null;
}

export function fileTooLargeResponse(size: number, name?: string): NextResponse {
  const label = name ? `"${name}" ` : '';
  return NextResponse.json(
    { success: false, error: `File ${label}exceeds maximum limit of 25MB (size: ${formatMb(size)})` },
    { status: 413 }
  );
}
