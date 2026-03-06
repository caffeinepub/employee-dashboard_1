/**
 * Re-exports the bundled SheetJS (xlsx) library.
 * Previously loaded from CDN at runtime -- now bundled as a proper npm package
 * so uploads work reliably without external network calls.
 */

import * as XLSX from "xlsx";

export function loadXlsx(): Promise<typeof XLSX> {
  return Promise.resolve(XLSX);
}
