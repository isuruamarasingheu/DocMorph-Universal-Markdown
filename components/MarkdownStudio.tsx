'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  Bold,
  Check,
  Code,
  Copy,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  SlidersHorizontal,
  Strikethrough,
  Table as TableIcon,
} from 'lucide-react';
import { parseMarkdownToHtml } from '@/lib/converters/styles';
import { sanitizePreviewHtml } from '@/lib/sanitize-html';
import { SAMPLE_DOCS } from '@/lib/sample-docs';
import { ExportSettings } from '@/lib/types';
import SettingsDrawer, { DEFAULT_SETTINGS, describePageSetup } from './SettingsDrawer';

type LayoutMode = 'editor' | 'split' | 'preview';

const LAYOUTS: { id: LayoutMode; label: string; desktopOnly?: boolean }[] = [
  { id: 'editor', label: 'Source' },
  { id: 'split', label: 'Both', desktopOnly: true },
  { id: 'preview', label: 'Page' },
];

export default function MarkdownStudio() {
  const [markdown, setMarkdown] = useState<string>(SAMPLE_DOCS[0].markdown);
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [exporting, setExporting] = useState<'docx' | 'pdf' | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_SETTINGS);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load persistent settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem('docmorph_export_settings');
      if (stored) setSettings(JSON.parse(stored));
    } catch {}
  }, []);

  // "Both" doesn't fit on narrow screens; fall back to the source view there.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => {
      if (!mq.matches) setLayoutMode((m) => (m === 'split' ? 'editor' : m));
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Update live preview whenever markdown changes
  useEffect(() => {
    try {
      setHtmlPreview(sanitizePreviewHtml(parseMarkdownToHtml(markdown)));
    } catch {}
  }, [markdown]);

  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const estimatedPages = Math.max(1, Math.ceil(words / 450));

  const insertSnippet = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.substring(start, end) || defaultText;
    const updated = markdown.substring(0, start) + `${before}${selected}${after}` + markdown.substring(end);
    setMarkdown(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  // Keyboard shortcuts for Markdown power users
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.shiftKey) {
        const before = markdown.substring(0, start);
        const after = markdown.substring(end);
        if (before.endsWith('  ')) {
          setMarkdown(before.slice(0, -2) + after);
          setTimeout(() => textarea.setSelectionRange(start - 2, start - 2), 0);
        }
      } else {
        setMarkdown(markdown.substring(0, start) + '  ' + markdown.substring(end));
        setTimeout(() => textarea.setSelectionRange(start + 2, start + 2), 0);
      }
      return;
    }

    if (mod) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        insertSnippet('**', '**', 'bold text');
      } else if (key === 'i') {
        e.preventDefault();
        insertSnippet('*', '*', 'italic text');
      } else if (key === 'k') {
        e.preventDefault();
        insertSnippet('[', '](https://example.com)', 'link text');
      } else if (key === 's') {
        e.preventDefault();
        handleExport('docx');
      }
    }
  };

  const handleExport = async (format: 'docx' | 'pdf') => {
    if (!markdown.trim()) {
      setErrorMsg('There is nothing to export yet. Write or paste some Markdown first.');
      return;
    }

    setErrorMsg(null);
    setExporting(format);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: markdown,
          direction: format === 'docx' ? 'md-to-docx' : 'md-to-pdf',
          fileName: 'document.md',
          settings,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'The export failed on the server.');
      }

      const binary = atob(data.dataBase64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
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
      setErrorMsg(err.message || 'The export failed on the server.');
    } finally {
      setExporting(null);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const formatButtons: { label: string; icon: React.ElementType; run: () => void }[][] = [
    [
      { label: 'Bold (Ctrl+B)', icon: Bold, run: () => insertSnippet('**', '**', 'bold text') },
      { label: 'Italic (Ctrl+I)', icon: Italic, run: () => insertSnippet('*', '*', 'italic text') },
      { label: 'Strikethrough', icon: Strikethrough, run: () => insertSnippet('~~', '~~', 'struck text') },
      { label: 'Link (Ctrl+K)', icon: Link2, run: () => insertSnippet('[', '](https://example.com)', 'link text') },
    ],
    [
      { label: 'Heading 1', icon: Heading1, run: () => insertSnippet('# ', '', 'Heading') },
      { label: 'Heading 2', icon: Heading2, run: () => insertSnippet('## ', '', 'Heading') },
      { label: 'Bulleted list', icon: List, run: () => insertSnippet('- ', '', 'List item') },
      { label: 'Numbered list', icon: ListOrdered, run: () => insertSnippet('1. ', '', 'First item') },
      { label: 'Quote', icon: Quote, run: () => insertSnippet('> ', '', 'Quotation') },
    ],
    [
      { label: 'Code block', icon: Code, run: () => insertSnippet('```typescript\n', '\n```', '// code') },
      {
        label: 'Table',
        icon: TableIcon,
        run: () => insertSnippet('\n| Column 1 | Column 2 |\n| :--- | :--- |\n| Value | Value |\n', '', ''),
      },
      { label: 'Divider', icon: Minus, run: () => insertSnippet('\n---\n', '', '') },
    ],
  ];

  const showEditor = layoutMode !== 'preview';
  const showPreview = layoutMode !== 'editor';

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="w-64 max-w-full">
            <span className="sr-only">Load a sample document</span>
            <select
              className="field"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id === '__blank') setMarkdown('');
                const doc = SAMPLE_DOCS.find((d) => d.id === id);
                if (doc) setMarkdown(doc.markdown);
              }}
            >
              <option value="" disabled>
                Load a sample…
              </option>
              {SAMPLE_DOCS.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
              <option value="__blank">Blank page</option>
            </select>
          </label>

          <div className="segmented" role="group" aria-label="View">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={layoutMode === l.id}
                onClick={() => setLayoutMode(l.id)}
                className={l.desktopOnly ? 'hidden lg:block' : undefined}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setIsSettingsOpen(true)} className="btn-quiet">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Export options
          </button>
          <button type="button" onClick={copyToClipboard} className="btn-quiet" aria-live="polite">
            {copied ? <Check className="h-4 w-4 text-go" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy Markdown'}
          </button>
          <button type="button" onClick={() => handleExport('docx')} disabled={exporting !== null} className="btn-outline">
            {exporting === 'docx' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {exporting === 'docx' ? 'Exporting…' : 'Export Word'}
          </button>
          <button type="button" onClick={() => handleExport('pdf')} disabled={exporting !== null} className="btn-primary">
            {exporting === 'pdf' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="mt-4 flex items-start gap-3 border-l-[3px] border-pencil bg-paper px-4 py-3 text-sm text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-pencil" aria-hidden="true" />
          <p className="flex-1">{errorMsg}</p>
          <button type="button" onClick={() => setErrorMsg(null)} className="font-semibold text-ink-soft hover:text-ink">
            Dismiss
          </button>
        </div>
      )}

      <div
        className={`mt-5 grid gap-6 lg:h-[calc(100vh-15rem)] lg:min-h-[560px] ${
          layoutMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {showEditor && (
          <div className="flex h-[70vh] min-h-[420px] flex-col overflow-hidden rounded-control border border-rule bg-paper lg:h-full">
            <div className="flex flex-wrap items-center gap-1 border-b border-rule/70 px-2 py-1.5" role="toolbar" aria-label="Formatting">
              {formatButtons.map((group, gi) => (
                <React.Fragment key={gi}>
                  {gi > 0 && <span className="mx-1 h-5 w-px bg-rule" aria-hidden="true" />}
                  {group.map(({ label, icon: Icon, run }) => (
                    <button key={label} type="button" onClick={run} className="btn-icon h-8 w-8" aria-label={label} title={label}>
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>

            <label htmlFor="md-source" className="sr-only">
              Markdown source
            </label>
            <textarea
              id="md-source"
              ref={textareaRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="# Start with a heading"
              spellCheck={false}
              className="min-h-0 flex-1 resize-none overscroll-contain bg-transparent px-5 py-5 pb-40 font-mono text-[13.5px] leading-6 text-ink placeholder:text-ink-soft/70 focus:outline-none sm:px-7"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule/70 px-4 py-2 text-sm text-ink-soft">
              <span className="tabular-nums">
                {words.toLocaleString()} {words === 1 ? 'word' : 'words'}, about {estimatedPages} {estimatedPages === 1 ? 'page' : 'pages'}
              </span>
              <span className="hidden xl:inline">Ctrl+S exports Word</span>
            </div>
          </div>
        )}

        {showPreview && (
          <div className="flex h-[70vh] min-h-[420px] flex-col lg:h-full">
            <div className="sheet min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8 sm:px-12 sm:py-12">
              {htmlPreview ? (
                <div
                  className="markdown-body mx-auto"
                  data-font={settings.fontFamily || 'sans'}
                  dangerouslySetInnerHTML={{ __html: htmlPreview }}
                />
              ) : (
                <p className="text-ink-soft">The page is empty. Type in the source to see it here.</p>
              )}
            </div>
            <p className="mt-2 text-sm text-ink-soft">PDF page setup: {describePageSetup(settings)}</p>
          </div>
        )}
      </div>

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />
    </div>
  );
}
