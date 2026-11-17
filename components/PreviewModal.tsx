'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Download } from 'lucide-react';
import { marked } from 'marked';
import { sanitizePreviewHtml } from '@/lib/sanitize-html';
import { ExportSettings } from '@/lib/types';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  markdown: string;
  warnings?: string[];
  fontFamily?: ExportSettings['fontFamily'];
}

export default function PreviewModal({ isOpen, onClose, title, markdown, warnings, fontFamily }: PreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll, close on Escape, and move focus into the dialog.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => closeRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title.replace(/\.[^.]+$/, '') + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderedHtml = sanitizePreviewHtml(marked.parse(markdown || '') as string);

  return createPortal(
    <div
      onClick={onClose}
      className="animate-fadeIn fixed inset-0 z-[100] flex items-stretch justify-center bg-[rgb(var(--shadow)/0.5)] p-0 sm:items-center sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        className="animate-riseIn flex max-h-full w-full max-w-4xl flex-col bg-desk sm:max-h-[90vh] sm:rounded-control sm:shadow-sheet"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-rule/70 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="preview-title" className="truncate text-base font-bold text-ink" title={title}>
              {title}
            </h2>
            <p className="text-sm text-ink-soft">Markdown extracted from your file</p>
          </div>

          <div className="segmented" role="group" aria-label="View">
            <button type="button" aria-pressed={viewMode === 'rendered'} onClick={() => setViewMode('rendered')}>
              Page
            </button>
            <button type="button" aria-pressed={viewMode === 'raw'} onClick={() => setViewMode('raw')}>
              Markdown
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button type="button" onClick={handleCopy} className="btn-quiet">
              {copied ? <Check className="animate-tickPop h-4 w-4 text-go" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" onClick={handleDownload} className="btn-primary">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download .md
            </button>
            <button ref={closeRef} type="button" onClick={onClose} className="btn-icon" aria-label="Close preview">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          {warnings && warnings.length > 0 && (
            <div className="marker-sweep mb-4 rounded-sheet px-4 py-3 text-sm leading-relaxed text-marker-ink">
              {warnings.map((w, idx) => (
                <p key={idx}>{w}</p>
              ))}
            </div>
          )}

          <div className="sheet px-6 py-8 sm:px-12 sm:py-12">
            {viewMode === 'rendered' ? (
              <div
                className="markdown-body mx-auto"
                data-font={fontFamily || 'sans'}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-7 text-ink">{markdown}</pre>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
