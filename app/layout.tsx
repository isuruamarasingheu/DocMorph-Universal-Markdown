import type { Metadata } from 'next';
import { Schibsted_Grotesk, Fragment_Mono } from 'next/font/google';
import './globals.css';

const grotesk = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
});

const mono = Fragment_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-mono',
  display: 'swap',
  // next/font's metric-matched fallback is Arial, which makes source text
  // briefly proportional; fall back to a real monospace instead.
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'Consolas', 'Menlo', 'monospace'],
});

export const metadata: Metadata = {
  title: 'DocMorph: convert Markdown, Word and PDF',
  description:
    'Convert documents between Markdown, Word (.docx) and PDF, or write Markdown and export it. Scanned PDFs are read with OCR.',
};

// Applies the saved or system theme before first paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
