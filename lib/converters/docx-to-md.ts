import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export interface DocxToMdResult {
  markdown: string;
  warnings: string[];
}

export async function convertDocxToMarkdown(docxBuffer: Buffer): Promise<DocxToMdResult> {
  const warnings: string[] = [];

  // Style map to accurately detect Word built-in and custom headings & code styles
  const styleMap = [
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Heading 4'] => h4:fresh",
    "p[style-name='Heading 5'] => h5:fresh",
    "p[style-name='Heading 6'] => h6:fresh",
    "p[style-name='Title'] => h1:fresh",
    "p[style-name='Subtitle'] => h2:fresh",
    "p[style-name='Quote'] => blockquote:fresh",
    "p[style-name='Blockquote'] => blockquote:fresh",
    "p[style-name='Code Block'] => pre:fresh",
    "p[style-name='Code'] => pre:fresh",
    "r[style-name='Code'] => code",
    "r[style-name='Inline Code'] => code",
    "r[style-name='Strike'] => del",
    "r[style-name='Strikethrough'] => del",
  ];

  const mammothOptions = {
    styleMap,
    convertImage: mammoth.images.imgElement((image) => {
      return image.read('base64').then((imageBuffer) => {
        return {
          src: `data:${image.contentType};base64,${imageBuffer}`,
        };
      });
    }),
  };

  const mammothResult = await mammoth.convertToHtml({ buffer: docxBuffer }, mammothOptions);

  if (mammothResult.messages && mammothResult.messages.length > 0) {
    for (const msg of mammothResult.messages) {
      if (msg.type === 'warning') {
        warnings.push(`Word document parsing: ${msg.message}`);
      }
    }
  }

  // Setup Turndown with GitHub Flavored Markdown
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  // Enable GFM plugin (tables, strikethrough, task lists)
  turndownService.use(gfm);

  // Custom rule for inline code tags inside pre
  turndownService.addRule('preCode', {
    filter: ['pre'],
    replacement: function (content: string, node: any) {
      const codeElement = node.querySelector ? node.querySelector('code') : null;
      const codeContent = codeElement ? codeElement.textContent : node.textContent;
      const lang = (node.getAttribute && node.getAttribute('data-language')) || '';
      return `\n\n\`\`\`${lang}\n${codeContent.trim()}\n\`\`\`\n\n`;
    },
  });

  // Convert HTML to Markdown
  let markdown = turndownService.turndown(mammothResult.value);

  // Normalize excessive blank lines (more than 2 consecutive newlines)
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  return {
    markdown,
    warnings,
  };
}
