'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import FileConverter from '@/components/FileConverter';
import MarkdownStudio from '@/components/MarkdownStudio';
import { ShieldCheck, Zap, Layers, RefreshCw } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'converter' | 'studio'>('converter');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-2 pt-2 pb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Universal Document Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Convert seamlessly between <span className="text-blue-600 dark:text-blue-400 font-medium">Markdown</span>,{' '}
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Microsoft Word (DOCX)</span>, and{' '}
            <span className="text-rose-600 dark:text-rose-400 font-medium">PDF</span> with structural fidelity.
          </p>
        </div>

        {/* Tab Content */}
        {activeTab === 'converter' ? <FileConverter /> : <MarkdownStudio />}

        {/* Security & Reliability Features */}
        <section className="pt-8 border-t border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="flex items-start space-x-3 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Zero Data Retention
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Files are processed ephemerally in memory and never stored on persistent disks or third-party servers.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Lossless Semantic Structure
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Maintains H1-H6 hierarchy, GitHub styled tables, multi-language syntax highlighting, and blockquotes.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  High-Throughput Batch Processing
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Queue multiple files simultaneously, customize per-file targets, and download results as a consolidated ZIP.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>DocMorph · Universal Document Converter · Built with Next.js, TypeScript & Tailwind CSS</p>
      </footer>
    </div>
  );
}
