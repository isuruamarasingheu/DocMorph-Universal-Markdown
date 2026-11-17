'use client';

import React from 'react';
import ThemeToggle from './ThemeToggle';

export type AppTab = 'converter' | 'studio';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const TABS: { id: AppTab; label: string }[] = [
  { id: 'converter', label: 'Convert files' },
  { id: 'studio', label: 'Write Markdown' },
];

function Mark() {
  // A sheet with a folded corner: the fold is the "proof" colour.
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true" className="shrink-0">
      <path d="M1.5 1.5h12l7 7v16h-19z" fill="rgb(var(--paper))" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13.5 1.5v7h7" fill="rgb(var(--proof))" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5.5 14h11M5.5 18h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = TABS.findIndex((t) => t.id === activeTab);
    const next = TABS[(idx + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setActiveTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <header className="border-b border-rule/80 bg-desk">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-6 px-4 sm:grid-cols-[auto_1fr_auto] sm:px-8">
        <a href="/" className="col-start-1 row-start-1 flex h-14 items-center gap-2.5 text-ink" aria-label="DocMorph home">
          <Mark />
          <span className="text-[1.05rem] font-bold tracking-[-0.02em]">DocMorph</span>
        </a>

        <div
          role="tablist"
          aria-label="Mode"
          onKeyDown={onKeyDown}
          className="col-span-2 col-start-1 row-start-2 -mb-px flex gap-6 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:ml-4"
        >
          {TABS.map((tab) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="main-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`relative h-11 text-sm font-semibold transition-colors sm:h-14 ${
                  selected ? 'text-ink' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {tab.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-[2px] transition-colors ${selected ? 'bg-proof' : 'bg-transparent'}`}
                />
              </button>
            );
          })}
        </div>

        <div className="col-start-2 row-start-1 flex justify-end sm:col-start-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
