'use client';

import React from 'react';
import { ArrowRightLeft, FileText, Edit3, Sparkles, Shield, Cpu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  activeTab: 'converter' | 'studio';
  setActiveTab: (tab: 'converter' | 'studio') => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-2xl blur-xs opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 dark:from-slate-900 dark:to-slate-950 border border-white/20 flex items-center justify-center text-white shadow-md">
              <ArrowRightLeft className="w-5 h-5 text-blue-400 group-hover:rotate-180 transition-transform duration-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 dark:from-white dark:via-blue-200 dark:to-slate-300 bg-clip-text text-transparent">
                DocMorph
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                PRO v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide hidden sm:block">
              Universal Markdown · DOCX · PDF Engine
            </p>
          </div>
        </div>

        {/* Tab switcher: Segmented Control */}
        <nav className="flex items-center p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 shadow-inner">
          <button
            onClick={() => setActiveTab('converter')}
            className={`relative flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeTab === 'converter'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm shadow-slate-900/5'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>File Converter</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`relative flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeTab === 'studio'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm shadow-slate-900/5'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Markdown Studio</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          </button>
        </nav>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span>In-Memory Pipeline</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
