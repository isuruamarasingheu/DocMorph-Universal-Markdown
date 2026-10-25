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
  Columns,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { parseMarkdownToHtml } from '@/lib/converters/styles';
import { SAMPLE_DOCS } from '@/lib/sample-docs';

export default function MarkdownStudio() {
  const [markdown, setMarkdown] = useState<string>(SAMPLE_DOCS[0].markdown);
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'split' | 'editor' | 'preview'>('split');
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

  // Document statistics
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
      {/* Top Studio Control Bar */}
      <div className="p-4 rounded-3xl glass-panel shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Template Selector & Reset */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold mr-1">
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Templates:</span>
          </div>

          {SAMPLE_DOCS.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setMarkdown(doc.markdown)}
              className="px-3 py-1 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-150"
            >
              {doc.title}
            </button>
          ))}

          <button
            onClick={() => setMarkdown('')}
            title="Clear editor"
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Layout & Export Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Layout switcher */}
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800/90 rounded-xl p-0.5 border border-slate-200 dark:border-white/10 text-xs">
            <button
              onClick={() => setLayoutMode('split')}
              title="Split View"
              className={`p-1.5 rounded-lg transition-colors ${
                layoutMode === 'split' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode('editor')}
              title="Editor Only"
              className={`p-1.5 rounded-lg transition-colors ${
                layoutMode === 'editor' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode('preview')}
              title="Preview Only"
              className={`p-1.5 rounded-lg transition-colors ${
                layoutMode === 'preview' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
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
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all duration-150"
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
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all duration-150"
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

      {/* Error alert banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center space-x-2 text-xs backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Editor & Preview Grid */}
      <div
        className={`grid gap-4 min-h-[620px] h-[calc(100vh-250px)] ${
          layoutMode === 'split'
            ? 'grid-cols-1 lg:grid-cols-2'
            : layoutMode === 'editor'
            ? 'grid-cols-1'
            : 'grid-cols-1'
        }`}
      >
        {/* Left Column: Markdown Editor */}
        {(layoutMode === 'split' || layoutMode === 'editor') && (
          <div className="flex flex-col rounded-3xl glass-panel shadow-2xl overflow-hidden transition-all duration-200">
            {/* Editor Toolbar */}
            <div className="px-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => insertSnippet('**', '**', 'bold text')}
                  title="Bold (Ctrl+B)"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertSnippet('*', '*', 'italic text')}
                  title="Italic (Ctrl+I)"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertSnippet('~~', '~~', 'strikethrough')}
                  title="Strikethrough"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-1" />
                <button
                  onClick={() => insertSnippet('# ', '', 'Heading 1')}
                  title="Heading 1"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertSnippet('## ', '', 'Heading 2')}
                  title="Heading 2"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-1" />
                <button
                  onClick={() => insertSnippet('- ', '', 'List item')}
                  title="Bullet List"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertSnippet('1. ', '', 'First item')}
                  title="Numbered List"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertSnippet('> ', '', 'Quotation')}
                  title="Blockquote"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-1" />
                <button
                  onClick={() => insertSnippet('```typescript\n', '\n```', '// Code block')}
                  title="Code Block"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertSnippet('\n| Header 1 | Header 2 |\n| :--- | :--- |\n| Value 1 | Value 2 |\n', '', '')}
                  title="Insert Table"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertSnippet('\n---\n', '', '')}
                  title="Horizontal Rule"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                <span>{words} words</span>
                <span>·</span>
                <span>{chars} chars</span>
              </div>
            </div>

            {/* Editor Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="# Type or paste Markdown here..."
                className="w-full h-full p-5 resize-none bg-transparent font-mono text-xs sm:text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                spellCheck="false"
              />
            </div>

            {/* Footer Stats Bar */}
            <div className="px-4 py-2 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-2 font-medium">
                <FileCode className="w-3.5 h-3.5 text-blue-500" />
                <span>Markdown Input</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">~{estimatedPages} A4 pages</span>
                <span>·</span>
                <span>{readTimeMin} min read</span>
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Live Styled Preview */}
        {(layoutMode === 'split' || layoutMode === 'preview') && (
          <div className="flex flex-col rounded-3xl glass-panel shadow-2xl overflow-hidden transition-all duration-200">
            {/* macOS styled header */}
            <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Live Document Render
                </span>
              </div>

              <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-time AST</span>
              </div>
            </div>

            {/* Rendered Container */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white/40 dark:bg-slate-950/40">
              {htmlPreview ? (
                <div
                  className="markdown-body max-w-none"
                  dangerouslySetInnerHTML={{ __html: htmlPreview }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                  <FileText className="w-12 h-12 stroke-[1.2] mb-2 text-slate-300 dark:text-slate-700" />
                  <p>Preview will render here in real-time...</p>
                </div>
              )}
            </div>

            {/* Preview Footer */}
            <div className="px-5 py-2 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>GitHub typography & highlight.js</span>
              <span className="font-mono text-[11px]">Print Ready (A4)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
