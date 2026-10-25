import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer-core';
import PDFDocument from 'pdfkit';
import { marked } from 'marked';
import { findSystemBrowser } from './puppeteer-helper';
import { generateHtmlDocument, parseMarkdownToHtml, DocumentStyleOptions } from './styles';
import { ExportSettings } from '../types';

export interface PdfOptions extends ExportSettings {
  title?: string;
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

    const marginPresets = {
      compact: { top: '12mm', right: '10mm', bottom: '14mm', left: '10mm' },
      normal: { top: '20mm', right: '18mm', bottom: '22mm', left: '18mm' },
      wide: { top: '30mm', right: '26mm', bottom: '32mm', left: '26mm' },
    };

    const margin = marginPresets[options.margin || 'normal'] || marginPresets.normal;
    const isLandscape = options.orientation === 'landscape';
    const showHeader = options.showHeader ?? true;
    const showFooter = options.showPageNumbers ?? true;

    const pdfUint8 = await page.pdf({
      format: (options.pageSize || 'A4') as any,
      landscape: isLandscape,
      margin,
      printBackground: options.printBackground ?? true,
      displayHeaderFooter: showHeader || showFooter,
      headerTemplate: showHeader
        ? `<div style="font-size: 8pt; color: #8c959f; width: 100%; padding: 0 18mm; display: flex; justify-content: space-between;">
            <span>${escapeXml(title)}</span>
            <span></span>
          </div>`
        : '<div></div>',
      footerTemplate: showFooter
        ? `<div style="font-size: 8pt; color: #8c959f; width: 100%; padding: 0 18mm; display: flex; justify-content: space-between;">
            <span>DocMorph Universal Engine</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>`
        : '<div></div>',
    });

    return Buffer.from(pdfUint8);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    fs.rm(tempProfileDir, { recursive: true, force: true }, () => {});
  }
}

/**
 * Resilient pure-Node fallback generator using PDFKit
 */
function convertViaPdfKit(markdown: string, title: string, options: PdfOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const isLandscape = options.orientation === 'landscape';
      const doc = new PDFDocument({
        size: (options.pageSize || 'A4') as any,
        layout: isLandscape ? 'landscape' : 'portrait',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: title,
          Author: 'DocMorph Converter',
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
          doc.font('Helvetica').fontSize(options.fontSize || 10.5).fillColor('#334155').text(token.text, {
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
  const styleOptions: DocumentStyleOptions = {
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    margin: options.margin,
    pageSize: options.pageSize,
    landscape: options.orientation === 'landscape',
  };
  const fullHtml = generateHtmlDocument(htmlBody, title, styleOptions);

  try {
    const buffer = await convertViaPuppeteer(fullHtml, title, options);
    return { buffer, engine: 'puppeteer' };
  } catch (puppeteerErr: any) {
    console.warn('Puppeteer conversion unavailable or failed, using PDFKit fallback:', puppeteerErr?.message);
    const buffer = await convertViaPdfKit(markdown, title, options);
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
