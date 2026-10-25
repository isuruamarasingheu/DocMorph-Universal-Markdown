export type ConversionFormat = 'md' | 'docx' | 'pdf';

export type ConversionDirection =
  | 'md-to-docx'
  | 'md-to-pdf'
  | 'docx-to-md'
  | 'pdf-to-md';

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
  resultText?: string; // For markdown preview
  warnings?: string[];
  error?: string;
}

export interface ConvertApiResult {
  success: boolean;
  fileName: string;
  mimeType: string;
  dataBase64?: string;
  text?: string;
  warnings?: string[];
  error?: string;
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
