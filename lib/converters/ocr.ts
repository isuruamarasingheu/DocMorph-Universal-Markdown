import { createWorker } from 'tesseract.js';
import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { findSystemBrowser } from './puppeteer-helper';

export interface OcrResult {
  text: string;
  confidence: number;
  pagesProcessed: number;
}

/**
 * Extracts raw JPEG images directly from the PDF byte stream if present (scanners typically store images as JPEGs)
 */
function extractJpegsFromPdf(pdfBuffer: Buffer): Buffer[] {
  const images: Buffer[] = [];
  const jpegStart = Buffer.from([0xff, 0xd8, 0xff]);
  const jpegEnd = Buffer.from([0xff, 0xd9]);

  let offset = 0;
  while (offset < pdfBuffer.length) {
    const startIndex = pdfBuffer.indexOf(jpegStart, offset);
    if (startIndex === -1) break;

    const endIndex = pdfBuffer.indexOf(jpegEnd, startIndex + 3);
    if (endIndex === -1) break;

    // Minimum sensible image size (5KB) to filter out icons or tiny thumbnail artifacts
    const imageSize = endIndex + 2 - startIndex;
    if (imageSize > 5000) {
      images.push(pdfBuffer.subarray(startIndex, endIndex + 2));
    }

    offset = endIndex + 2;
  }

  return images;
}

/**
 * Renders PDF pages to images using headless Chrome if available
 */
async function renderPdfPagesViaChrome(pdfBuffer: Buffer, maxPages: number = 5): Promise<Buffer[]> {
  const browserPath = findSystemBrowser();
  if (!browserPath) return [];

  const uniqueId = `ocr_render_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tempProfileDir = path.join(os.tmpdir(), uniqueId);
  const tempPdfPath = path.join(os.tmpdir(), `${uniqueId}.pdf`);

  let browser;
  try {
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    browser = await puppeteer.launch({
      executablePath: browserPath,
      userDataDir: tempProfileDir,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    // Navigate to local PDF file
    const fileUrl = `file://${tempPdfPath.replace(/\\/g, '/')}`;
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 15000 }).catch(() => {});

    // Allow PDF rendering engine to settle
    await new Promise((r) => setTimeout(r, 1000));

    const screenshot = await page.screenshot({ type: 'png', fullPage: false });
    return [Buffer.from(screenshot)];
  } catch (err) {
    console.warn('Chrome PDF rendering for OCR failed:', err);
    return [];
  } finally {
    if (browser) await browser.close().catch(() => {});
    fs.rm(tempProfileDir, { recursive: true, force: true }, () => {});
    fs.unlink(tempPdfPath, () => {});
  }
}

/**
 * Performs OCR recognition on a PDF buffer
 */
export async function performOcrOnPdf(
  pdfBuffer: Buffer,
  language: string = 'eng'
): Promise<OcrResult> {
  // 1. Try extracting direct scanned images from the PDF stream
  let imageBuffers = extractJpegsFromPdf(pdfBuffer);

  // 2. If no direct JPEGs found, try rendering via headless browser
  if (imageBuffers.length === 0) {
    imageBuffers = await renderPdfPagesViaChrome(pdfBuffer);
  }

  if (imageBuffers.length === 0) {
    throw new Error('Could not extract image layers from this PDF for OCR processing.');
  }

  // Initialize Tesseract worker
  const worker = await createWorker(language);

  try {
    let combinedText = '';
    let totalConfidence = 0;
    let count = 0;

    for (let i = 0; i < Math.min(imageBuffers.length, 10); i++) {
      const img = imageBuffers[i];
      const ret = await worker.recognize(img);
      if (ret.data.text && ret.data.text.trim()) {
        combinedText += `\n\n### Page ${i + 1} (OCR Extracted)\n\n${ret.data.text.trim()}`;
        totalConfidence += ret.data.confidence || 75;
        count++;
      }
    }

    const avgConfidence = count > 0 ? Math.round(totalConfidence / count) : 0;

    return {
      text: combinedText.trim(),
      confidence: avgConfidence,
      pagesProcessed: count,
    };
  } finally {
    await worker.terminate();
  }
}
