/**
 * Thin wrapper around SheetJS (xlsx) loaded dynamically.
 * Uses a CDN import with a module declaration fallback.
 */

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

let _cached: XlsxLib | null = null;

/**
 * Loads the SheetJS (xlsx) library.
 * First checks if it's already available on window (e.g. from a CDN script tag),
 * otherwise loads it via CDN. Caches the result after first load.
 */
export async function loadXlsx(): Promise<XlsxLib> {
  if (_cached) return _cached;

  // Try window.XLSX if already loaded
  const win =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, unknown>)
      : {};
  if (win.XLSX) {
    _cached = win.XLSX as XlsxLib;
    return _cached;
  }

  // Load from CDN
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector("script[data-xlsx]");
    if (existing) {
      // Already loading – wait for it
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("xlsx CDN load failed")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    script.setAttribute("data-xlsx", "true");
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("xlsx CDN load failed"));
    document.head.appendChild(script);
  });

  _cached = (window as unknown as Record<string, unknown>).XLSX as XlsxLib;
  if (!_cached) throw new Error("xlsx not available after CDN load");
  return _cached;
}
