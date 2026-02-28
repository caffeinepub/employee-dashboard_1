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
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Upload,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Status } from "../backend";
import type { EmployeeInput } from "../backend.d.ts";
import { useBulkAddEmployees } from "../hooks/useQueries";

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  name: string;
  role: string;
  department: string;
  status: Status;
  joinDate: string;
  avatar: string;
  error?: string;
}

const CSV_HEADERS = [
  "name",
  "role",
  "department",
  "status",
  "joinDate",
  "avatar",
];

const CSV_TEMPLATE = `name,role,department,status,joinDate,avatar
Priya Sharma,Senior Engineer,Engineering,active,2023-03-15,PS
Raj Mehta,Sales Manager,Sales,active,2022-07-01,RM
Ananya Iyer,HR Specialist,HR,inactive,2021-11-20,AI
Carlos Rivera,Operations Lead,Operations,active,2023-01-10,CR`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "employee-bulk-upload-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(content: string): ParsedRow[] {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(",").map((h) => h.trim());

  const nameIdx = headers.indexOf("name");
  const roleIdx = headers.indexOf("role");
  const deptIdx = headers.indexOf("department");
  const statusIdx = headers.indexOf("status");
  const joinIdx = headers.indexOf("joindate");
  const avatarIdx = headers.indexOf("avatar");

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]
      .split(",")
      .map((c) => c.trim().replace(/^"(.*)"$/, "$1"));
    const row: ParsedRow = {
      name: nameIdx >= 0 ? (cells[nameIdx] ?? "") : "",
      role: roleIdx >= 0 ? (cells[roleIdx] ?? "") : "",
      department: deptIdx >= 0 ? (cells[deptIdx] ?? "") : "",
      status:
        statusIdx >= 0 && cells[statusIdx]?.toLowerCase() === "inactive"
          ? Status.inactive
          : Status.active,
      joinDate: joinIdx >= 0 ? (cells[joinIdx] ?? "") : "",
      avatar: avatarIdx >= 0 ? (cells[avatarIdx] ?? "") : "",
    };

    if (!row.name) {
      row.error = "Name is required";
    } else if (!row.role) {
      row.error = "Role is required";
    } else if (!row.department) {
      row.error = "Department is required";
    }

    rows.push(row);
  }

  return rows;
}

function rowToEmployeeInput(row: ParsedRow): EmployeeInput {
  const joinDateMs = row.joinDate
    ? new Date(row.joinDate).getTime()
    : Date.now();
  const joinDateNs =
    BigInt(Number.isNaN(joinDateMs) ? Date.now() : joinDateMs) * 1_000_000n;

  const avatar =
    row.avatar ||
    row.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return {
    name: row.name,
    role: row.role,
    department: row.department,
    status: row.status,
    joinDate: joinDateNs,
    avatar,
  };
}

type Step = "upload" | "preview" | "done";

