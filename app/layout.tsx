import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocMorph - Universal Markdown, Word & PDF Converter',
  description:
    'High-fidelity document converter between Markdown, DOCX, and PDF formats with structure preservation, syntax highlighting, and batch processing.',
  keywords: ['markdown', 'docx', 'pdf', 'converter', 'turndown', 'mammoth', 'puppeteer', 'batch converter'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
