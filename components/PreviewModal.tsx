'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Download, AlertTriangle, Eye, Code, FileText } from 'lucide-react';
import { marked } from 'marked';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  markdown: string;
  warnings?: string[];
}

export default function PreviewModal({
  isOpen,
  onClose,
  title,
  markdown,
  warnings,
}: PreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title.endsWith('.md') ? title : `${title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderedHtml = marked.parse(markdown || '') as string;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white/90 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 rounded-3xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-sm sm:max-w-md">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400">Extracted Markdown Output</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View toggle */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-xl p-0.5 text-xs font-semibold">
              <button
                onClick={() => setViewMode('rendered')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors ${
                  viewMode === 'rendered'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Raw</span>
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all duration-150 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Warnings callout if any */}
        {warnings && warnings.length > 0 && (
          <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start space-x-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {warnings.map((w, idx) => (
                <p key={idx}>{w}</p>
              ))}
            </div>
          </div>
        )}

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {viewMode === 'rendered' ? (
            <div
              className="markdown-body text-slate-800 dark:text-slate-200 max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <pre className="font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap bg-slate-50/80 dark:bg-slate-950/70 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 leading-relaxed">
              {markdown}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
