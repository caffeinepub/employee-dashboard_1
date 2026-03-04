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
import {
  CheckCircle2,
  Download,
  Loader2,
  Medal,
  Trophy,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { TopPerformerInput } from "../backend.d.ts";
import { useSetTopPerformers, useTopPerformers } from "../hooks/useQueries";

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

function parsePerformersCSV(content: string): ParsedPerformer[] {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0].toLowerCase());
  const rankIdx = headers.indexOf("rank");
  const nameIdx = headers.indexOf("name");
  const fiplIdx = headers.indexOf("fiplcode");
  const accessoriesIdx = headers.indexOf("accessories");
  const ewIdx = headers.indexOf("extendedwarranty");
  const salesIdx = headers.indexOf("totalsales");

  const results: ParsedPerformer[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const row: ParsedPerformer = {
      rank: rankIdx >= 0 ? Number(cells[rankIdx]) || i : i,
      name: nameIdx >= 0 ? (cells[nameIdx] ?? "") : "",
      fiplCode: fiplIdx >= 0 ? (cells[fiplIdx] ?? "") : "",
      accessories: accessoriesIdx >= 0 ? Number(cells[accessoriesIdx]) || 0 : 0,
      extendedWarranty: ewIdx >= 0 ? Number(cells[ewIdx]) || 0 : 0,
      totalSales: salesIdx >= 0 ? Number(cells[salesIdx]) || 0 : 0,
    };
    if (!row.name) row.error = "Name is required";
    results.push(row);
  }
  return results;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const RANK_STYLES: Record<
  number,
  { badge: string; text: string; icon: React.ReactNode }
> = {
  1: {
    badge:
      "bg-[oklch(0.92_0.08_80)] text-[oklch(0.38_0.18_80)] border-[oklch(0.68_0.14_80_/_0.4)]",
    text: "text-[oklch(0.38_0.18_80)]",
    icon: <Trophy className="w-3.5 h-3.5 text-[oklch(0.55_0.18_80)]" />,
  },
  2: {
    badge:
      "bg-[oklch(0.92_0.02_240)] text-[oklch(0.38_0.08_240)] border-[oklch(0.68_0.08_240_/_0.4)]",
    text: "text-[oklch(0.38_0.08_240)]",
    icon: <Medal className="w-3.5 h-3.5 text-[oklch(0.55_0.08_240)]" />,
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
  const { data: performers = [], isLoading } = useTopPerformers();
  const setTopPerformers = useSetTopPerformers();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedPerformer[]>([]);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedPerformers = [...performers].sort(
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

  const handleConfirm = () => {
    const validRows = parsedRows.filter((r) => !r.error);
    const inputs: TopPerformerInput[] = validRows.map((r) => ({
      rank: BigInt(r.rank),
      name: r.name,
      fiplCode: r.fiplCode,
      accessories: BigInt(r.accessories),
      extendedWarranty: BigInt(r.extendedWarranty),
      totalSales: BigInt(r.totalSales),
    }));
    setTopPerformers.mutate(inputs, {
      onSuccess: () => {
        toast.success(`Top ${inputs.length} performers updated`);
        setUploadOpen(false);
        setStep("upload");
        setParsedRows([]);
      },
      onError: () => toast.error("Failed to update top performers"),
    });
  };

  const handleClose = () => {
    if (!setTopPerformers.isPending) {
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
                Monthly ranking by total sales
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7 px-2.5"
            onClick={() => setUploadOpen(true)}
            data-ocid="top_performers.open_modal_button"
          >
            <Upload className="w-3 h-3" />
            Upload List
          </Button>
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
            <p className="text-sm">No top performers uploaded yet</p>
            <p className="text-xs mt-0.5">
              Click "Upload List" to add this month's ranking
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
          className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col gap-0 p-0"
          data-ocid="top_performers.dialog"
        >
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[oklch(0.55_0.18_80)]" />
              Upload Top Performers
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload a CSV with this month's top performers ranking.
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
              disabled={setTopPerformers.isPending}
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
                  parsedRows.filter((r) => !r.error).length === 0 ||
                  setTopPerformers.isPending
                }
                className="gap-2"
                data-ocid="top_performers.confirm_button"
              >
                {setTopPerformers.isPending ? (
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
