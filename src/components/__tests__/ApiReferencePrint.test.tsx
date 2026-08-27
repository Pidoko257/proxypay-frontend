import fs from 'fs';
import path from 'path';
import { saveAsPdf } from '../IntegratedApiReference';

/**
 * Covers issue #395 — the API reference is printable / "Save as PDF"-able and
 * ships a dedicated print-friendly layout so elements no longer overlap on paper.
 *
 * NOTE: written for Jest + @testing-library/react; add a runner to execute.
 */
describe('API reference print support (#395)', () => {
  it('saveAsPdf triggers the browser print dialog', () => {
    const printSpy = jest.fn();
    (window as unknown as { print: () => void }).print = printSpy;
    saveAsPdf();
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('ships a print-friendly stylesheet that flattens the layout', () => {
    const css = fs.readFileSync(
      path.join(__dirname, '..', 'ApiReference.module.css'),
      'utf8',
    );
    expect(css).toMatch(/@media print/);
    // Interactive chrome is hidden and the scrollable containers are unclipped.
    expect(css).toMatch(/\.savePdfButton[\s\S]*display:\s*none/);
    expect(css).toMatch(/overflow:\s*visible\s*!important/);
    expect(css).toMatch(/page-break-inside:\s*avoid/);
  });
});
