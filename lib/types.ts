export type ConversionFormat = 'md' | 'docx' | 'pdf';

export type ConversionDirection =
  | 'md-to-docx'
  | 'md-to-pdf'
  | 'docx-to-md'
  | 'docx-to-pdf'
  | 'pdf-to-md'
  | 'pdf-to-docx';

export interface ExportSettings {
  // PDF options
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margin?: 'normal' | 'compact' | 'wide';
  fontFamily?: 'sans' | 'serif' | 'mono';
  fontSize?: number;
  showPageNumbers?: boolean;
  showHeader?: boolean;
  printBackground?: boolean;
  // DOCX options
  docxFont?: string;
  docxFontSize?: number;
  docxMargin?: 'normal' | 'compact' | 'wide';
  // OCR options
  autoOcr?: boolean;
  ocrLanguage?: string;
}

export interface ConversionItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  direction: ConversionDirection;
  status: 'idle' | 'converting' | 'success' | 'error';
  progress: number;
  resultUrl?: string;
  resultBlob?: Blob;
  resultFileName?: string;
  resultText?: string;
  warnings?: string[];
  error?: string;
  ocrUsed?: boolean;
}

export interface ConvertApiResult {
  success: boolean;
  fileName: string;
  mimeType: string;
  dataBase64?: string;
  text?: string;
  warnings?: string[];
  error?: string;
  ocrUsed?: boolean;
  stats?: {
    inputBytes: number;
    outputBytes: number;
    durationMs: number;
    pages?: number;
  };
}

export interface DocumentMeta {
  title?: string;
  author?: string;
  createdAt?: string;
}
