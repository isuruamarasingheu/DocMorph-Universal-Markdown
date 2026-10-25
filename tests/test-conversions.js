const { convertMarkdownToDocx } = require('../lib/converters/md-to-docx');
const { convertMarkdownToPdf } = require('../lib/converters/md-to-pdf');
const { convertDocxToMarkdown } = require('../lib/converters/docx-to-md');
const { convertPdfToMarkdown } = require('../lib/converters/pdf-to-md');
const { processSingleFile, createZipArchive } = require('../lib/converters/batch');
const assert = require('assert');

const SAMPLE_MD = `# High-Performance Distributed Architecture
**Version:** 2.0.0

## Executive Overview
This document evaluates distributed event stores and reactive messaging backplanes.

> **Key Architecture Principle:** Stateless services with event-driven data hydration.

### System Topology

| Tier | Technology | Replicas | SLA |
| :--- | :--- | :---: | :--- |
| Gateway | Envoy | 4 | 99.99% |
| App Server | Node.js | 8 | 99.95% |
| Persistence | Postgres | 2 | 99.999% |

\`\`\`typescript
export function computeThroughput(events: number, seconds: number): number {
  return Math.round(events / seconds);
}
\`\`\`

---
*End of Report*
`;

async function runTests() {
  console.log('🚀 Running Comprehensive Test Suite (Core + High Impact Features)...\n');

  // Test 1: Markdown -> DOCX
  console.log('1️⃣ Testing Markdown to DOCX...');
  const docxBuffer = await convertMarkdownToDocx(SAMPLE_MD, { title: 'Test Architecture', docxMargin: 'compact' });
  assert(Buffer.isBuffer(docxBuffer), 'DOCX result must be a Buffer');
  assert(docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4b, 'DOCX must start with PK zip header');
  console.log(`   ✅ Markdown to DOCX succeeded (${docxBuffer.length} bytes)\n`);

  // Test 2: DOCX -> Markdown (Reverse)
  console.log('2️⃣ Testing DOCX to Markdown (Reverse)...');
  const docxToMdResult = await convertDocxToMarkdown(docxBuffer);
  assert(docxToMdResult.markdown.includes('Distributed Architecture'), 'Must preserve title heading');
  console.log(`   ✅ DOCX to Markdown succeeded (${docxToMdResult.markdown.length} chars)\n`);

  // Test 3: Markdown -> PDF with Custom Export Settings
  console.log('3️⃣ Testing Markdown to PDF with Custom Settings (Landscape, Margin, PageSize)...');
  const { buffer: pdfBuffer, engine } = await convertMarkdownToPdf(SAMPLE_MD, {
    title: 'Test Landscape PDF',
    orientation: 'landscape',
    pageSize: 'Letter',
    margin: 'compact',
    showPageNumbers: true,
  });
  assert(Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 1000);
  assert(pdfBuffer.slice(0, 5).toString('ascii').startsWith('%PDF-'));
  console.log(`   ✅ Markdown to PDF succeeded (${pdfBuffer.length} bytes, engine: ${engine})\n`);

  // Test 4: PDF -> Markdown (Reverse)
  console.log('4️⃣ Testing PDF to Markdown (Reverse)...');
  const pdfToMdResult = await convertPdfToMarkdown(pdfBuffer);
  assert(pdfToMdResult.markdown.length > 50, 'PDF text must be extracted');
  console.log(`   ✅ PDF to Markdown succeeded (${pdfToMdResult.markdown.length} chars)\n`);

  // Test 5: Cross-Format 360: DOCX -> PDF
  console.log('5️⃣ Testing Cross-Format 360: DOCX ➔ PDF...');
  const docxToPdfResult = await processSingleFile('spec.docx', docxBuffer, 'docx-to-pdf');
  assert(docxToPdfResult.success, 'DOCX to PDF must succeed');
  assert(docxToPdfResult.buffer && docxToPdfResult.outputName.endsWith('.pdf'));
  console.log(`   ✅ DOCX ➔ PDF succeeded (${docxToPdfResult.buffer.length} bytes, output: ${docxToPdfResult.outputName})\n`);

  // Test 6: Cross-Format 360: PDF -> DOCX
  console.log('6️⃣ Testing Cross-Format 360: PDF ➔ DOCX...');
  const pdfToDocxResult = await processSingleFile('spec.pdf', pdfBuffer, 'pdf-to-docx');
  assert(pdfToDocxResult.success, 'PDF to DOCX must succeed');
  assert(pdfToDocxResult.buffer && pdfToDocxResult.outputName.endsWith('.docx'));
  console.log(`   ✅ PDF ➔ DOCX succeeded (${pdfToDocxResult.buffer.length} bytes, output: ${pdfToDocxResult.outputName})\n`);

  // Test 7: Scanned PDF Detection & OCR Fallback Handler
  console.log('7️⃣ Testing Scanned / Low-Density PDF Detection...');
  const { buffer: blankPdfBuffer } = await convertMarkdownToPdf(' ', { title: 'Blank Document' });
  const scannedResult = await convertPdfToMarkdown(blankPdfBuffer, { autoOcr: true });
  assert(scannedResult.stats.isScannedOrEmpty, 'Must flag scanned document');
  console.log(`   ✅ Scanned document detection active. Notices: ${scannedResult.warnings.join(' | ')}\n`);

  // Test 8: Batch ZIP Packaging
  console.log('8️⃣ Testing Multi-Format Batch ZIP Packaging...');
  const zipBuffer = await createZipArchive([
    { name: docxToPdfResult.outputName, buffer: docxToPdfResult.buffer },
    { name: pdfToDocxResult.outputName, buffer: pdfToDocxResult.buffer },
    { name: 'document.md', buffer: Buffer.from(docxToMdResult.markdown, 'utf-8') },
  ]);
  assert(zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4b);
  console.log(`   ✅ Multi-Format Batch ZIP succeeded (${zipBuffer.length} bytes bundled)\n`);

  console.log('🎉 ALL 8 TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
