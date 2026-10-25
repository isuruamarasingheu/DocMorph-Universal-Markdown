'use client';

import React from 'react';
import { X, Sliders, RotateCcw, Check, FileText, FileSpreadsheet, Sparkles, HelpCircle } from 'lucide-react';
import { ExportSettings } from '@/lib/types';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ExportSettings;
  onUpdateSettings: (newSettings: ExportSettings) => void;
}

export const DEFAULT_SETTINGS: ExportSettings = {
  pageSize: 'A4',
  orientation: 'portrait',
  margin: 'normal',
  fontFamily: 'sans',
  fontSize: 11,
  showPageNumbers: true,
  showHeader: true,
  printBackground: true,
  docxFont: 'Calibri',
  docxFontSize: 11,
  docxMargin: 'normal',
  autoOcr: true,
  ocrLanguage: 'eng',
};

export default function SettingsDrawer({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: SettingsDrawerProps) {
  if (!isOpen) return null;

  const update = (key: keyof ExportSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    onUpdateSettings(updated);
    localStorage.setItem('docmorph_export_settings', JSON.stringify(updated));
  };

  const resetDefaults = () => {
    onUpdateSettings(DEFAULT_SETTINGS);
    localStorage.setItem('docmorph_export_settings', JSON.stringify(DEFAULT_SETTINGS));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-white/10 w-full max-w-md h-full flex flex-col shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Export & Engine Settings</h3>
              <p className="text-[11px] text-slate-400">Custom layout, margins & OCR options</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={resetDefaults}
              title="Reset to default settings"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section: PDF Formatting */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>PDF Configuration</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Page Size
                </label>
                <select
                  value={settings.pageSize || 'A4'}
                  onChange={(e) => update('pageSize', e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-slate-800 dark:text-slate-200"
                >
                  <option value="A4">A4 (Standard ISO)</option>
                  <option value="Letter">US Letter</option>
                  <option value="Legal">US Legal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Orientation
                </label>
                <select
                  value={settings.orientation || 'portrait'}
                  onChange={(e) => update('orientation', e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-slate-800 dark:text-slate-200"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Margins
                </label>
                <select
                  value={settings.margin || 'normal'}
                  onChange={(e) => update('margin', e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-slate-800 dark:text-slate-200"
                >
                  <option value="compact">Compact (12mm)</option>
                  <option value="normal">Normal (20mm)</option>
                  <option value="wide">Wide (30mm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Typography
                </label>
                <select
                  value={settings.fontFamily || 'sans'}
                  onChange={(e) => update('fontFamily', e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-slate-800 dark:text-slate-200"
                >
                  <option value="sans">Modern Sans (Clean)</option>
                  <option value="serif">Classic Serif (Book)</option>
                  <option value="mono">Monospace (Tech)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 cursor-pointer">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Include Page Numbers
                </span>
                <input
                  type="checkbox"
                  checked={settings.showPageNumbers ?? true}
                  onChange={(e) => update('showPageNumbers', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 cursor-pointer">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Include Header Title
                </span>
                <input
                  type="checkbox"
                  checked={settings.showHeader ?? true}
                  onChange={(e) => update('showHeader', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
              </label>
            </div>
          </div>

          <hr className="border-slate-200/80 dark:border-white/10" />

          {/* Section: Word DOCX Formatting */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Word (.docx) Configuration</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Font Family
                </label>
                <select
                  value={settings.docxFont || 'Calibri'}
                  onChange={(e) => update('docxFont', e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-slate-800 dark:text-slate-200"
                >
                  <option value="Calibri">Calibri</option>
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Segoe UI">Segoe UI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Font Size
                </label>
                <select
                  value={settings.docxFontSize || 11}
                  onChange={(e) => update('docxFontSize', Number(e.target.value))}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-slate-800 dark:text-slate-200"
                >
                  <option value={10}>10 pt</option>
                  <option value={11}>11 pt (Standard)</option>
                  <option value={12}>12 pt (Large)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Margins
              </label>
              <select
                value={settings.docxMargin || 'normal'}
                onChange={(e) => update('docxMargin', e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-slate-800 dark:text-slate-200"
              >
                <option value="compact">Narrow (0.5 in)</option>
                <option value="normal">Normal (1.0 in)</option>
                <option value="wide">Wide (1.5 in)</option>
              </select>
            </div>
          </div>

          <hr className="border-slate-200/80 dark:border-white/10" />

          {/* Section: OCR Engine */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Optical Character Recognition (OCR)</span>
            </div>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 cursor-pointer">
              <div className="pr-2">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Auto-Run OCR on Scanned PDFs
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automatically extracts text from image-only PDFs via Tesseract.js.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoOcr ?? true}
                onChange={(e) => update('autoOcr', e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">Settings saved automatically</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
