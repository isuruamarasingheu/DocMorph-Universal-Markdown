'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar, { AppTab } from '@/components/Navbar';
import FileConverter from '@/components/FileConverter';

// The editor is only needed in "Write Markdown", so load it on demand.
const MarkdownStudio = dynamic(() => import('@/components/MarkdownStudio'), {
  loading: () => <div className="sheet h-[70vh] min-h-[480px]" aria-busy="true" aria-label="Loading editor" />,
  ssr: false,
});

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>('converter');

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main
        id="main-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-10 sm:px-8 sm:pt-14"
      >
        {activeTab === 'converter' ? (
          <>
            <h1 className="max-w-[15ch] text-[2.6rem] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[4.25rem] lg:text-[5rem]">
              Turn Markdown, Word and PDF into each other.
            </h1>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-ink-soft sm:text-lg">
              Drop in files, pick what each one should become, and download the result. Scanned PDFs are read with OCR.
            </p>
            <div className="mt-12 sm:mt-16">
              <FileConverter />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-4xl">
              Write Markdown, export Word or PDF.
            </h1>
            <p className="mt-2 max-w-[60ch] text-ink-soft">
              The page on the right uses the same fonts and layout as your PDF export.
            </p>
            <div className="mt-8">
              <MarkdownStudio />
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-rule/80">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-soft sm:px-8">
          Files are converted on this server and aren&apos;t kept after the conversion finishes.
        </p>
      </footer>
    </div>
  );
}
