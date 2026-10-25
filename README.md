# DocMorph - Universal Document Converter

A modern, production-grade web application for high-fidelity bidirectional conversion between **Markdown**, **Microsoft Word (DOCX)**, and **PDF** formats.

---

## 🌟 Core Features

- **Bidirectional Conversions**:
  1. **Markdown ➔ DOCX**: Converts headings (H1-H6), styled tables, syntax-highlighted code blocks, blockquotes, and lists into native Word styling with custom margins and page headers/footers.
  2. **Markdown ➔ PDF**: Publication-grade vector PDF rendering driven by headless Chrome/Edge via Puppeteer (with a fallback engine), complete with GitHub typography and syntax highlighting.
  3. **DOCX ➔ Markdown (Reverse)**: Extracts semantic HTML, tables, and images from Word files via Mammoth, translating into clean GitHub Flavored Markdown (GFM).
  4. **PDF ➔ Markdown (Reverse)**: Analyzes document structure to detect headings, lists, tables, and paragraphs. Includes automatic detection of scanned or image-only PDFs with warnings.
- **Interactive Markdown Studio**:
  - Live split-view editor and synchronized real-time preview.
  - Markdown formatting toolbar (bold, italic, strikethrough, headings, lists, tables, quotes, code blocks).
  - Word counter, character counter, estimated reading time, and page estimation.
  - One-click sample document loaders (Technical Spec, Strategy Review).
- **Batch Processing & Single Converter**:
  - Drag-and-drop zone with multi-file support (up to 25MB each).
  - Auto-detection of target format with manual per-file override.
  - Individual progress indicators, status badges, and download buttons.
  - Consolidated one-click **Batch ZIP Archive** download.
  - In-app **Markdown Preview Modal** with syntax highlighting and instant clipboard copy.
- **Modern UI & UX**:
  - Light and Dark modes with smooth transitions and persistent settings.
  - Fully responsive design across desktop, tablet, and mobile.
  - Informative error banners, file validation, and scanned-document warnings.
- **Privacy & Security**:
  - Ephemeral in-memory processing. User documents are never stored permanently on disk.

---

## 🏗️ Architecture & Tech Stack Rationale

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) + React 18 | Unified full-stack architecture, optimized TypeScript bundling, serverless route handlers, and zero-CORS overhead. |
| **Language** | TypeScript 5.4 | Type safety across conversion ASTs, buffers, streams, and API contracts. |
| **Styling** | Tailwind CSS 3.4 | Atomic CSS utility classes, native dark mode support, fluid responsive design. |
| **Icons** | Lucide React | Consistent, lightweight SVG iconography. |
| **Markdown Parser** | `marked` + `highlight.js` | Fast GFM parsing and syntax highlighting across 180+ languages. |
| **Word Generator** | `html-to-docx` | Generates DOCX files with custom tables, font styles, and page margins without external binaries. |
| **Word Parser** | `mammoth` + `turndown` | Mammoth converts DOCX to semantic HTML, and Turndown converts HTML into clean GitHub Flavored Markdown. |
| **PDF Engine** | `puppeteer-core` + `pdfkit` | Puppeteer leverages installed Chrome/Edge for vector PDF print layout; PDFKit provides an in-process fallback. |
| **PDF Extraction** | `pdf-parse` | Extracts structured text, layout density, and page geometry with heuristic analysis for headings and tables. |
| **Archive Utility** | `archiver` | Streams multi-file batch conversions into ZIP archives. |

---

## 📁 Project Structure

```
md-converter/
├── app/
│   ├── api/
│   │   ├── convert/route.ts         # Single file & direct text conversion endpoint
│   │   ├── batch-convert/route.ts   # Multi-file batch processing & ZIP bundling
│   │   └── preview/route.ts         # Live Markdown preview rendering endpoint
│   ├── globals.css                  # Tailwind styles & Markdown typography
│   ├── layout.tsx                   # Root HTML layout with dark mode
│   └── page.tsx                     # Main application interface
├── components/
│   ├── FileConverter.tsx            # Drag-and-drop file upload & batch queue
│   ├── MarkdownStudio.tsx           # Split-view live Markdown editor & exporter
│   ├── Navbar.tsx                   # Top navigation & format badges
│   ├── PreviewModal.tsx             # Modal for previewing extracted Markdown
│   └── ThemeToggle.tsx              # Light / Dark mode switcher
├── lib/
│   ├── converters/
│   │   ├── batch.ts                 # Batch conversion & ZIP archive packager
│   │   ├── docx-to-md.ts            # Mammoth + Turndown DOCX parser
│   │   ├── md-to-docx.ts            # Markdown to styled Word document engine
│   │   ├── md-to-pdf.ts             # Headless Chrome vector PDF generator
│   │   ├── pdf-to-md.ts             # PDF text parser & structure detector
│   │   ├── puppeteer-helper.ts      # Multi-platform browser discovery
│   │   └── styles.ts                # Print CSS, typography & highlight.js integration
│   ├── sample-docs.ts               # Pre-loaded document templates
│   └── types.ts                     # TypeScript interfaces and conversion types
├── tests/
│   └── test-conversions.js          # Comprehensive end-to-end integration test suite
├── types/
│   └── declarations.d.ts            # Module declarations for untyped libraries
├── Dockerfile                       # Production multi-stage container build
├── next.config.mjs                  # Next.js configuration & server external packages
├── tailwind.config.js               # Tailwind design system configuration
├── tsconfig.json                    # TypeScript compiler configuration
└── package.json                     # Project manifest and scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** or **pnpm**
- **Google Chrome** or **Microsoft Edge** installed on the host system (for PDF vector rendering)

### 1. Installation

Clone or extract the repository, then install dependencies:

```bash
npm install
```

### 2. Running the Development Server

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 3. Running Integration Tests

To run the pipeline test suite:

```bash
npx tsx tests/test-conversions.js
```

---

## 📦 Production Deployment

### Option A: Standard Node.js Server

1. Build the production application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

### Option B: Docker Container

A multi-stage `Dockerfile` is included with Alpine Linux and headless Chromium:

1. Build the container:
   ```bash
   docker build -t docmorph:latest .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 --rm docmorph:latest
   ```

Access the app at `http://localhost:3000`.

---

## 🔒 Security & Performance Features

- **Strict File Sanitization**: Input file names are sanitized to prevent directory traversal attacks.
- **Payload Limits**: Rejects requests exceeding 25MB per file to prevent Denial of Service (DoS).
- **Ephemeral Processing**: Conversion buffers are kept in memory and never written to permanent disk storage.
- **Isolated Browser Profiles**: Headless browser instances generate isolated temporary user data directories and destroy them immediately after rendering.
