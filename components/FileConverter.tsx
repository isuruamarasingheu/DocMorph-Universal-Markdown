'use client';

import React, { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react';
import { AlertCircle, Check, Download, Eye, Loader2, RotateCw, SlidersHorizontal, X } from 'lucide-react';
import { ConversionDirection, ConversionItem, ExportSettings } from '@/lib/types';
import PreviewModal from './PreviewModal';
import SettingsDrawer, { DEFAULT_SETTINGS } from './SettingsDrawer';

const ACCEPTED_EXTENSIONS = ['.md', '.markdown', '.docx', '.pdf'];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

type Format = 'md' | 'docx' | 'pdf';

const FORMAT_NAME: Record<Format, string> = { md: 'Markdown', docx: 'Word', pdf: 'PDF' };

const ROUTES: Record<Format, { value: ConversionDirection; label: string }[]> = {
  md: [
    { value: 'md-to-docx', label: 'Word (.docx)' },
    { value: 'md-to-pdf', label: 'PDF (.pdf)' },
  ],
  docx: [
    { value: 'docx-to-md', label: 'Markdown (.md)' },
    { value: 'docx-to-pdf', label: 'PDF (.pdf)' },
  ],
  pdf: [
    { value: 'pdf-to-md', label: 'Markdown (.md)' },
    { value: 'pdf-to-docx', label: 'Word (.docx)' },
  ],
};

function formatOf(fileName: string): Format {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'docx') return 'docx';
  if (ext === 'pdf') return 'pdf';
  return 'md';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

/** A small sheet with a folded corner, labelled with the file's format. */
function FileGlyph({ format }: { format: Format }) {
  return (
    <span className="relative inline-flex h-11 w-9 shrink-0 items-end justify-center pb-1.5" aria-hidden="true">
      <svg viewBox="0 0 36 44" className="absolute inset-0 h-full w-full text-rule">
        <path d="M1 1h24l10 10v32H1z" fill="rgb(var(--paper))" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M25 1v10h10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className="relative text-[10px] font-bold uppercase tracking-[0.02em] text-ink">{format}</span>
    </span>
  );
}

function ConversionMatrix() {
  const formats: Format[] = ['md', 'docx', 'pdf'];
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">What converts to what</h2>
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">Rows are the format you start with, columns are the format you get.</caption>
        <thead>
          <tr className="text-left text-ink-soft">
            <th scope="col" className="pb-2 pr-2 font-normal">
              <span className="sr-only">From</span>
            </th>
            {formats.map((f) => (
              <th key={f} scope="col" className="pb-2 px-1 text-center font-medium">
                {FORMAT_NAME[f]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {formats.map((from) => (
            <tr key={from} className="border-t border-rule/70">
              <th scope="row" className="py-2.5 pr-2 text-left font-medium text-ink">
                {FORMAT_NAME[from]}
              </th>
              {formats.map((to) => (
                <td key={to} className="py-2.5 px-1 text-center">
                  {from === to ? (
                    <span className="text-rule" aria-label="Same format">
                      —
                    </span>
                  ) : (
                    <Check className="mx-auto h-4 w-4 text-proof" aria-label={`${FORMAT_NAME[from]} to ${FORMAT_NAME[to]}`} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        Up to 25 MB per file. When two or more files are converted you can download them together as a ZIP.
      </p>
    </div>
  );
}

export default function FileConverter() {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConvertingAll, setIsConvertingAll] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<{ title: string; markdown: string; warnings?: string[] } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_SETTINGS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  // Load persistent settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem('docmorph_export_settings');
      if (stored) setSettings(JSON.parse(stored));
    } catch {}
  }, []);

  const releaseResult = (item: ConversionItem) => {
    if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setGlobalError(null);

    const newItems: ConversionItem[] = [];
    const rejected: string[] = [];

    Array.from(files).forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        rejected.push(`${file.name} isn't a Markdown, Word or PDF file.`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} is ${formatFileSize(file.size)}; the limit is 25 MB.`);
        return;
      }
      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        direction: ROUTES[formatOf(file.name)][0].value,
        status: 'idle',
        progress: 0,
      });
    });

    if (rejected.length > 0) {
      setGlobalError(`Skipped: ${rejected.join(' ')}`);
    }
    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }
  };

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateItemDirection = (id: string, direction: ConversionDirection) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        releaseResult(item);
        return {
          ...item,
          direction,
          status: 'idle',
          resultBlob: undefined,
          resultUrl: undefined,
          resultFileName: undefined,
          resultText: undefined,
          warnings: undefined,
          error: undefined,
        };
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) releaseResult(target);
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach(releaseResult);
    setItems([]);
    setGlobalError(null);
  };

  const convertSingle = async (item: ConversionItem) => {
    if (!item.file) return;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'converting', progress: 40, error: undefined, warnings: undefined } : i))
    );

    try {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('direction', item.direction);
      formData.append('settings', JSON.stringify(settings));

      const response = await fetch('/api/convert', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'The server could not convert this file.');
      }

      const blob = base64ToBlob(data.dataBase64, data.mimeType);
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
          i.id === item.id ? { ...i, status: 'error', progress: 0, error: err.message || 'The server could not convert this file.' } : i
        )
      );
    }
  };

  const convertAll = async () => {
    const pendingItems = items.filter((i) => i.status !== 'success' && i.status !== 'converting');
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

      const response = await fetch('/api/batch-convert?zip=true', { method: 'POST', body: formData });
      if (!response.ok) {
        throw new Error('The ZIP could not be created. Try downloading the files one at a time.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DocMorph_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setGlobalError(err.message || 'The ZIP could not be created.');
    }
  };

  const successCount = items.filter((i) => i.status === 'success').length;
  const pendingCount = items.filter((i) => i.status !== 'success').length;

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.markdown,.docx,.pdf"
        onChange={onFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_16.5rem] lg:gap-16">
        {/* Drop sheet with crop marks */}
        <div className="crop mx-[22px] sm:mx-9" data-active={isDragging}>
          <span className="crop-mark tl" />
          <span className="crop-mark tr" />
          <span className="crop-mark bl" />
          <span className="crop-mark br" />

          <div
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`sheet flex min-h-[280px] cursor-pointer flex-col justify-between gap-10 p-7 transition-colors sm:min-h-[340px] sm:p-10 ${
              isDragging ? 'bg-proof-wash' : ''
            }`}
          >
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.025em] text-ink sm:text-[2rem]">
                {isDragging ? (
                  'Release to add these files'
                ) : (
                  <>
                    <span className="sm:hidden">Add documents to convert</span>
                    <span className="hidden sm:inline">Drop documents on this page</span>
                  </>
                )}
              </h2>
              <p className="mt-2 max-w-[44ch] text-ink-soft">
                Markdown (.md), Word (.docx) or PDF. You can add several at once.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="btn-primary px-5 py-2.5"
              >
                Choose files
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSettingsOpen(true);
                }}
                className="btn-quiet"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Export options
              </button>
            </div>
          </div>
        </div>

        <aside className="lg:pt-2">
          <ConversionMatrix />
        </aside>
      </div>

      {globalError && (
        <div role="alert" className="mt-10 flex items-start gap-3 border-l-[3px] border-pencil bg-paper px-4 py-3 text-sm text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-pencil" aria-hidden="true" />
          <p className="flex-1">{globalError}</p>
          <button type="button" onClick={() => setGlobalError(null)} className="font-semibold text-ink-soft hover:text-ink">
            Dismiss
          </button>
        </div>
      )}

      {items.length > 0 && (
        <section aria-labelledby="files-heading" className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="files-heading" className="text-xl font-bold tracking-[-0.02em] text-ink">
                Your files
              </h2>
              <p className="mt-1 text-sm text-ink-soft" aria-live="polite">
                {items.length} {items.length === 1 ? 'file' : 'files'}
                {successCount > 0 && `, ${successCount} converted`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={clearAll} className="btn-quiet text-ink-soft">
                Clear list
              </button>
              {successCount > 1 && (
                <button type="button" onClick={downloadAllAsZip} className="btn-outline">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download all as ZIP
                </button>
              )}
              <button type="button" onClick={convertAll} disabled={isConvertingAll || pendingCount === 0} className="btn-primary">
                {isConvertingAll && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isConvertingAll ? 'Converting…' : pendingCount === 0 ? 'All converted' : `Convert all (${pendingCount})`}
              </button>
            </div>
          </div>

          <ul className="sheet mt-5 divide-y divide-rule/70">
            {items.map((item) => {
              const format = formatOf(item.name);
              return (
                <li key={item.id} className="animate-riseIn relative px-4 py-4 sm:px-6">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 md:grid-cols-[auto_minmax(0,1fr)_13rem_11.5rem]">
                    <FileGlyph format={format} />

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink" title={item.name}>
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        <span className="tabular-nums">{formatFileSize(item.size)}</span>
                        {item.status === 'converting' && <span>, converting…</span>}
                        {item.status === 'success' && (
                          <span className="text-go">
                            , ready as {item.resultFileName}
                            {item.ocrUsed && ' (text read with OCR)'}
                          </span>
                        )}
                        {item.status === 'error' && <span className="text-pencil">, not converted</span>}
                      </p>
                    </div>

                    {/* On small screens the route and actions share a second row; on md+ they become grid columns. */}
                    <div className="col-span-2 flex items-center gap-2 md:contents">
                    <label className="min-w-0 flex-1 md:col-start-3 md:row-start-1">
                      <span className="sr-only">Convert {item.name} to</span>
                      <select
                        value={item.direction}
                        onChange={(e) => updateItemDirection(item.id, e.target.value as ConversionDirection)}
                        disabled={item.status === 'converting'}
                        className="field"
                      >
                        {ROUTES[format].map((r) => (
                          <option key={r.value} value={r.value}>
                            To {r.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="flex shrink-0 items-center justify-end gap-1 md:col-start-4 md:row-start-1">
                      {item.status === 'success' ? (
                        <>
                          {item.resultText && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewItem({
                                  title: item.resultFileName || item.name,
                                  markdown: item.resultText || '',
                                  warnings: item.warnings,
                                })
                              }
                              className="btn-icon"
                              aria-label={`Preview ${item.resultFileName}`}
                              title="Preview"
                            >
                              <Eye className="h-[18px] w-[18px]" />
                            </button>
                          )}
                          <button type="button" onClick={() => downloadSingle(item)} className="btn-primary">
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Download
                          </button>
                        </>
                      ) : item.status === 'error' ? (
                        <button type="button" onClick={() => convertSingle(item)} className="btn-outline">
                          <RotateCw className="h-4 w-4" aria-hidden="true" />
                          Try again
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => convertSingle(item)}
                          disabled={item.status === 'converting'}
                          className="btn-outline"
                        >
                          {item.status === 'converting' ? 'Converting…' : 'Convert'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={item.status === 'converting'}
                        className="btn-icon hover:text-pencil"
                        aria-label={`Remove ${item.name}`}
                        title="Remove"
                      >
                        <X className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                    </div>
                  </div>

                  {item.warnings && item.warnings.length > 0 && (
                    <div className="mt-3 rounded-sheet bg-marker px-3.5 py-2.5 text-sm leading-relaxed text-marker-ink md:ml-[3.25rem]">
                      {item.warnings.map((w, idx) => (
                        <p key={idx}>{w}</p>
                      ))}
                    </div>
                  )}

                  {item.error && (
                    <p className="mt-3 flex items-start gap-2 text-sm text-pencil md:ml-[3.25rem]">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {item.error}
                    </p>
                  )}

                  {item.status === 'converting' && <div className="progress-line" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {previewItem && (
        <PreviewModal
          isOpen={true}
          onClose={() => setPreviewItem(null)}
          title={previewItem.title}
          markdown={previewItem.markdown}
          warnings={previewItem.warnings}
          fontFamily={settings.fontFamily}
        />
      )}

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />
    </div>
  );
}
