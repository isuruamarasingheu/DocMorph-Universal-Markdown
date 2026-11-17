'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
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

const MARGIN_NAME = { compact: 'narrow', normal: 'normal', wide: 'wide' } as const;

/** Short human description of the PDF page setup, e.g. "A4, portrait, normal margins". */
export function describePageSetup(s: ExportSettings): string {
  return `${s.pageSize || 'A4'}, ${s.orientation || 'portrait'}, ${MARGIN_NAME[s.margin || 'normal']} margins`;
}

interface Choice<T> {
  value: T;
  label: string;
  hint?: string;
}

function ChoiceGroup<T extends string | number>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: T;
  choices: Choice<T>[];
  onChange: (v: T) => void;
}) {
  const labelId = React.useId();
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink" id={labelId}>
        {label}
      </p>
      <div className="segmented flex w-full" role="radiogroup" aria-labelledby={labelId}>
        {choices.map((c) => (
          <button
            key={String(c.value)}
            type="button"
            role="radio"
            aria-checked={value === c.value}
            onClick={() => onChange(c.value)}
            title={c.hint}
            className="flex-1 text-center"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--proof))]"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-ink-soft">{description}</span>}
      </span>
    </label>
  );
}

export default function SettingsDrawer({ isOpen, onClose, settings, onUpdateSettings }: SettingsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll, close on Escape, and move focus into the drawer.
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

  const update = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    const updated = { ...settings, [key]: value };
    onUpdateSettings(updated);
    try {
      localStorage.setItem('docmorph_export_settings', JSON.stringify(updated));
    } catch {}
  };

  const resetDefaults = () => {
    onUpdateSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem('docmorph_export_settings', JSON.stringify(DEFAULT_SETTINGS));
    } catch {}
  };

  const margins: Choice<'compact' | 'normal' | 'wide'>[] = [
    { value: 'compact', label: 'Narrow' },
    { value: 'normal', label: 'Normal' },
    { value: 'wide', label: 'Wide' },
  ];

  return createPortal(
    <div
      onClick={onClose}
      className="animate-fadeIn fixed inset-0 z-[100] flex justify-end bg-[rgb(var(--shadow)/0.45)]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-options-title"
        className="animate-slideInRight flex h-full w-full max-w-[26rem] flex-col bg-paper shadow-sheet"
      >
        <div className="flex items-center justify-between border-b border-rule/70 px-6 py-4">
          <div>
            <h2 id="export-options-title" className="text-lg font-bold tracking-[-0.02em] text-ink">
              Export options
            </h2>
            <p className="text-sm text-ink-soft">Changes save automatically.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="btn-icon" aria-label="Close export options">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-9 overflow-y-auto px-6 py-6">
          <section className="space-y-5" aria-labelledby="opt-pdf">
            <h3 id="opt-pdf" className="text-base font-bold text-ink">
              PDF files
            </h3>
            <ChoiceGroup
              label="Paper size"
              value={settings.pageSize || 'A4'}
              onChange={(v) => update('pageSize', v)}
              choices={[
                { value: 'A4', label: 'A4' },
                { value: 'Letter', label: 'Letter' },
                { value: 'Legal', label: 'Legal' },
              ]}
            />
            <ChoiceGroup
              label="Orientation"
              value={settings.orientation || 'portrait'}
              onChange={(v) => update('orientation', v)}
              choices={[
                { value: 'portrait', label: 'Portrait' },
                { value: 'landscape', label: 'Landscape' },
              ]}
            />
            <ChoiceGroup
              label="Margins"
              value={settings.margin || 'normal'}
              onChange={(v) => update('margin', v)}
              choices={margins.map((m) => ({
                ...m,
                hint: { compact: '12 mm', normal: '20 mm', wide: '30 mm' }[m.value],
              }))}
            />
            <ChoiceGroup
              label="Font"
              value={settings.fontFamily || 'sans'}
              onChange={(v) => update('fontFamily', v)}
              choices={[
                { value: 'sans', label: 'Sans serif' },
                { value: 'serif', label: 'Serif' },
                { value: 'mono', label: 'Monospace' },
              ]}
            />
            <div className="space-y-3 pt-1">
              <Toggle
                label="Show the document title at the top of each page"
                checked={settings.showHeader ?? true}
                onChange={(v) => update('showHeader', v)}
              />
              <Toggle
                label="Number the pages"
                checked={settings.showPageNumbers ?? true}
                onChange={(v) => update('showPageNumbers', v)}
              />
            </div>
          </section>

          <section className="space-y-5 border-t border-rule/70 pt-8" aria-labelledby="opt-word">
            <h3 id="opt-word" className="text-base font-bold text-ink">
              Word files
            </h3>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Font</span>
              <select value={settings.docxFont || 'Calibri'} onChange={(e) => update('docxFont', e.target.value)} className="field">
                {['Calibri', 'Arial', 'Georgia', 'Times New Roman', 'Segoe UI'].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <ChoiceGroup
              label="Text size"
              value={settings.docxFontSize || 11}
              onChange={(v) => update('docxFontSize', v)}
              choices={[
                { value: 10, label: '10 pt' },
                { value: 11, label: '11 pt' },
                { value: 12, label: '12 pt' },
              ]}
            />
            <ChoiceGroup
              label="Margins"
              value={settings.docxMargin || 'normal'}
              onChange={(v) => update('docxMargin', v)}
              choices={margins.map((m) => ({
                ...m,
                hint: { compact: '0.5 in', normal: '1 in', wide: '1.5 in' }[m.value],
              }))}
            />
          </section>

          <section className="space-y-4 border-t border-rule/70 pt-8" aria-labelledby="opt-scan">
            <h3 id="opt-scan" className="text-base font-bold text-ink">
              Scanned PDFs
            </h3>
            <Toggle
              label="Read text from scanned pages (OCR)"
              description="Used only when a PDF has little or no selectable text. Conversion takes longer."
              checked={settings.autoOcr ?? true}
              onChange={(v) => update('autoOcr', v)}
            />
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-rule/70 px-6 py-4">
          <button type="button" onClick={resetDefaults} className="btn-quiet -ml-3.5 text-ink-soft">
            Reset to defaults
          </button>
          <button type="button" onClick={onClose} className="btn-primary px-5">
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
