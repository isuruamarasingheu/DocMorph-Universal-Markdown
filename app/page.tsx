'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import FileConverter from '@/components/FileConverter';
import { Lock, Layers, Zap, Sparkles, Loader2 } from 'lucide-react';

// Lazy-load MarkdownStudio for optimized initial bundle loading
const MarkdownStudio = dynamic(() => import('@/components/MarkdownStudio'), {
  loading: () => (
    <div className="h-[600px] rounded-3xl glass-panel flex flex-col items-center justify-center space-y-3">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="text-xs font-semibold text-slate-500">Loading Markdown Studio...</span>
    </div>
  ),
  ssr: false,
});

export default function Home() {
  const [activeTab, setActiveTab] = useState<'converter' | 'studio'>('converter');

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      {/* Ambient background glowing orbs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-100px] left-1/4 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-[-50px] right-1/4 w-[450px] h-[450px] bg-indigo-500/10 dark:bg-purple-600/15 rounded-full blur-[130px]" />
      </div>

      {/* Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3 pt-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20 shadow-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Universal 360° Document Engine & OCR</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Seamless Conversion for{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Markdown, Word & PDF
            </span>
          </h1>

          <p className="text-xs sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Convert between all formats with structure preservation, customizable export layouts, and built-in Tesseract OCR.
          </p>
        </div>

        {/* Tab View */}
        {activeTab === 'converter' ? <FileConverter /> : <MarkdownStudio />}

        {/* Feature Cards Grid */}
        <section className="pt-10 border-t border-slate-200/80 dark:border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-3xl glass-card space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Lock className="w-5 h-5 stroke-[1.8]" />
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                Zero Data Retention
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Documents are processed purely in ephemeral RAM and never persisted to disks or uploaded to third-party APIs.
              </p>
            </div>

            <div className="p-6 rounded-3xl glass-card space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="w-5 h-5 stroke-[1.8]" />
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                Lossless Semantic Structure
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Full preservation of H1-H6 hierarchy, multi-language code highlighting, styled tables, and blockquotes.
              </p>
            </div>

            <div className="p-6 rounded-3xl glass-card space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Zap className="w-5 h-5 stroke-[1.8]" />
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                360° Multi-Format Batch Export
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Batch convert any combination of formats simultaneously and download a single consolidated ZIP archive.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-white/10 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>DocMorph · Universal Document Conversion Suite · Engineered with Next.js, TypeScript & Tailwind CSS</p>
      </footer>
    </div>
  );
}
