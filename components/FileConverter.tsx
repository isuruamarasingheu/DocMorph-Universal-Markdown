'use client';

import React, { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  FileText,
  FileCode,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Download,
  Trash2,
  FolderArchive,
  RefreshCw,
  Eye,
  FileUp,
  Sparkles,
  Sliders,
  Check,
} from 'lucide-react';
import { ConversionDirection, ConversionItem, ExportSettings } from '@/lib/types';
import PreviewModal from './PreviewModal';
import SettingsDrawer, { DEFAULT_SETTINGS } from './SettingsDrawer';

const ACCEPTED_EXTENSIONS = ['.md', '.markdown', '.docx', '.pdf'];

export default function FileConverter() {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConvertingAll, setIsConvertingAll] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<{ title: string; markdown: string; warnings?: string[] } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_SETTINGS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persistent settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem('docmorph_export_settings');
      if (stored) setSettings(JSON.parse(stored));
    } catch {}
  }, []);

  const detectDirection = (fileName: string): ConversionDirection => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'docx') return 'docx-to-md';
    if (ext === 'pdf') return 'pdf-to-md';
    return 'md-to-docx';
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setGlobalError(null);

    const newItems: ConversionItem[] = [];

    Array.from(files).forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setGlobalError(`File "${file.name}" has an unsupported format. Please upload .md, .docx, or .pdf files.`);
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        setGlobalError(`File "${file.name}" exceeds the maximum 25MB limit.`);
        return;
      }

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        direction: detectDirection(file.name),
        status: 'idle',
        progress: 0,
      });
    });

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateItemDirection = (id: string, direction: ConversionDirection) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, direction, status: 'idle', resultBlob: undefined, resultUrl: undefined, error: undefined }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    setItems([]);
    setGlobalError(null);
  };

  const convertSingle = async (item: ConversionItem) => {
    if (!item.file) return;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'converting', progress: 40, error: undefined } : i))
    );

    try {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('direction', item.direction);
      formData.append('settings', JSON.stringify(settings));

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
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

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'success',
                progress: 100,
                resultBlob: blob,
                resultUrl: url,
                resultFileName: data.fileName,
                resultText: data.text,
                warnings: data.warnings,
                ocrUsed: data.ocrUsed,
              }
            : i
        )
      );
    } catch (err: any) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'error',
                progress: 0,
                error: err.message || 'Failed to convert file',
              }
            : i
        )
      );
    }
  };

  const convertAll = async () => {
    const pendingItems = items.filter((i) => i.status !== 'success');
    if (pendingItems.length === 0) return;

    setIsConvertingAll(true);
    setGlobalError(null);

    for (const item of pendingItems) {
      await convertSingle(item);
    }

    setIsConvertingAll(false);
  };

  const downloadSingle = (item: ConversionItem) => {
    if (!item.resultUrl || !item.resultFileName) return;
    const a = document.createElement('a');
    a.href = item.resultUrl;
    a.download = item.resultFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllAsZip = async () => {
    const successItems = items.filter((i) => i.status === 'success' && i.file);
    if (successItems.length === 0) return;

    try {
      const formData = new FormData();
      successItems.forEach((item, index) => {
        if (item.file) {
          formData.append('files', item.file);
          formData.append(`direction_${index}`, item.direction);
        }
      });
      formData.append('settings', JSON.stringify(settings));

      const response = await fetch('/api/batch-convert?zip=true', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate batch zip archive');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DocMorph_Batch_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setGlobalError(err.message || 'Error downloading zip archive');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFormatBadge = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'docx') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>DOCX</span>
        </span>
      );
    }
    if (ext === 'pdf') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <FileText className="w-3.5 h-3.5" />
          <span>PDF</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
        <FileCode className="w-3.5 h-3.5" />
        <span>MD</span>
      </span>
    );
  };

  const successCount = items.filter((i) => i.status === 'success').length;
  const isAllConverted = items.length > 0 && successCount === items.length;

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group overflow-hidden rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'ring-4 ring-blue-500/40 bg-blue-50/80 dark:bg-blue-950/30 scale-[0.99] border-blue-500'
            : 'border-2 border-dashed border-slate-300/80 dark:border-white/15 bg-white/60 dark:bg-slate-900/40 hover:border-blue-500/60 dark:hover:border-blue-500/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/60'
        } backdrop-blur-xl shadow-xl shadow-slate-900/5`}
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none" />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".md,.markdown,.docx,.pdf"
          onChange={onFileChange}
          className="hidden"
        />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-500/20 dark:via-indigo-500/20 dark:to-purple-500/20 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300 shadow-inner">
            <UploadCloud className="w-10 h-10 stroke-[1.6]" />
          </div>

          <div className="space-y-1.5 max-w-lg">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Drag & Drop your documents here
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Convert between <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">Markdown</strong>,{' '}
              <strong className="text-blue-600 dark:text-blue-400 font-semibold">Word (DOCX)</strong>, and{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-semibold">PDF</strong> with full OCR text recovery.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/25 transition-all duration-200 flex items-center space-x-2"
            >
              <FileUp className="w-4 h-4" />
              <span>Browse Files</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center space-x-2 shadow-xs"
            >
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span>Conversion Settings</span>
            </button>
          </div>

          {/* Quick format tags */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
              Supported 360° Routes:
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              MD ➔ DOCX / PDF
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              DOCX ➔ MD / PDF
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              PDF ➔ MD / DOCX
            </span>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {globalError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-between text-xs sm:text-sm backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span className="font-medium">{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-xs font-bold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Section */}
      {items.length > 0 && (
        <div className="rounded-3xl glass-panel shadow-2xl overflow-hidden transition-all duration-300">
          {/* Header Action Bar */}
          <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Queue ({items.length})
              </span>
              {successCount > 0 && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  <Check className="w-3 h-3" />
                  <span>{successCount} Ready</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Settings"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Sliders className="w-4 h-4 text-indigo-500" />
              </button>

              {successCount > 1 && (
                <button
                  onClick={downloadAllAsZip}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all duration-150"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Download ZIP ({successCount})</span>
                </button>
              )}

              <button
                onClick={convertAll}
                disabled={isConvertingAll || isAllConverted}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-blue-500/25 transition-all duration-150"
              >
                {isConvertingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>{isAllConverted ? 'All Converted' : 'Convert All'}</span>
              </button>

              <button
                onClick={clearAll}
                title="Clear all files"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Queue Items List */}
          <div className="divide-y divide-slate-200/60 dark:divide-white/5">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Format Badge, Title, Size */}
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {getFormatBadge(item.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
                        {item.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                        <span>{formatFileSize(item.size)}</span>
                        {item.ocrUsed && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-sans font-bold">
                            🔍 OCR Enabled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Conversion Target Selector (Cross-format 360 enabled!) */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                      Target:
                    </span>
                    <select
                      value={item.direction}
                      onChange={(e) => updateItemDirection(item.id, e.target.value as ConversionDirection)}
                      disabled={item.status === 'converting'}
                      className="text-xs font-semibold bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-xs cursor-pointer"
                    >
                      {item.name.toLowerCase().endsWith('.docx') ? (
                        <>
                          <option value="docx-to-md">Word ➔ Markdown (.md)</option>
                          <option value="docx-to-pdf">Word ➔ PDF (.pdf)</option>
                        </>
                      ) : item.name.toLowerCase().endsWith('.pdf') ? (
                        <>
                          <option value="pdf-to-md">PDF ➔ Markdown (.md)</option>
                          <option value="pdf-to-docx">PDF ➔ Word (.docx)</option>
                        </>
                      ) : (
                        <>
                          <option value="md-to-docx">Markdown ➔ Word (.docx)</option>
                          <option value="md-to-pdf">Markdown ➔ PDF (.pdf)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    {item.status === 'converting' && (
                      <div className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400 text-xs font-semibold px-3 py-1.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    )}

                    {item.status === 'success' && (
                      <div className="flex items-center space-x-2">
                        {item.resultText && (
                          <button
                            onClick={() =>
                              setPreviewItem({
                                title: item.resultFileName || item.name,
                                markdown: item.resultText || '',
                                warnings: item.warnings,
                              })
                            }
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        )}
                        <button
                          onClick={() => downloadSingle(item)}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all duration-150"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    )}

                    {item.status === 'idle' && (
                      <button
                        onClick={() => convertSingle(item)}
                        className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Convert</span>
                      </button>
                    )}

                    {item.status === 'error' && (
                      <button
                        onClick={() => convertSingle(item)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    )}

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Animated shimmer progress bar */}
                {item.status === 'converting' && (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                    <div className="absolute inset-y-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-full animate-shimmer rounded-full" />
                  </div>
                )}

                {/* Warnings alert for scanned PDFs or layout limits */}
                {item.warnings && item.warnings.length > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-2.5 text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {item.warnings.map((w, idx) => (
                        <p key={idx}>{w}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error alert */}
                {item.error && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2 text-xs text-rose-700 dark:text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{item.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <div className="p-5 rounded-3xl glass-card space-y-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
            01
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            Markdown ➔ DOCX / PDF
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Native Word formatting, table borders, styled code blocks, and custom page margins.
          </p>
        </div>

        <div className="p-5 rounded-3xl glass-card space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
            02
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            DOCX ➔ PDF / MD
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Directly export Word files to publication-grade vector PDFs or clean Markdown.
          </p>
        </div>

        <div className="p-5 rounded-3xl glass-card space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
            03
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            PDF ➔ Word / MD
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Convert PDFs back into editable Word documents or structured Markdown text.
          </p>
        </div>

        <div className="p-5 rounded-3xl glass-card space-y-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
            04
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            Tesseract OCR Built-in
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Automatic text recognition for scanned documents, images, and non-selectable PDFs.
          </p>
        </div>
      </div>

      {/* Markdown Preview Modal */}
      {previewItem && (
        <PreviewModal
          isOpen={true}
          onClose={() => setPreviewItem(null)}
          title={previewItem.title}
          markdown={previewItem.markdown}
          warnings={previewItem.warnings}
        />
      )}

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />
    </div>
  );
}
