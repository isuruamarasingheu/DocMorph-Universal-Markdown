import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer-core';
import PDFDocument from 'pdfkit';
import { marked } from 'marked';
import { findSystemBrowser } from './puppeteer-helper';
import { generateHtmlDocument, parseMarkdownToHtml } from './styles';

export interface PdfOptions {
  title?: string;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
}

/**
 * High-fidelity PDF generation via headless Chrome / Edge
 */
async function convertViaPuppeteer(
  html: string,
  title: string,
  options: PdfOptions
): Promise<Buffer> {
  const browserPath = findSystemBrowser();
  if (!browserPath) {
    throw new Error('No system Chrome or Edge browser found');
  }

  // Create isolated temporary user data directory to prevent multi-process locks
  const uniqueId = `puppeteer_pdf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tempProfileDir = path.join(os.tmpdir(), uniqueId);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: browserPath,
      userDataDir: tempProfileDir,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--no-first-run',
      ],
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    const pdfUint8 = await page.pdf({
      format: 'A4',
      margin: {
        top: options.margin?.top || '20mm',
        right: options.margin?.right || '18mm',
        bottom: options.margin?.bottom || '22mm',
        left: options.margin?.left || '18mm',
      },
      printBackground: options.printBackground ?? true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size: 8pt; color: #8c959f; width: 100%; padding: 0 18mm; display: flex; justify-content: space-between;">
        <span>${escapeXml(title)}</span>
        <span></span>
      </div>`,
      footerTemplate: `<div style="font-size: 8pt; color: #8c959f; width: 100%; padding: 0 18mm; display: flex; justify-content: space-between;">
        <span>Markdown Converter</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`,
    });

    return Buffer.from(pdfUint8);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    // Clean up temp profile dir asynchronously
    fs.rm(tempProfileDir, { recursive: true, force: true }, () => {});
  }
}

/**
 * Resilient pure-Node fallback generator using PDFKit
 */
function convertViaPdfKit(markdown: string, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: title,
          Author: 'Markdown Converter',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const tokens = marked.lexer(markdown);

      for (const token of tokens) {
        if (token.type === 'heading') {
          const fontSize = Math.max(12, 26 - token.depth * 3);
          doc.moveDown(0.8);
          doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#1e293b').text(token.text);
          doc.moveDown(0.3);
        } else if (token.type === 'paragraph') {
          doc.font('Helvetica').fontSize(10.5).fillColor('#334155').text(token.text, {
            align: 'justify',
            lineGap: 3,
          });
          doc.moveDown(0.5);
        } else if (token.type === 'list') {
          for (let i = 0; i < token.items.length; i++) {
            const item = token.items[i];
            const prefix = token.ordered ? `${i + 1}. ` : '• ';
            doc.font('Helvetica').fontSize(10.5).fillColor('#334155').text(`${prefix}${item.text}`, {
              indent: 15,
              lineGap: 2,
            });
          }
          doc.moveDown(0.5);
        } else if (token.type === 'code') {
          doc.moveDown(0.4);
          doc.font('Courier').fontSize(9.5).fillColor('#0f172a');
          const codeLines = token.text.split('\n');
          for (const line of codeLines) {
            doc.text(line, { indent: 10 });
          }
          doc.font('Helvetica').fontSize(10.5).fillColor('#334155');
          doc.moveDown(0.5);
        } else if (token.type === 'blockquote') {
          doc.moveDown(0.4);
          doc.font('Helvetica-Oblique').fontSize(10).fillColor('#64748b').text(token.text, {
            indent: 20,
          });
          doc.moveDown(0.4);
        } else if (token.type === 'hr') {
          doc.moveDown(0.5);
          doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
          doc.moveDown(0.8);
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function convertMarkdownToPdf(
  markdown: string,
  options: PdfOptions = {}
): Promise<{ buffer: Buffer; engine: 'puppeteer' | 'pdfkit' }> {
  const title = options.title || 'Converted Document';
  const htmlBody = parseMarkdownToHtml(markdown);
  const fullHtml = generateHtmlDocument(htmlBody, title);

  // Attempt Puppeteer first for publication-grade formatting
  try {
    const buffer = await convertViaPuppeteer(fullHtml, title, options);
    return { buffer, engine: 'puppeteer' };
  } catch (puppeteerErr: any) {
    console.warn('Puppeteer conversion unavailable or failed, using PDFKit fallback:', puppeteerErr?.message);
    const buffer = await convertViaPdfKit(markdown, title);
    return { buffer, engine: 'pdfkit' };
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
