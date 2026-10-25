# DocMorph — Technical Specification & Architecture Manual

> **Universal 360° Document Transformation Engine & OCR Pipeline**  
> Bidirectional high-fidelity conversion between **Markdown (GFM)**, **Microsoft Word (.docx)**, and **PDF** formats with structural fidelity, customizable layout controls, and embedded Tesseract OCR.

---

## 📑 Table of Contents

- [1. Executive System Architecture](#1-executive-system-architecture)
- [2. 360° Conversion Matrix](#2-360-conversion-matrix)
- [3. Engine Technical Deep-Dives](#3-engine-technical-deep-dives)
  - [3.1 Markdown ➔ DOCX Engine](#31-markdown--docx-engine)
  - [3.2 Markdown ➔ PDF Vector Engine](#32-markdown--pdf-vector-engine)
  - [3.3 DOCX ➔ Markdown Reverse Engine](#33-docx--markdown-reverse-engine)
  - [3.4 PDF ➔ Markdown Reverse Engine](#34-pdf--markdown-reverse-engine)
  - [3.5 Optical Character Recognition (OCR) Engine](#35-optical-character-recognition-ocr-engine)
  - [3.6 Intermediate Cross-Format Pipelines](#36-intermediate-cross-format-pipelines)
- [4. REST API Specification](#4-rest-api-specification)
  - [4.1 Single Conversion Endpoint (`POST /api/convert`)](#41-single-conversion-endpoint-post-apiconvert)
  - [4.2 Batch Conversion Endpoint (`POST /api/batch-convert`)](#42-batch-conversion-endpoint-post-apibatch-convert)
  - [4.3 AST Preview Endpoint (`POST /api/preview`)](#43-ast-preview-endpoint-post-apipreview)
- [5. Frontend Architecture & UI Design System](#5-frontend-architecture--ui-design-system)
  - [5.1 Glassmorphic Visual System](#51-glassmorphic-visual-system)
  - [5.2 Editor Scroll Containment Architecture](#52-editor-scroll-containment-architecture)
  - [5.3 Bundle Optimization (74% Reduction)](#53-bundle-optimization-74-reduction)
- [6. Security & Data Lifecycle](#6-security--data-lifecycle)
- [7. Local Development & Automated Tests](#7-local-development--automated-tests)
- [8. Containerized Deployment (Docker)](#8-containerized-deployment-docker)
- [9. Git & GitHub Publishing Instructions](#9-git--github-publishing-instructions)

---

## 1. Executive System Architecture

DocMorph is structured as a unified full-stack application built on Next.js 14 (App Router), React 18, and TypeScript. It processes conversions in-memory without persistent disk retention, decoupling the frontend user interface from the underlying document tokenizers and PDF layout engines.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DocMorph Web Client UI                         │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │     File Converter Queue      │  │    Markdown Live Studio       │  │
│  │   - Drag & Drop Zone          │  │   - Split-View Editor/Preview │  │
│  │   - 360° Target Selector      │  │   - Keyboard Shortcuts        │  │
│  │   - Batch ZIP Packaging       │  │   - Scroll-Past-End Padding   │  │
│  └───────────────┬───────────────┘  └───────────────┬───────────────┘  │
│                  │                                  │                  │
│                  └────────────────┬─────────────────┘                  │
│                                   │ (HTTP / FormData / JSON)           │
└───────────────────────────────────┼────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js Server Route Handlers                        │
│          /api/convert   |   /api/batch-convert   |   /api/preview      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Conversion Pipeline Orchestrator                    │
│                                                                        │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌────────────┐   │
│   │ Marked + HTMLtoDOCX │   │ Puppeteer + Chrome  │   │  Mammoth   │   │
│   │    (MD ➔ DOCX)      │   │     (MD ➔ PDF)      │   │(DOCX ➔ MD) │   │
│   └─────────────────────┘   └──────────┬──────────┘   └────────────┘   │
│                                        │ (Fallback)                    │
│   ┌─────────────────────┐   ┌──────────▼──────────┐   ┌────────────┐   │
│   │  pdf-parse + Regex  │   │       PDFKit        │   │  Turndown  │   │
│   │     (PDF ➔ MD)      │   │    (Pure Node)      │   │   + GFM    │   │
│   └──────────┬──────────┘   └─────────────────────┘   └────────────┘   │
│              │ (Scanned/Empty Fallback)                                │
│   ┌──────────▼────────────────────────────────────┐   ┌────────────┐   │
│   │       Tesseract.js OCR Recognition            │   │  Archiver  │   │
│   │    (Raster Stream & Chrome Screenshot)        │   │ (ZIP Pack) │   │
│   └───────────────────────────────────────────────┘   └────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 360° Conversion Matrix

DocMorph supports all 6 directional pathways between Markdown, Microsoft Word, and PDF:

| Source Format | Target Format | Processing Strategy | Engine Chain |
| :--- | :--- | :--- | :--- |
| **Markdown** (`.md`) | **Word** (`.docx`) | Direct AST to OpenXML | `Marked` ➔ Semantic HTML ➔ `HTMLtoDOCX` |
| **Markdown** (`.md`) | **PDF** (`.pdf`) | Headless Vector Print | `Marked` ➔ Highlight.js ➔ `Puppeteer-Core` (Chrome) |
| **Word** (`.docx`) | **Markdown** (`.md`) | Semantic XML Mapping | `Mammoth` (AST Style-Map) ➔ `Turndown` (GFM) |
| **Word** (`.docx`) | **PDF** (`.pdf`) | 2-Stage Intermediate | `DOCX ➔ Markdown` ➔ `Markdown ➔ Vector PDF` |
| **PDF** (`.pdf`) | **Markdown** (`.md`) | Text & Layout Parser | `pdf-parse` (or `Tesseract.js` OCR fallback) |
| **PDF** (`.pdf`) | **Word** (`.docx`) | 2-Stage Intermediate | `PDF ➔ Markdown` (w/ OCR) ➔ `Markdown ➔ DOCX` |

---

## 3. Engine Technical Deep-Dives

### 3.1 Markdown ➔ DOCX Engine
- **Source**: [`lib/converters/md-to-docx.ts`](file:///c:/Users/Isuru/Desktop/md-converter/lib/converters/md-to-docx.ts)
- **Library**: `html-to-docx` + `marked`
- **Technical Operation**:
  1. Tokenizes Markdown via `marked` with GitHub Flavored Markdown (`gfm: true`) enabled.
  2. Injects inline table styling (`cantSplit: true`, border collapse, alternating cell shading `#f1f5f9` / `#cbd5e1`).
  3. Wraps code blocks in monospaced Consolas styling with `#f8fafc` background container.
  4. Formats blockquotes with a left border accent (`3px solid #3b82f6`).
  5. Translates margins from twips (`1440 twips = 1.0 inch`, `720 twips = 0.5 inch`, `2160 twips = 1.5 inch`).
  6. Configures dynamic document metadata, header titles, and native Word page number fields in the footer.

### 3.2 Markdown ➔ PDF Vector Engine
- **Source**: [`lib/converters/md-to-pdf.ts`](file:///c:/Users/Isuru/Desktop/md-converter/lib/converters/md-to-pdf.ts)
- **Library**: `puppeteer-core` (Headless Chromium/Chrome/Edge) + `pdfkit` (In-process fallback)
- **Technical Operation**:
  1. Multi-platform browser discovery (`lib/converters/puppeteer-helper.ts`) locates existing Google Chrome or Microsoft Edge binaries across Windows, macOS, and Linux without redundant runtime downloads.
  2. Spawns an ephemeral browser instance with `--headless=new`, `--no-sandbox`, and an isolated temporary user data profile to prevent concurrent multi-process locking.
  3. Compiles the Markdown into HTML containing `@page` CSS print specifications, typography rules, and `highlight.js` syntax token colors.
  4. Generates an A4/Letter/Legal vector PDF with customizable orientation (Portrait/Landscape), custom margins, and HTML header/footer templates displaying document title and pagination (`<span class="pageNumber"></span> of <span class="totalPages"></span>`).
  5. **Fault-Tolerant Fallback**: If browser execution fails due to host container restrictions, the engine seamlessly fails over to `pdfkit` to ensure zero service disruption.

### 3.3 DOCX ➔ Markdown Reverse Engine
- **Source**: [`lib/converters/docx-to-md.ts`](file:///c:/Users/Isuru/Desktop/md-converter/lib/converters/docx-to-md.ts)
- **Library**: `mammoth` + `turndown` + `turndown-plugin-gfm`
- **Technical Operation**:
  1. Employs a custom Mammoth style map to map Word OpenXML styles to HTML elements:
     ```
     p[style-name='Heading 1'] => h1:fresh
     p[style-name='Heading 2'] => h2:fresh
     p[style-name='Heading 3'] => h3:fresh
     p[style-name='Title']     => h1:fresh
     p[style-name='Quote']     => blockquote:fresh
     p[style-name='Code']      => pre:fresh
     r[style-name='Code']      => code
     ```
  2. Extracts embedded raster images as base64 data URIs.
  3. Uses `turndown` with `turndown-plugin-gfm` to transform semantic HTML into standard ATX-style Markdown, preserving pipe tables, task lists, and fenced code blocks.

### 3.4 PDF ➔ Markdown Reverse Engine
- **Source**: [`lib/converters/pdf-to-md.ts`](file:///c:/Users/Isuru/Desktop/md-converter/lib/converters/pdf-to-md.ts)
- **Library**: `pdf-parse`
- **Technical Operation**:
  1. Computes character density per page: `charCount / numPages`.
  2. Documents with `< 80 chars/page` are flagged as image-only or scanned documents and automatically routed to the Tesseract OCR engine.
  3. Multi-column layouts are analyzed using horizontal tab (`\t`) and multi-space whitespace patterns.
  4. Section numbers (e.g., `1.1 Background`) and ALL-CAPS lines are mapped to `###` and `##` headings.
  5. Unordered bullets (`•`, `●`, `▪`, `—`) are normalized to `- `, and tabular data is converted into Markdown pipe tables.

### 3.5 Optical Character Recognition (OCR) Engine
- **Source**: [`lib/converters/ocr.ts`](file:///c:/Users/Isuru/Desktop/md-converter/lib/converters/ocr.ts)
- **Library**: `tesseract.js`
- **Technical Operation**:
  1. **Direct JPEG Stream Slicing**: Inspects the PDF binary for `/DCTDecode` streams bounded by JPEG SOI (`0xFF 0xD8 0xFF`) and EOI (`0xFF 0xD9`) markers. This extracts the original scanner resolution without intermediate rasterization loss.
  2. **Visual Page Screenshot Fallback**: If no discrete JPEG streams exist, headless Chrome renders the PDF pages and captures high-DPI screenshots.
  3. The resulting image buffers are analyzed via a Tesseract worker, calculating confidence scores and returning Markdown text with OCR metadata banners.

---

## 4. REST API Specification

### 4.1 Single Conversion Endpoint (`POST /api/convert`)

Converts a single file or raw text.

#### Request Headers
- `Content-Type`: `multipart/form-data` OR `application/json`

#### Form-Data Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | `File` | Yes (for upload) | Document file (.md, .docx, .pdf, max 25MB) |
| `direction` | `string` | Yes | `md-to-docx`, `md-to-pdf`, `docx-to-md`, `docx-to-pdf`, `pdf-to-md`, `pdf-to-docx` |
| `settings` | `string` (JSON) | No | Serialized `ExportSettings` object |

#### JSON Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `text` | `string` | Yes (or `base64`) | Raw Markdown string |
| `base64` | `string` | No | Base64-encoded document bytes |
| `direction` | `string` | Yes | Target conversion route |
| `fileName` | `string` | No | Base filename for output |
| `settings` | `object` | No | Export configuration options |

#### Response Schema (`200 OK`)
```json
{
  "success": true,
  "fileName": "specification.pdf",
  "mimeType": "application/pdf",
  "dataBase64": "JVBERi0xLjQK...",
  "text": "# Extracted Markdown...",
  "ocrUsed": false,
  "warnings": [],
  "stats": {
    "inputBytes": 14205,
    "outputBytes": 86657,
    "durationMs": 420
  }
}
```

---

### 4.2 Batch Conversion Endpoint (`POST /api/batch-convert`)

Processes up to 20 files simultaneously and streams back an organized `.zip` archive.

#### Query Parameters
- `?zip=true`: Directly streams the generated `.zip` binary with `Content-Type: application/zip`.

#### Form-Data Parameters
- `files`: Multiple document files.
- `direction`: Default conversion direction.
- `direction_{index}`: Per-file override direction.
- `settings`: Serialized JSON configuration.

---

### 4.3 AST Preview Endpoint (`POST /api/preview`)

Generates real-time syntax-highlighted HTML from raw Markdown.

#### Request Body
```json
{
  "markdown": "# Architecture Report\n```typescript\nconst x = 1;\n```"
}
```

#### Response Body
```json
{
  "success": true,
  "html": "<h1>Architecture Report</h1><pre><code class=\"language-typescript\">...</code></pre>"
}
```

---

## 5. Frontend Architecture & UI Design System

### 5.1 Glassmorphic Visual System
- Built with Tailwind CSS 3.4 using translucent layers (`backdrop-blur-xl`, `bg-white/70`, `dark:bg-slate-900/70`).
- Ambient radial mesh lighting provides visual depth in both Light and Dark themes.
- Accent color coding for document types:
  - **DOCX**: Blue (`#2563eb`)
  - **PDF**: Rose (`#e11d48`)
  - **Markdown**: Indigo (`#6366f1`)

### 5.2 Editor Scroll Containment Architecture
To solve scroll chaining (where scrolling to the bottom of the editor bounces or scrolls the entire parent page):
- `overscroll-behavior: contain` is applied to both the editor `<textarea>` and preview panes.
- **Scroll-Past-End Padding** (`pb-48` / 12rem bottom spacing) allows comfortable scrolling well beyond the final line of text.
- Parent flex containers enforce `min-h-0` and `overflow-hidden` constraints.

### 5.3 Bundle Optimization (74% Reduction)
- Heavy interactive components (`MarkdownStudio`) are code-split using `next/dynamic` with `ssr: false`.
- Server-side dependencies (`tesseract.js`, `puppeteer-core`, `html-to-docx`, `mammoth`, `pdf-parse`) are marked as `serverComponentsExternalPackages` in `next.config.mjs`.
- **First Load JS dropped from 421 kB to 111 kB** (~74% reduction).

---

## 6. Security & Data Lifecycle

1. **Zero Data Retention**: Document buffers exist only in volatile server memory for the duration of the request lifecycle. No files are written to permanent disk storage.
2. **Path Sanitization**: Filenames are sanitized via regex (`/[^a-zA-Z0-9._-]/g`) to prevent directory traversal attacks.
3. **Payload Guard**: Strict request body size limit of 25MB enforced at the edge/route layer.
4. **Isolated Browser Profiles**: Headless Chrome sessions execute inside randomized, isolated temp directories that are destroyed immediately upon task termination.

---

## 7. Local Development & Automated Tests

### Prerequisites
- **Node.js**: v18.0.0+ (v20+ recommended)
- **Google Chrome** or **Microsoft Edge** (for vector PDF generation)

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Run the automated test suite
npx tsx tests/test-conversions.js

# 3. Start development server
npm run dev
```

### Automated Test Coverage
The integration test suite (`tests/test-conversions.js`) validates:
- `Markdown ➔ DOCX` (OpenXML validation, PK headers)
- `DOCX ➔ Markdown` (Reverse extraction of headings, tables, and lists)
- `Markdown ➔ PDF` (Puppeteer layout with landscape & margin options)
- `PDF ➔ Markdown` (Reverse structure & text extraction)
- `DOCX ➔ PDF` (360° intermediate cross-format pipeline)
- `PDF ➔ DOCX` (360° intermediate cross-format pipeline)
- `Scanned PDF Detection & Tesseract OCR Recovery`
- `Multi-Format Batch ZIP Packaging`

---

## 8. Containerized Deployment (Docker)

A multi-stage `Dockerfile` is provided for zero-dependency container deployment:

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Runner with Chromium
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont font-noto-emoji

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public 2>/dev/null || true

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t docmorph:latest .
docker run -p 3000:3000 --rm docmorph:latest
```

---

## 9. Git & GitHub Publishing Instructions

To publish this codebase to your GitHub account:

### Method A: Using GitHub CLI (`gh`)
```bash
# 1. Authenticate with GitHub
gh auth login

# 2. Create the repository and push the codebase
gh repo create md-converter --public --source=. --remote=origin --push
```

### Method B: Using Standard Git Remotes
```bash
# 1. Create a new repository on https://github.com/new (e.g. "md-converter")

# 2. Link your local repository to GitHub
git remote add origin https://github.com/<your-username>/md-converter.git

# 3. Set default branch to main and push
git branch -M main
git push -u origin main
```

---

### License
MIT License. Created by Isuru Amarasinghe.