export function BulkUploadModal({ open, onOpenChange }: BulkUploadModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkAdd = useBulkAddEmployees();

  const validRows = parsedRows.filter((r) => !r.error);
  const errorRows = parsedRows.filter((r) => r.error);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please upload a CSV file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parseCSV(content);
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
    const inputs = validRows.map(rowToEmployeeInput);
    bulkAdd.mutate(inputs, {
      onSuccess: (ids) => {
        setAddedCount(ids.length);
        setStep("done");
        toast.success(
          `${ids.length} employee${ids.length === 1 ? "" : "s"} added successfully`,
        );
      },
      onError: (err) => {
        toast.error(`Bulk upload failed: ${err.message}`);
      },
    });
  };

  const handleClose = () => {
    if (!bulkAdd.isPending) {
      setStep("upload");
      setParsedRows([]);
      setAddedCount(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Bulk Upload Employees
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload a CSV file to add multiple employees at once.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto">
          {/* Step: Upload */}
          {step === "upload" && (
            <div className="px-6 py-6 space-y-5">
              {/* Download Template */}
              <div className="flex items-center justify-between rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Download Template
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV with columns: name, role, department, status, joinDate,
                    avatar
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="gap-2 shrink-0"
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
                  "relative w-full rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all",
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-accent/20",
                )}
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
                      "w-12 h-12 rounded-full border flex items-center justify-center transition-all",
                      isDragging
                        ? "border-primary/40 bg-primary/20"
                        : "border-border bg-muted/30",
                    )}
                  >
                    <Upload
                      className={cn(
                        "w-5 h-5 transition-colors",
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Only .csv files are accepted
                    </p>
                  </div>
                </div>
              </button>

              {/* Format info */}
              <div className="rounded-lg bg-muted/20 border border-border px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-foreground/70">
                  Expected columns:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CSV_HEADERS.map((h) => (
                    <code
                      key={h}
                      className="text-[10px] font-mono-data px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"
                    >
                      {h}
                    </code>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/60 pt-1">
                  status: "active" or "inactive" · joinDate: YYYY-MM-DD format
                </p>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="px-6 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-foreground">
                    {parsedRows.length} rows detected
                  </span>
                  {validRows.length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[oklch(0.18_0.04_145_/_0.5)] border border-[oklch(0.5_0.16_145_/_0.3)] text-[oklch(0.72_0.18_145)]">
                      {validRows.length} valid
                    </span>
                  )}
                  {errorRows.length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[oklch(0.18_0.04_25_/_0.5)] border border-[oklch(0.5_0.18_25_/_0.3)] text-[oklch(0.8_0.18_25)]">
                      {errorRows.length} errors
                    </span>
                  )}
                </div>
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
                <div className="max-h-[320px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                          Name
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                          Role
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                          Dept
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                          Status
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                          Join Date
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 text-right">
                          Valid
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((row, i) => (
                        <TableRow
                          key={`row-${i}-${row.name}`}
                          className={cn(
                            row.error && "bg-[oklch(0.18_0.04_25_/_0.2)]",
                          )}
                        >
                          <TableCell className="text-xs py-2 font-medium">
                            {row.name || (
                              <span className="text-muted-foreground/50 italic">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-muted-foreground">
                            {row.role || (
                              <span className="text-muted-foreground/50 italic">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-muted-foreground">
                            {row.department || (
                              <span className="text-muted-foreground/50 italic">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            <span
                              className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                row.status === Status.active
                                  ? "bg-[oklch(0.18_0.04_145_/_0.5)] text-[oklch(0.72_0.18_145)]"
                                  : "bg-muted/30 text-muted-foreground",
                              )}
                            >
                              {row.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-2 font-mono-data text-muted-foreground">
                            {row.joinDate || "—"}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            {row.error ? (
                              <div className="flex items-center justify-end gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-[oklch(0.8_0.18_25)]" />
                                <span className="text-[10px] text-[oklch(0.8_0.18_25)]">
                                  {row.error}
                                </span>
                              </div>
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.72_0.18_145)] ml-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {errorRows.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-[oklch(0.8_0.18_25)]">
                    {errorRows.length} row{errorRows.length > 1 ? "s" : ""} with
                    errors
                  </span>{" "}
                  will be skipped. Only valid rows will be imported.
                </p>
              )}

              {validRows.length === 0 && (
                <div className="rounded-lg border border-[oklch(0.5_0.18_25_/_0.3)] bg-[oklch(0.18_0.04_25_/_0.2)] px-4 py-3">
                  <p className="text-xs text-[oklch(0.8_0.18_25)] font-semibold">
                    No valid rows to import
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Please fix the CSV and upload again.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[oklch(0.18_0.04_145_/_0.5)] border border-[oklch(0.5_0.16_145_/_0.3)] flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-[oklch(0.72_0.18_145)]" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {addedCount} Employee{addedCount !== 1 ? "s" : ""} Added
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  The directory has been updated successfully.
                </p>
              </div>
              <Button size="sm" onClick={handleClose} className="mt-2">
                Done
              </Button>
            </div>
          )}
        </div>

        {step !== "done" && (
          <>
            <Separator />
            <DialogFooter className="px-6 py-4 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={bulkAdd.isPending}
              >
                Cancel
              </Button>
              {step === "preview" && (
                <Button
                  type="button"
                  size="sm"
                  disabled={validRows.length === 0 || bulkAdd.isPending}
                  onClick={handleConfirm}
                  className="gap-2"
                >
                  {bulkAdd.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Users className="w-3.5 h-3.5" />
                      Import {validRows.length} Employee
                      {validRows.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
