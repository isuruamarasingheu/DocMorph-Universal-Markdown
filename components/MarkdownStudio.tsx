'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  FileCode,
  Download,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Quote,
  Table as TableIcon,
  Minus,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { parseMarkdownToHtml } from '@/lib/converters/styles';
import { SAMPLE_DOCS } from '@/lib/sample-docs';

export default function MarkdownStudio() {
  const [markdown, setMarkdown] = useState<string>(SAMPLE_DOCS[0].markdown);
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [isConvertingDocx, setIsConvertingDocx] = useState(false);
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update live preview whenever markdown changes
  useEffect(() => {
    try {
      const html = parseMarkdownToHtml(markdown);
      setHtmlPreview(html);
    } catch {
      // Fallback
    }
  }, [markdown]);

  // Statistics
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const chars = markdown.length;
  const estimatedPages = Math.max(1, Math.ceil(words / 450));
  const readTimeMin = Math.max(1, Math.ceil(words / 200));

  const insertSnippet = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.substring(start, end) || defaultText;
    const replacement = `${before}${selected}${after}`;

    const updated = markdown.substring(0, start) + replacement + markdown.substring(end);
    setMarkdown(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const handleExport = async (format: 'docx' | 'pdf') => {
    if (!markdown.trim()) {
      setErrorMsg('Please enter or paste some Markdown before converting.');
      return;
    }

    setErrorMsg(null);
    if (format === 'docx') setIsConvertingDocx(true);
    if (format === 'pdf') setIsConvertingPdf(true);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: markdown,
          direction: format === 'docx' ? 'md-to-docx' : 'md-to-pdf',
          fileName: 'document.md',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Conversion failed');
      }

      // Convert base64 to blob and trigger browser download
      const binary = atob(data.dataBase64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([array], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error converting document');
    } finally {
      setIsConvertingDocx(false);
      setIsConvertingPdf(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action & status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sample loader */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="font-medium">Templates:</span>
          </div>
          {SAMPLE_DOCS.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setMarkdown(doc.markdown)}
              className="px-2.5 py-1 text-xs rounded-lg font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {doc.title}
            </button>
          ))}
          <button
            onClick={() => setMarkdown('')}
            title="Clear editor"
            className="p-1 text-xs rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy MD</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleExport('docx')}
            disabled={isConvertingDocx || isConvertingPdf}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            {isConvertingDocx ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>Export DOCX</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={isConvertingDocx || isConvertingPdf}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            {isConvertingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center space-x-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Editor & Preview Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-250px)] min-h-[580px]">
        {/* Left Column: Markdown Editor */}
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Editor Header Toolbar */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => insertSnippet('**', '**', 'bold text')}
                title="Bold (Ctrl+B)"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertSnippet('*', '*', 'italic text')}
                title="Italic (Ctrl+I)"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertSnippet('~~', '~~', 'strikethrough')}
                title="Strikethrough"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1" />
              <button
                onClick={() => insertSnippet('# ', '', 'Heading 1')}
                title="Heading 1"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Heading1 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertSnippet('## ', '', 'Heading 2')}
                title="Heading 2"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1" />
              <button
                onClick={() => insertSnippet('- ', '', 'List item')}
                title="Bullet List"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertSnippet('1. ', '', 'First item')}
                title="Numbered List"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertSnippet('> ', '', 'Quotation')}
                title="Blockquote"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1" />
              <button
                onClick={() => insertSnippet('```typescript\n', '\n```', '// Code here')}
                title="Code Block"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertSnippet('\n| Header 1 | Header 2 |\n| :--- | :--- |\n| Cell 1 | Cell 2 |\n', '', '')}
                title="Insert Table"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertSnippet('\n---\n', '', '')}
                title="Horizontal Rule"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{words} words</span>
              <span>·</span>
              <span>{chars} chars</span>
            </div>
          </div>

          {/* Text Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="# Type or paste Markdown here..."
              className="w-full h-full p-4 resize-none bg-transparent font-mono text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              spellCheck="false"
            />
          </div>

          {/* Editor Footer Status */}
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-2">
              <FileCode className="w-3.5 h-3.5 text-blue-500" />
              <span>Markdown Source</span>
            </div>
            <div>
              <span>~{estimatedPages} pages</span>
              <span className="mx-1.5">·</span>
              <span>{readTimeMin} min read</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Styled HTML Preview */}
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Preview Header */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Live Document Preview
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Real-time render</span>
          </div>

          {/* Rendered Document Container */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {htmlPreview ? (
              <div
                className="markdown-body text-slate-800 dark:text-slate-200"
                dangerouslySetInnerHTML={{ __html: htmlPreview }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <FileText className="w-10 h-10 stroke-[1.2] mb-2 text-slate-300 dark:text-slate-700" />
                <p>Preview will appear here as you type...</p>
              </div>
            )}
          </div>

          {/* Preview Footer */}
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>High-fidelity typography & syntax highlighting</span>
            <span>A4 Pagination Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
