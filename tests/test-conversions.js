const { convertMarkdownToDocx } = require('../lib/converters/md-to-docx');
const { convertMarkdownToPdf } = require('../lib/converters/md-to-pdf');
const { convertDocxToMarkdown } = require('../lib/converters/docx-to-md');
const { convertPdfToMarkdown } = require('../lib/converters/pdf-to-md');
const { createZipArchive } = require('../lib/converters/batch');
const assert = require('assert');

const SAMPLE_MD = `# High-Performance Distributed Architecture
**Version:** 1.0.0

## Executive Overview
This document evaluates distributed event stores and reactive messaging backplanes.

> **Key Architecture Principle:** Stateless services with event-driven data hydration.

### System Topology

| Tier | Technology | Replicas | SLA |
| :--- | :--- | :---: | :--- |
| Gateway | Envoy | 4 | 99.99% |
| App Server | Node.js | 8 | 99.95% |
| Persistence | Postgres | 2 | 99.999% |

### Key Deliverables
- Deploy containerized clusters
- Configure TLS 1.3 encryption
- Run latency benchmarks

\`\`\`typescript
export function computeThroughput(events: number, seconds: number): number {
  return Math.round(events / seconds);
}
\`\`\`

---
*End of Report*
`;

async function runTests() {
  console.log('🚀 Starting Comprehensive Conversion Pipeline Tests...\n');

  // Test 1: Markdown -> DOCX
  console.log('1️⃣ Testing Markdown to DOCX...');
  const docxBuffer = await convertMarkdownToDocx(SAMPLE_MD, { title: 'Test Architecture' });
  assert(Buffer.isBuffer(docxBuffer), 'DOCX result must be a Buffer');
  assert(docxBuffer.length > 5000, `DOCX size seems too small: ${docxBuffer.length} bytes`);
  // Check ZIP signature (PK\x03\x04)
  assert(docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4b, 'DOCX must start with PK zip header');
  console.log(`   ✅ Markdown to DOCX succeeded (${docxBuffer.length} bytes, valid DOCX archive)\n`);

  // Test 2: DOCX -> Markdown (Reverse conversion)
  console.log('2️⃣ Testing DOCX to Markdown (Reverse)...');
  const docxToMdResult = await convertDocxToMarkdown(docxBuffer);
  assert(docxToMdResult.markdown, 'Extracted Markdown must not be empty');
  assert(docxToMdResult.markdown.includes('Distributed Architecture'), 'Must preserve title heading');
  assert(docxToMdResult.markdown.includes('Executive Overview'), 'Must preserve H2 heading');
  assert(docxToMdResult.markdown.includes('Envoy') || docxToMdResult.markdown.includes('Node.js'), 'Must preserve table data');
  console.log(`   ✅ DOCX to Markdown succeeded (Extracted ${docxToMdResult.markdown.length} chars)`);
  if (docxToMdResult.warnings.length) {
    console.log(`   ℹ️ Warnings: ${docxToMdResult.warnings.join('; ')}`);
  }
  console.log();

  // Test 3: Markdown -> PDF
  console.log('3️⃣ Testing Markdown to PDF...');
  const { buffer: pdfBuffer, engine } = await convertMarkdownToPdf(SAMPLE_MD, { title: 'Test PDF' });
  assert(Buffer.isBuffer(pdfBuffer), 'PDF result must be a Buffer');
  assert(pdfBuffer.length > 1000, `PDF size seems too small: ${pdfBuffer.length} bytes`);
  const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
  assert(pdfHeader.startsWith('%PDF-'), `PDF must start with %PDF- header, got: ${pdfHeader}`);
  console.log(`   ✅ Markdown to PDF succeeded (${pdfBuffer.length} bytes, engine: ${engine})\n`);

  // Test 4: PDF -> Markdown (Reverse conversion)
  console.log('4️⃣ Testing PDF to Markdown (Reverse)...');
  const pdfToMdResult = await convertPdfToMarkdown(pdfBuffer);
  assert(pdfToMdResult.markdown, 'PDF-to-MD text must not be empty');
  assert(pdfToMdResult.pageCount >= 1, 'Must detect at least 1 page');
  console.log(`   ✅ PDF to Markdown succeeded (${pdfToMdResult.markdown.length} chars, ${pdfToMdResult.pageCount} page(s))`);
  console.log(`   ℹ️ Density: ${pdfToMdResult.stats.densityPerPage} chars/page, Words: ${pdfToMdResult.stats.wordCount}\n`);

  // Test 5: Scanned PDF / Empty Detection
  console.log('5️⃣ Testing Scanned / Low-Density PDF Warning Detection...');
  const { buffer: blankPdfBuffer } = await convertMarkdownToPdf(' ', { title: 'Blank Document' });
  const scannedResult = await convertPdfToMarkdown(blankPdfBuffer);
  assert(scannedResult.stats.isScannedOrEmpty, 'Must flag scanned/empty document');
  assert(scannedResult.warnings.some((w) => w.toLowerCase().includes('scanned')), 'Must produce scanned PDF warning');
  console.log(`   ✅ Scanned / Empty PDF warning triggered successfully:\n   ⚠️  ${scannedResult.warnings[0]}\n`);

  // Test 6: Batch ZIP Packaging
  console.log('6️⃣ Testing Batch ZIP Packaging...');
  const zipBuffer = await createZipArchive([
    { name: 'document.docx', buffer: docxBuffer },
    { name: 'document.pdf', buffer: pdfBuffer },
    { name: 'document.md', buffer: Buffer.from(docxToMdResult.markdown, 'utf-8') },
  ]);
  assert(Buffer.isBuffer(zipBuffer), 'ZIP result must be a Buffer');
  assert(zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4b, 'ZIP must start with PK header');
  console.log(`   ✅ Batch ZIP packaging succeeded (${zipBuffer.length} bytes, bundled 3 documents)\n`);

  console.log('🎉 ALL 6 TEST SUITES PASSED FLAWLESSLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
