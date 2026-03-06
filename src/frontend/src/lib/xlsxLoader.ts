/**
 * Thin wrapper around the bundled SheetJS (xlsx) package.
 * This replaces the old CDN-based dynamic loader which silently hung
 * when the CDN was slow or blocked.
 */

import * as XLSXPkg from "xlsx";

// ── Minimal types for the xlsx API surface we actually use ────────────────────

export interface SSFDateCode {
  y: number;
  m: number;
  d: number;
}

export interface XlsxSSF {
  parse_date_code(serial: number): SSFDateCode | null | undefined;
}

export interface XlsxUtils {
  book_new(): XlsxWorkBook;
  book_append_sheet(wb: XlsxWorkBook, ws: XlsxWorkSheet, name: string): void;
  aoa_to_sheet(data: unknown[][]): XlsxWorkSheet;
  sheet_to_json(
    ws: XlsxWorkSheet,
    opts?: { defval?: unknown },
  ): Record<string, unknown>[];
}

export interface XlsxColInfo {
  wch?: number;
}

export interface XlsxWorkSheet {
  "!cols"?: XlsxColInfo[];
  [key: string]: unknown;
}

export interface XlsxWorkBook {
  SheetNames: string[];
  Sheets: Record<string, XlsxWorkSheet>;
}

export interface XlsxLib {
  read(data: Uint8Array, opts: { type: "array" }): XlsxWorkBook;
  writeFile(wb: XlsxWorkBook, filename: string): void;
  utils: XlsxUtils;
  SSF: XlsxSSF;
}

// ── Loader ────────────────────────────────────────────────────────────────────

/**
 * Returns the bundled xlsx library synchronously wrapped in a Promise
 * for backwards compatibility with all existing call sites that use
 * `loadXlsx().then(...)` or `await loadXlsx()`.
 */
export function loadXlsx(): Promise<XlsxLib> {
  // The xlsx package is now bundled at build time -- no CDN, no network call.
  return Promise.resolve(XLSXPkg as unknown as XlsxLib);
}
