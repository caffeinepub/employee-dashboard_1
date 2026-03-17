import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  Loader2,
  Medal,
  RefreshCw,
  Trophy,
  Upload,
  Wifi,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { TopPerformerInput } from "../backend.d.ts";
import { useActor } from "../hooks/useActor";
import { useGoogleSheetTopPerformers } from "../hooks/useGoogleSheetData";
import { useTopPerformers } from "../hooks/useQueries";
import { PasswordGateDialog } from "./PasswordGateDialog";

const TOP_PERFORMERS_TEMPLATE = `rank,name,fiplCode,accessories,extendedWarranty,totalSales
1,Rajesh Kumar,FIPL-001,45,12,320000
2,Priya Sharma,FIPL-002,38,10,285000
3,Amit Singh,FIPL-003,42,8,275000
4,Sunita Patel,FIPL-004,31,11,260000
5,Vikram Mehta,FIPL-005,29,9,245000`;

function downloadTemplate() {
  const blob = new Blob([TOP_PERFORMERS_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "top-performers-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

interface ParsedPerformer {
  rank: number;
  name: string;
  fiplCode: string;
  accessories: number;
  extendedWarranty: number;
  totalSales: number;
  error?: string;
}

/** Strip commas/spaces/currency symbols and parse to number safely */
function parseNum(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = String(raw)
    .replace(/[,\s₹$]/g, "")
    .trim();
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

/** Normalise a header string: lowercase, strip all non-alphanumeric chars */
function normHeader(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Find index of a header by trying multiple normalised candidate names */
function findIdx(headers: string[], ...candidates: string[]): number {
  const normHeaders = headers.map(normHeader);
  for (const c of candidates) {
    const nc = normHeader(c);
    const exact = normHeaders.findIndex((h) => h === nc);
    if (exact >= 0) return exact;
    const partial = normHeaders.findIndex(
      (h) => h.includes(nc) || nc.includes(h),
    );
    if (partial >= 0) return partial;
  }
  return -1;
}

function parsePerformersCSV(text: string): ParsedPerformer[] {
  const rawLines = text.split("\n").filter((l) => l.trim());
  if (rawLines.length < 2) return [];

  const headerLine = rawLines[0];
  const headers = parseCSVLine(headerLine);

  const rankIdx = findIdx(headers, "rank", "#", "no", "position");
  const nameIdx = findIdx(
    headers,
    "name",
    "fsename",
    "employeename",
    "employee",
  );
  const fiplIdx = findIdx(headers, "fiplcode", "fipl", "code", "id");
  const accIdx = findIdx(headers, "accessories", "accessory", "acc");
  const ewIdx = findIdx(
    headers,
    "extendedwarranty",
    "extended",
    "warranty",
    "ew",
  );
  const salesIdx = findIdx(
    headers,
    "totalsales",
    "totalSales",
    "sales",
    "amount",
    "total",
  );

  const dataLines = rawLines.slice(1);
  return dataLines
    .map((line, lineIdx): ParsedPerformer => {
      const cols = parseCSVLine(line);
      const get = (idx: number) => (idx >= 0 ? (cols[idx] ?? "").trim() : "");

      const rankRaw = get(rankIdx);
      const rank = rankRaw ? parseNum(rankRaw) || lineIdx + 1 : lineIdx + 1;
      const name = get(nameIdx);
      const fiplCode = get(fiplIdx);
      const accessories = parseNum(get(accIdx));
      const extendedWarranty = parseNum(get(ewIdx));
      const totalSales = parseNum(get(salesIdx));

      const error =
        !name && !fiplCode ? "Name or FIPL Code required" : undefined;

      return {
        rank,
        name,
        fiplCode,
        accessories,
        extendedWarranty,
        totalSales,
        error,
      };
    })
    .filter((r) => r.name || r.fiplCode);
}

function formatCurrency(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)} K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const RANK_STYLES: Record<
  number,
  { badge: string; text: string; icon: React.ReactNode }
> = {
  1: {
    badge:
      "bg-[oklch(0.95_0.08_80)] text-[oklch(0.35_0.18_80)] border-[oklch(0.72_0.16_80_/_0.5)]",
    text: "text-[oklch(0.35_0.18_80)]",
    icon: <Trophy className="w-3.5 h-3.5 text-[oklch(0.55_0.18_80)]" />,
  },
  2: {
    badge:
      "bg-[oklch(0.93_0.03_220)] text-[oklch(0.35_0.08_220)] border-[oklch(0.65_0.08_220_/_0.4)]",
    text: "text-[oklch(0.35_0.08_220)]",
    icon: <Medal className="w-3.5 h-3.5 text-[oklch(0.45_0.1_220)]" />,
  },
  3: {
    badge:
      "bg-[oklch(0.93_0.05_40)] text-[oklch(0.40_0.14_40)] border-[oklch(0.68_0.12_40_/_0.4)]",
    text: "text-[oklch(0.40_0.14_40)]",
    icon: <Medal className="w-3.5 h-3.5 text-[oklch(0.55_0.14_40)]" />,
  },
};

const SKELETON_KEYS = ["sk-a", "sk-b", "sk-c", "sk-d", "sk-e"];

export function TopPerformersSection() {
  // Primary: live Google Sheets data (Sheet 6)
  const { data: sheetPerformers = [], isLoading: sheetLoading } =
    useGoogleSheetTopPerformers();
  // Fallback: canister data (uploaded via CSV)
  const { data: canisterPerformers = [], isLoading: canisterLoading } =
    useTopPerformers();
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedPerformer[]>([]);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use Sheet 6 data if available, fall back to canister data
  const rawPerformers =
    sheetPerformers.length > 0 ? sheetPerformers : canisterPerformers;
  const isLoading = sheetLoading || canisterLoading;
  const isLive = sheetPerformers.length > 0;

  const sortedPerformers = [...rawPerformers].sort(
    (a, b) => Number(a.rank) - Number(b.rank),
  );

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please upload a CSV file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parsePerformersCSV(content);
      if (rows.length === 0) {
        toast.error("No data rows found in CSV");
        return;
      }
      setParsedRows(rows);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = async () => {
    const validRows = parsedRows.filter((r) => !r.error);
    if (validRows.length === 0) {
      toast.error("No valid rows to save.");
      return;
    }
    if (!actor) {
      toast.error("Backend not ready. Please wait a moment and try again.");
      return;
    }

    let inputs: TopPerformerInput[];
    try {
      inputs = validRows.map((r) => ({
        rank: BigInt(Math.max(1, Math.round(r.rank))),
        name: String(r.name || ""),
        fiplCode: String(r.fiplCode || ""),
        accessories: BigInt(Math.max(0, Math.round(r.accessories))),
        extendedWarranty: BigInt(Math.max(0, Math.round(r.extendedWarranty))),
        totalSales: BigInt(Math.max(0, Math.round(r.totalSales))),
      }));
    } catch (convErr) {
      toast.error(
        `Data conversion error: ${
          convErr instanceof Error ? convErr.message : String(convErr)
        }`,
      );
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(`Saving ${inputs.length} top performers...`);
    try {
      const result = await actor.setTopPerformers(inputs);
      console.log("setTopPerformers result:", result);
      await queryClient.invalidateQueries();
      toast.success(`Top ${inputs.length} performers saved successfully!`, {
        id: toastId,
      });
      setUploadOpen(false);
      setStep("upload");
      setParsedRows([]);
    } catch (err) {
      console.error("Top performers save error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Save failed: ${msg.slice(0, 120)}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setUploadOpen(false);
      setStep("upload");
      setParsedRows([]);
    }
  };

  return (
    <>
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[oklch(0.92_0.08_80_/_0.5)] border border-[oklch(0.68_0.14_80_/_0.3)] flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-[oklch(0.48_0.18_80)]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-foreground">
                Top Performers
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {isLive ? (
                  <span className="flex items-center gap-1">
                    <Wifi className="w-2.5 h-2.5 text-emerald-500" />
                    Live from Google Sheets
                  </span>
                ) : (
                  "Monthly ranking by total sales"
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs h-7 px-2"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["googleSheetTopPerformers"],
                })
              }
              title="Refresh from Google Sheets"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            <PasswordGateDialog onSuccess={() => setUploadOpen(true)}>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7 px-2.5"
                data-ocid="top_performers.open_modal_button"
              >
                <Upload className="w-3 h-3" />
                Upload
              </Button>
            </PasswordGateDialog>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {SKELETON_KEYS.map((k) => (
              <Skeleton key={k} className="h-10 rounded-lg bg-muted/50" />
            ))}
          </div>
        ) : sortedPerformers.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 text-muted-foreground/50"
            data-ocid="top_performers.empty_state"
          >
            <Trophy className="w-8 h-8 mb-3 opacity-25" />
            <p className="text-sm">No top performers data in Sheet 6 yet</p>
            <p className="text-xs mt-0.5">
              Add data to Sheet 6 in Google Sheets or upload a CSV manually
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 w-10">
                    #
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                    Name
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 hidden sm:table-cell">
                    FIPL
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 text-right hidden md:table-cell">
                    Accessories
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 text-right hidden md:table-cell">
                    Ext. Warranty
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 text-right">
                    Total Sales
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPerformers.map((performer, i) => {
                  const rank = Number(performer.rank);
                  const rankStyle = RANK_STYLES[rank];
                  return (
                    <TableRow
                      key={performer.fiplCode || `perf-${i}`}
                      className={cn(
                        "transition-colors",
                        rank <= 3 && "bg-[oklch(0.98_0.02_80_/_0.3)]",
                      )}
                      data-ocid={`top_performers.item.${i + 1}`}
                    >
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          {rankStyle ? (
                            <>
                              {rankStyle.icon}
                              <span
                                className={cn(
                                  "text-xs font-bold font-mono-data",
                                  rankStyle.text,
                                )}
                              >
                                {rank}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs font-mono-data font-semibold text-muted-foreground">
                              {rank}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            rank <= 3 ? rankStyle?.text : "text-foreground",
                          )}
                        >
                          {performer.name}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 hidden sm:table-cell">
                        <span className="text-[10px] font-mono-data text-primary/80">
                          {performer.fiplCode}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right hidden md:table-cell">
                        <span className="text-xs font-mono-data text-muted-foreground">
                          {Number(performer.accessories)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right hidden md:table-cell">
                        <span className="text-xs font-mono-data text-muted-foreground">
                          {Number(performer.extendedWarranty)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <span
                          className={cn(
                            "text-xs font-mono-data font-bold",
                            rank <= 3 ? rankStyle?.text : "text-foreground/80",
                          )}
                        >
                          {formatCurrency(Number(performer.totalSales))}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={uploadOpen} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0"
          data-ocid="top_performers.dialog"
        >
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[oklch(0.55_0.18_80)]" />
              Upload Top Performers
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload a CSV to override or supplement the live Google Sheets
              data.
            </DialogDescription>
          </DialogHeader>
          <Separator />

          <div className="flex-1 overflow-y-auto">
            {step === "upload" && (
              <div className="px-6 py-5 space-y-4">
                {/* Template download */}
                <div className="flex items-center justify-between rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Download Template
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Columns: rank, name, fiplCode, accessories,
                      extendedWarranty, totalSales
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="gap-2 shrink-0"
                    data-ocid="top_performers.upload_button"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Template
                  </Button>
                </div>

                {/* Drop Zone */}
                <button
                  type="button"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative w-full rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
                    isDragging
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-accent/20",
                  )}
                  data-ocid="top_performers.dropzone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full border flex items-center justify-center transition-all",
                        isDragging
                          ? "border-primary/40 bg-primary/20"
                          : "border-border bg-muted/30",
                      )}
                    >
                      <Upload
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isDragging ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {isDragging
                          ? "Drop CSV file here"
                          : "Click or drag CSV file here"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Only .csv files accepted
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {step === "preview" && (
              <div className="px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {parsedRows.length} rows detected
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setStep("upload")}
                  >
                    Change file
                  </Button>
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="max-h-[280px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20">
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                            Rank
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                            Name
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                            FIPL Code
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 text-right">
                            Accessories
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 text-right">
                            Ext. Warranty
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 text-right">
                            Total Sales
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedRows.map((row, i) => (
                          <TableRow
                            key={`preview-rank-${row.rank}-${row.fiplCode || i}`}
                            data-ocid={`top_performers.row.${i + 1}`}
                          >
                            <TableCell className="text-xs py-2 font-mono-data font-bold text-primary">
                              #{row.rank}
                            </TableCell>
                            <TableCell className="text-xs py-2 font-medium">
                              {row.name || "—"}
                            </TableCell>
                            <TableCell className="text-xs py-2 font-mono-data text-primary/70">
                              {row.fiplCode || "—"}
                            </TableCell>
                            <TableCell className="text-xs py-2 text-right font-mono-data">
                              {row.accessories}
                            </TableCell>
                            <TableCell className="text-xs py-2 text-right font-mono-data">
                              {row.extendedWarranty}
                            </TableCell>
                            <TableCell className="text-xs py-2 text-right font-mono-data font-bold">
                              {formatCurrency(row.totalSales)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />
          <DialogFooter className="px-6 py-4 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSaving}
              data-ocid="top_performers.cancel_button"
            >
              Cancel
            </Button>
            {step === "preview" && (
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={
                  parsedRows.filter((r) => !r.error).length === 0 || isSaving
                }
                className="gap-2"
                data-ocid="top_performers.confirm_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm &amp; Save
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
