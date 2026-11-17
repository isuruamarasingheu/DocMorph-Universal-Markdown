import DOMPurify from 'dompurify';

/**
 * Sanitizes rendered Markdown HTML before it is injected with dangerouslySetInnerHTML.
 * Strips scripts, event handlers, javascript: URLs, iframes, forms, etc.
 *
 * DOMPurify needs a DOM, so during server-side rendering this returns an empty
 * string; previews are populated on the client.
 */
export function sanitizePreviewHtml(html: string): string {
  if (typeof window === 'undefined' || !DOMPurify.isSupported) {
    return '';
  }
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
  });
}
