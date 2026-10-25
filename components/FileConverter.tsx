'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
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
} from 'lucide-react';
import { ConversionDirection, ConversionItem } from '@/lib/types';
import PreviewModal from './PreviewModal';

const ACCEPTED_EXTENSIONS = ['.md', '.markdown', '.docx', '.pdf'];

export default function FileConverter() {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConvertingAll, setIsConvertingAll] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<{ title: string; markdown: string; warnings?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect conversion direction based on file extension
  const detectDirection = (fileName: string): ConversionDirection => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'docx') return 'docx-to-md';
    if (ext === 'pdf') return 'pdf-to-md';
    return 'md-to-docx'; // default for .md is to DOCX, user can change to PDF
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
      prev.map((item) => (item.id === id ? { ...item, direction, status: 'idle', resultBlob: undefined, resultUrl: undefined } : item))
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
      prev.map((i) => (i.id === item.id ? { ...i, status: 'converting', progress: 30, error: undefined } : i))
    );

    try {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('direction', item.direction);

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Conversion failed');
      }

      // Decode base64 result into Blob
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

    // Convert each file sequentially or concurrently
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

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'docx') return <FileSpreadsheet className="w-5 h-5 text-blue-600" />;
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-600" />;
    return <FileCode className="w-5 h-5 text-indigo-600" />;
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
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer overflow-hidden ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[0.99]'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-50/60 dark:hover:bg-slate-850/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".md,.markdown,.docx,.pdf"
          onChange={onFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <UploadCloud className="w-8 h-8 stroke-[1.75]" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100">
              Drag and drop your files here
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Supports <span className="font-medium text-slate-700 dark:text-slate-300">Markdown (.md)</span>,{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">Word (.docx)</span>, and{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">PDF (.pdf)</span> up to 25MB each.
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium shadow-sm transition-colors flex items-center space-x-2"
            >
              <FileUp className="w-4 h-4" />
              <span>Browse Files</span>
            </button>
            <span className="text-xs text-slate-400">or drop multiple files at once</span>
          </div>
        </div>
      </div>

      {/* Global Error Notice */}
      {globalError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-rose-700 dark:text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-xs underline font-medium hover:text-rose-900 dark:hover:text-rose-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Conversion Queue */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Queue Header & Actions */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                Files Queue ({items.length})
              </span>
              {successCount > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                  {successCount} converted
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {successCount > 1 && (
                <button
                  onClick={downloadAllAsZip}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Download ZIP ({successCount})</span>
                </button>
              )}

              <button
                onClick={convertAll}
                disabled={isConvertingAll || isAllConverted}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
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
                title="Clear queue"
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Queue Items List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Icon, Name, Size */}
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
                      {getFileIcon(item.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-sm sm:max-w-md">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatFileSize(item.size)}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Conversion Selector */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 hidden sm:inline">Convert to:</span>
                    <select
                      value={item.direction}
                      onChange={(e) => updateItemDirection(item.id, e.target.value as ConversionDirection)}
                      disabled={item.status === 'converting'}
                      className="text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {item.name.toLowerCase().endsWith('.docx') ? (
                        <option value="docx-to-md">Word ➔ Markdown (.md)</option>
                      ) : item.name.toLowerCase().endsWith('.pdf') ? (
                        <option value="pdf-to-md">PDF ➔ Markdown (.md)</option>
                      ) : (
                        <>
                          <option value="md-to-docx">Markdown ➔ Word (.docx)</option>
                          <option value="md-to-pdf">Markdown ➔ PDF (.pdf)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    {item.status === 'converting' && (
                      <div className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Converting...</span>
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
                            title="Preview Markdown"
                            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        )}
                        <button
                          onClick={() => downloadSingle(item)}
                          className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    )}

                    {item.status === 'idle' && (
                      <button
                        onClick={() => convertSingle(item)}
                        className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Convert</span>
                      </button>
                    )}

                    {item.status === 'error' && (
                      <button
                        onClick={() => convertSingle(item)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    )}

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar when converting */}
                {item.status === 'converting' && (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full w-2/3 animate-pulse rounded-full" />
                  </div>
                )}

                {/* Warnings alert (e.g. Scanned PDF or Mammoth format notifications) */}
                {item.warnings && item.warnings.length > 0 && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start space-x-2 text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {item.warnings.map((w, idx) => (
                        <p key={idx}>{w}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error alert if failed */}
                {item.error && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center space-x-2 text-xs text-rose-700 dark:text-rose-300">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Format 1
          </span>
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            Markdown ➔ DOCX
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Preserves headings, tables, styled code blocks, bullet points, and margins in native Word format.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Format 2
          </span>
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            Markdown ➔ PDF
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Publication-grade vector PDF with syntax highlighting, page numbers, and custom typography.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Format 3
          </span>
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            DOCX ➔ Markdown
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Reverse converts Microsoft Word files into clean GitHub Flavored Markdown with tables and images.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Format 4
          </span>
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            PDF ➔ Markdown
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Smart structure extraction detecting headings, lists, tables, and warnings for scanned documents.
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
    </div>
  );
}
