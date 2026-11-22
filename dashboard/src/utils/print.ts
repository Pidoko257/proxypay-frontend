export interface PrintOptions {
  documentStyles?: string;
  documentTitle?: string;
}

/**
 * Opens a new window, writes the provided HTML content into it, and triggers
 * the browser print dialog.
 */
export function openPrintWindow(
  content: string,
  options: PrintOptions = {},
): Window | null {
  const { documentStyles, documentTitle } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return null;
  }

  const doc = printWindow.document;

  doc.open();
  doc.write('<!DOCTYPE html><html><head></head><body></body></html>');
  doc.close();

  if (documentTitle) {
    doc.title = documentTitle;
  }

  if (documentStyles) {
    const styleElement = doc.createElement('style');
    styleElement.textContent = documentStyles;
    (doc.head ?? doc.documentElement).appendChild(styleElement);
  }

  doc.body.innerHTML = content;

  printWindow.focus();
  printWindow.print();

  return printWindow;
}
