import hljs from 'highlight.js';
import { marked } from 'marked';

// Configure marked with syntax highlighting and GitHub Flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

export function parseMarkdownToHtml(markdown: string): string {
  // Custom renderer for syntax highlighting
  const renderer = new marked.Renderer();

  renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
    const validLanguage = lang && hljs.getLanguage(lang) ? lang : null;
    let highlighted = '';
    try {
      if (validLanguage) {
        highlighted = hljs.highlight(text, { language: validLanguage }).value;
      } else {
        highlighted = hljs.highlightAuto(text).value;
      }
    } catch {
      highlighted = text;
    }

    const langClass = validLanguage ? ` class="language-${validLanguage}"` : '';
    return `<pre><code${langClass}>${highlighted}</code></pre>`;
  };

  renderer.table = function (this: any, token: any) {
    const tableHtml = marked.Renderer.prototype.table.call(this, token);
    return `<div class="table-container">${tableHtml}</div>`;
  };

  return marked.parse(markdown, { renderer }) as string;
}

export const PDF_CSS = `
  @page {
    size: A4;
    margin: 20mm 18mm 22mm 18mm;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.65;
    color: #24292f;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.3;
    margin-top: 1.5em;
    margin-bottom: 0.6em;
    color: #1f2328;
    page-break-after: avoid;
    break-after: avoid;
  }

  h1 {
    font-size: 24pt;
    border-bottom: 1.5px solid #d0d7de;
    padding-bottom: 0.3em;
    margin-top: 0;
  }

  h2 {
    font-size: 18pt;
    border-bottom: 1px solid #d0d7de;
    padding-bottom: 0.25em;
  }

  h3 { font-size: 14pt; }
  h4 { font-size: 12pt; }
  h5 { font-size: 11pt; }
  h6 { font-size: 10pt; color: #57606a; }

  p {
    margin-top: 0;
    margin-bottom: 1em;
    text-align: justify;
  }

  strong { font-weight: 600; }
  em { font-style: italic; }
  del { text-decoration: line-through; color: #6e7781; }

  a {
    color: #0969da;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  ul, ol {
    margin-top: 0;
    margin-bottom: 1em;
    padding-left: 2em;
  }

  li {
    margin-bottom: 0.35em;
  }

  li > ul, li > ol {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }

  blockquote {
    margin: 1.2em 0;
    padding: 0.6em 1.2em;
    border-left: 4px solid #0969da;
    background-color: #f6f8fa;
    color: #57606a;
    border-radius: 0 4px 4px 0;
    page-break-inside: avoid;
  }

  blockquote p:last-child {
    margin-bottom: 0;
  }

  code {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 0.9em;
    background-color: #eff1f3;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    color: #24292e;
  }

  pre {
    background-color: #1e1e1e;
    color: #d4d4d4;
    padding: 14px 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1.2em 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  pre code {
    background-color: transparent;
    padding: 0;
    color: inherit;
    font-size: 9.5pt;
    line-height: 1.45;
  }

  /* highlight.js theme for code blocks */
  .hljs-keyword, .hljs-selector-tag, .hljs-subst { color: #569cd6; font-weight: 600; }
  .hljs-string, .hljs-title, .hljs-section, .hljs-attribute, .hljs-literal, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-addition { color: #ce9178; }
  .hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta { color: #6a9955; font-style: italic; }
  .hljs-number, .hljs-regexp, .hljs-variable { color: #b5cea8; }
  .hljs-function { color: #dcdcaa; }
  .hljs-class { color: #4ec9b0; }

  hr {
    height: 1px;
    background-color: #d0d7de;
    border: none;
    margin: 2em 0;
  }

  .table-container {
    width: 100%;
    margin: 1.2em 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }

  th, td {
    padding: 8px 12px;
    border: 1px solid #d0d7de;
    text-align: left;
    vertical-align: top;
  }

  th {
    background-color: #f6f8fa;
    font-weight: 600;
    color: #24292f;
  }

  tr:nth-child(even) td {
    background-color: #fafbfc;
  }

  img {
    max-width: 100%;
    height: auto;
    page-break-inside: avoid;
    border-radius: 4px;
    margin: 1em 0;
  }
`;

export function generateHtmlDocument(htmlBody: string, title: string = 'Converted Document'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>${PDF_CSS}</style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
