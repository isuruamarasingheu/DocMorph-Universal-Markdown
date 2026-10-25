declare module 'html-to-docx' {
  interface HTMLtoDOCXOptions {
    title?: string;
    creator?: string;
    description?: string;
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    font?: string;
    fontSize?: number;
    table?: {
      row?: {
        cantSplit?: boolean;
      };
    };
    footer?: boolean;
    pageNumber?: boolean;
    header?: boolean;
  }

  function HTMLtoDOCX(
    html: string,
    headerHtml?: string | null,
    options?: HTMLtoDOCXOptions,
    footerHtml?: string | null
  ): Promise<Buffer | Blob>;

  export default HTMLtoDOCX;
}

declare module 'turndown-plugin-gfm' {
  export const gfm: any;
  export const tables: any;
  export const strikethrough: any;
  export const taskListItems: any;
}

declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  function PDFParse(
    dataBuffer: Buffer,
    options?: any
  ): Promise<PDFData>;

  export default PDFParse;
}
