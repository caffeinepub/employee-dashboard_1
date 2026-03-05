// Minimal type declarations for the xlsx package (SheetJS)
// This module is loaded via CDN/dynamic import in production builds.
declare module "xlsx" {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }
  export interface WorkSheet {
    [key: string]: unknown;
  }
  export interface ColInfo {
    wch?: number;
    wpx?: number;
  }
  export const SSF: {
    parse_date_code(v: number): { y: number; m: number; d: number } | null;
  };
  export const utils: {
    book_new(): WorkBook;
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name?: string): void;
    aoa_to_sheet(data: unknown[][]): WorkSheet;
    sheet_to_json<T>(ws: WorkSheet, opts?: { defval?: unknown }): T[];
    sheet_to_csv(ws: WorkSheet, opts?: Record<string, unknown>): string;
  };
  export function read(
    data: ArrayBuffer | Uint8Array,
    opts?: { type?: string },
  ): WorkBook;
  export function writeFile(wb: WorkBook, filename: string): void;
}
