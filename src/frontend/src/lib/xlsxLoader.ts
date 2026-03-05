/**
 * Lazy-loads the SheetJS (xlsx) library from CDN at runtime.
 * This avoids adding it as a build dependency while keeping full xlsx functionality.
 */

declare global {
  interface Window {
    XLSX: ReturnType<typeof Object>; // typed as object; cast at call sites
  }
}

let loadPromise: Promise<ReturnType<typeof Object>> | null = null;

export function loadXlsx(): Promise<ReturnType<typeof Object>> {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    script.onload = () => {
      if (window.XLSX) resolve(window.XLSX);
      else reject(new Error("XLSX failed to initialise after script load"));
    };
    script.onerror = () => reject(new Error("Failed to load XLSX from CDN"));
    document.head.appendChild(script);
  });

  return loadPromise;
}
