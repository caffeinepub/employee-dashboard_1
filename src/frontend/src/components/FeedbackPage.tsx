import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Download,
  FileUp,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  Star,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { CallingRecord, CustomerReview } from "../backend.d.ts";
import { useAllEmployees } from "../hooks/useQueries";
import {
  useAddCallingRecord,
  useAddCallingRecordsBatch,
  useAddCustomerReview,
  useCallingRecords,
  useCustomerReviews,
  useDeleteCustomerReview,
} from "../hooks/useQueries";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts: bigint): string {
  try {
    const ms = Number(ts) / 1_000_000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function parseDateToNs(dateStr: string): bigint {
  const ms = new Date(dateStr).getTime();
  return BigInt(Number.isNaN(ms) ? Date.now() : ms) * 1_000_000n;
}

// ─── Star Rating Input ────────────────────────────────────────────────────────

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 focus-visible:outline-none"
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              "w-6 h-6 transition-colors",
              n <= (hovered || value)
                ? "text-[oklch(0.62_0.16_75)] fill-[oklch(0.62_0.16_75)]"
                : "text-muted-foreground/30",
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Star Rating Display ──────────────────────────────────────────────────────

function StarRatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "w-3.5 h-3.5",
            n <= rating
              ? "text-[oklch(0.62_0.16_75)] fill-[oklch(0.62_0.16_75)]"
              : "text-muted-foreground/20",
          )}
        />
      ))}
    </div>
  );
}

// ─── Review Card ─────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  onDelete,
  isDeleting,
}: {
  review: CustomerReview;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="break-inside-avoid mb-4">
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="relative glass-card rounded-xl p-5 border border-border/50"
      >
        {/* Delete button */}
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted/60 hover:bg-destructive/20 hover:text-destructive text-muted-foreground/50 flex items-center justify-center transition-all"
          aria-label="Delete review"
          data-ocid="feedback.review.delete_button"
        >
          {isDeleting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <X className="w-3 h-3" />
          )}
        </button>

        {/* Rating */}
        <StarRatingDisplay rating={Number(review.rating)} />

        {/* Review text */}
        <p className="mt-3 text-sm text-foreground/85 leading-relaxed">
          {review.reviewText}
        </p>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border/40 flex items-end justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-foreground">
              {review.reviewerName}
            </p>
            {review.fiplCode && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                <span className="font-semibold">{review.fseName}</span>{" "}
                <span className="font-mono-data text-primary/60">
                  ({review.fiplCode})
                </span>
              </p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/60 shrink-0">
            {formatDate(review.date)}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add Review Dialog ────────────────────────────────────────────────────────

const EMPTY_REVIEW_FORM = {
  reviewerName: "",
  fiplCode: "",
  fseName: "",
  rating: 5,
  reviewText: "",
  date: new Date().toISOString().split("T")[0],
};

function AddReviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState(EMPTY_REVIEW_FORM);
  const { data: employees = [] } = useAllEmployees();
  const addReview = useAddCustomerReview();

  // Auto-fill FSE name when FIPL code matches
  const handleFiplChange = (code: string) => {
    const match = employees.find(
      (e) => e.fiplCode?.toLowerCase() === code.toLowerCase(),
    );
    setForm((f) => ({
      ...f,
      fiplCode: code,
      fseName: match ? match.name : f.fseName,
    }));
  };

  const handleSubmit = () => {
    if (!form.reviewerName.trim() || !form.reviewText.trim()) {
      toast.error("Reviewer name and review text are required");
      return;
    }
    addReview.mutate(
      {
        reviewerName: form.reviewerName,
        fiplCode: form.fiplCode,
        fseName: form.fseName,
        rating: BigInt(form.rating),
        reviewText: form.reviewText,
        date: parseDateToNs(form.date),
      },
      {
        onSuccess: () => {
          toast.success("Review added");
          setForm(EMPTY_REVIEW_FORM);
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to add review"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" data-ocid="feedback.review.dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-bold">
            Add Customer Review
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Reviewer Name *</Label>
            <Input
              value={form.reviewerName}
              onChange={(e) =>
                setForm((f) => ({ ...f, reviewerName: e.target.value }))
              }
              placeholder="e.g. Ramesh Kumar"
              className="text-sm"
              data-ocid="feedback.review.input"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">FIPL Code</Label>
              <Input
                value={form.fiplCode}
                onChange={(e) => handleFiplChange(e.target.value)}
                placeholder="e.g. FIPL001"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">FSE Name</Label>
              <Input
                value={form.fseName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fseName: e.target.value }))
                }
                placeholder="Auto-filled"
                className="text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Rating</Label>
            <StarRatingInput
              value={form.rating}
              onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Review Text *</Label>
            <Textarea
              value={form.reviewText}
              onChange={(e) =>
                setForm((f) => ({ ...f, reviewText: e.target.value }))
              }
              placeholder="Write the customer's review..."
              className="text-sm resize-none min-h-[100px]"
              data-ocid="feedback.review.textarea"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            data-ocid="feedback.review.cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={addReview.isPending}
            data-ocid="feedback.review.submit_button"
          >
            {addReview.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Add Review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Customer Reviews Tab ─────────────────────────────────────────────────────

function CustomerReviewsTab() {
  const [addOpen, setAddOpen] = useState(false);
  const { data: reviews = [], isLoading } = useCustomerReviews();
  const deleteReview = useDeleteCustomerReview();
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  const sorted = [...reviews].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt),
  );

  const handleDelete = (id: bigint) => {
    setDeletingId(id);
    deleteReview.mutate(id, {
      onSuccess: () => {
        toast.success("Review deleted");
        setDeletingId(null);
      },
      onError: () => {
        toast.error("Failed to delete review");
        setDeletingId(null);
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Customer Reviews
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Masonry board of customer reviews for your FSEs
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAddOpen(true)}
          className="gap-2"
          data-ocid="feedback.review.open_modal_button"
        >
          <Plus className="w-4 h-4" />
          Add Review
        </Button>
      </div>

      {isLoading ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`sk-${
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton keys
                i
              }`}
              className="break-inside-avoid mb-4"
            >
              <Skeleton
                className="rounded-xl bg-muted/30"
                style={{ height: `${140 + (i % 3) * 40}px` }}
              />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-muted-foreground/50"
          data-ocid="feedback.review.empty_state"
        >
          <MessageSquare className="w-10 h-10 mb-3 opacity-25" />
          <p className="text-sm font-semibold">No reviews yet</p>
          <p className="text-xs mt-1 opacity-70">
            Add the first customer review to get started
          </p>
        </motion.div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          <AnimatePresence>
            {sorted.map((review) => (
              <ReviewCard
                key={review.id.toString()}
                review={review}
                onDelete={() => handleDelete(review.id)}
                isDeleting={deletingId === review.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddReviewDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

// ─── Add Calling Record Dialog ────────────────────────────────────────────────

const OUTCOMES = [
  "Completed",
  "Follow-up Required",
  "No Answer",
  "Callback Requested",
  "Resolved",
];

const EMPTY_CALLING_FORM = {
  fiplCode: "",
  fseName: "",
  customerName: "",
  date: new Date().toISOString().split("T")[0],
  callDuration: "",
  outcome: "Completed",
  notes: "",
};

function AddCallingRecordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState(EMPTY_CALLING_FORM);
  const { data: employees = [] } = useAllEmployees();
  const addRecord = useAddCallingRecord();

  const handleFiplChange = (code: string) => {
    const match = employees.find(
      (e) => e.fiplCode?.toLowerCase() === code.toLowerCase(),
    );
    setForm((f) => ({
      ...f,
      fiplCode: code,
      fseName: match ? match.name : f.fseName,
    }));
  };

  const handleSubmit = () => {
    if (!form.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    addRecord.mutate(
      {
        fiplCode: form.fiplCode,
        fseName: form.fseName,
        customerName: form.customerName,
        date: parseDateToNs(form.date),
        callDuration: form.callDuration,
        outcome: form.outcome,
        notes: form.notes,
      },
      {
        onSuccess: () => {
          toast.success("Calling record added");
          setForm(EMPTY_CALLING_FORM);
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to add record"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" data-ocid="feedback.calling.dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-bold">
            Add Calling Record
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">FIPL Code</Label>
              <Input
                value={form.fiplCode}
                onChange={(e) => handleFiplChange(e.target.value)}
                placeholder="e.g. FIPL001"
                className="text-sm"
                data-ocid="feedback.calling.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">FSE Name</Label>
              <Input
                value={form.fseName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fseName: e.target.value }))
                }
                placeholder="Auto-filled"
                className="text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Customer Name *</Label>
            <Input
              value={form.customerName}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerName: e.target.value }))
              }
              placeholder="e.g. Priya Sharma"
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Call Duration</Label>
              <Input
                value={form.callDuration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, callDuration: e.target.value }))
                }
                placeholder="e.g. 15 mins"
                className="text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Outcome</Label>
            <Select
              value={form.outcome}
              onValueChange={(v) => setForm((f) => ({ ...f, outcome: v }))}
            >
              <SelectTrigger
                className="text-sm"
                data-ocid="feedback.calling.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                {OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o} className="text-xs">
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Additional notes about the call..."
              className="text-sm resize-none min-h-[70px]"
              data-ocid="feedback.calling.textarea"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            data-ocid="feedback.calling.cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={addRecord.isPending}
            data-ocid="feedback.calling.submit_button"
          >
            {addRecord.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Record"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk Upload Dialog ───────────────────────────────────────────────────────

interface ParsedCallingRow {
  fiplCode: string;
  fseName: string;
  customerName: string;
  date: string;
  callDuration: string;
  outcome: string;
  notes: string;
  valid: boolean;
  error?: string;
}

function downloadCallingTemplate() {
  const headers = [
    "FIPL Code",
    "FSE Name",
    "Customer Name",
    "Date (DD-MM-YYYY)",
    "Call Duration",
    "Outcome",
    "Notes",
  ];
  const sample = [
    "FIPL001",
    "Arjun Singh",
    "Priya Sharma",
    "15-03-2026",
    "20 mins",
    "Completed",
    "Customer was satisfied",
  ];
  const csv = [headers.join(","), sample.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "calling-records-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCallingCsv(text: string): ParsedCallingRow[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""),
  );

  const colIdx = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = header.findIndex((h) => h.includes(c));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const fiplIdx = colIdx(["fipl", "fiplcode"]);
  const nameIdx = colIdx(["fsename", "fse", "name"]);
  const custIdx = colIdx(["customer", "customername"]);
  const dateIdx = colIdx(["date"]);
  const durIdx = colIdx(["duration", "callduration"]);
  const outIdx = colIdx(["outcome"]);
  const notesIdx = colIdx(["notes"]);

  return lines.slice(1).map((line) => {
    // Handle quoted CSV fields
    const cols = line
      .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map((c) => c.replace(/^"|"$/g, "").trim());

    const get = (idx: number) => (idx >= 0 ? (cols[idx] ?? "") : "");
    const customerName = get(custIdx);

    return {
      fiplCode: get(fiplIdx),
      fseName: get(nameIdx),
      customerName,
      date: get(dateIdx),
      callDuration: get(durIdx),
      outcome: get(outIdx) || "Completed",
      notes: get(notesIdx),
      valid: !!customerName.trim(),
      error: !customerName.trim() ? "Customer name is required" : undefined,
    };
  });
}

function BulkUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [rows, setRows] = useState<ParsedCallingRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const batchAdd = useAddCallingRecordsBatch();

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCallingCsv(text));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = () => {
    const valid = rows.filter((r) => r.valid);
    if (valid.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    const inputs = valid.map((r) => {
      // Parse DD-MM-YYYY or YYYY-MM-DD
      let dateMs: number;
      const ddmm = r.date.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (ddmm) {
        dateMs = new Date(
          `${ddmm[3]}-${ddmm[2].padStart(2, "0")}-${ddmm[1].padStart(2, "0")}`,
        ).getTime();
      } else {
        dateMs = new Date(r.date).getTime();
      }
      return {
        fiplCode: r.fiplCode,
        fseName: r.fseName,
        customerName: r.customerName,
        date: BigInt(Number.isNaN(dateMs) ? Date.now() : dateMs) * 1_000_000n,
        callDuration: r.callDuration,
        outcome: r.outcome || "Completed",
        notes: r.notes,
      };
    });

    batchAdd.mutate(inputs, {
      onSuccess: () => {
        toast.success(`Imported ${inputs.length} calling record(s)`);
        setRows([]);
        onOpenChange(false);
      },
      onError: () => toast.error("Failed to import records"),
    });
  };

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        data-ocid="feedback.calling.bulk.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-base font-bold">
            Bulk Upload Calling Records
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border/50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Download Template</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fill in the CSV template and upload it below
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCallingTemplate}
              className="gap-2 shrink-0"
              data-ocid="feedback.calling.bulk.button"
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </Button>
          </div>

          {/* Dropzone — label wraps hidden input for accessible click/keyboard */}
          <label
            className={cn(
              "block rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/40 hover:bg-muted/20",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            data-ocid="feedback.calling.dropzone"
          >
            <UploadCloud className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-muted-foreground">
              Drop CSV file here or{" "}
              <span className="text-primary underline">browse</span>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Supports .csv files
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              data-ocid="feedback.calling.upload_button"
            />
          </label>

          {/* Preview table */}
          {rows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Preview ({rows.length} rows)
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[oklch(0.42_0.16_145)] font-semibold">
                    ✓ {validCount} valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-destructive font-semibold">
                      ✗ {invalidCount} invalid
                    </span>
                  )}
                </div>
              </div>
              <ScrollArea className="h-48 rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-[10px] py-2">Status</TableHead>
                      <TableHead className="text-[10px] py-2">
                        FIPL Code
                      </TableHead>
                      <TableHead className="text-[10px] py-2">
                        FSE Name
                      </TableHead>
                      <TableHead className="text-[10px] py-2">
                        Customer
                      </TableHead>
                      <TableHead className="text-[10px] py-2">Date</TableHead>
                      <TableHead className="text-[10px] py-2">
                        Outcome
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow
                        key={`row-${
                          // biome-ignore lint/suspicious/noArrayIndexKey: preview rows
                          i
                        }`}
                        className={cn(!row.valid && "bg-destructive/5")}
                      >
                        <TableCell className="py-1.5">
                          {row.valid ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-[oklch(0.93_0.05_165_/_0.5)] text-[oklch(0.32_0.15_165)] border-[oklch(0.65_0.12_165_/_0.4)]"
                            >
                              OK
                            </Badge>
                          ) : (
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                              title={row.error}
                            >
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 font-mono-data">
                          {row.fiplCode || "—"}
                        </TableCell>
                        <TableCell className="text-xs py-1.5">
                          {row.fseName || "—"}
                        </TableCell>
                        <TableCell className="text-xs py-1.5">
                          {row.customerName}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 text-muted-foreground">
                          {row.date}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 text-muted-foreground">
                          {row.outcome}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRows([]);
              onOpenChange(false);
            }}
            data-ocid="feedback.calling.bulk.cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={validCount === 0 || batchAdd.isPending}
            data-ocid="feedback.calling.bulk.confirm_button"
          >
            {batchAdd.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${validCount} Record${validCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Calling Records Tab ──────────────────────────────────────────────────────

function CallingRecordsTab() {
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { data: records = [], isLoading } = useCallingRecords();

  const sorted = [...records].sort((a, b) => Number(b.date) - Number(a.date));

  const getOutcomeBadgeStyle = (outcome: string) => {
    switch (outcome) {
      case "Completed":
      case "Resolved":
        return "bg-[oklch(0.93_0.05_165_/_0.5)] text-[oklch(0.32_0.15_165)] border-[oklch(0.65_0.12_165_/_0.4)]";
      case "Follow-up Required":
      case "Callback Requested":
        return "bg-[oklch(0.95_0.05_85_/_0.5)] text-[oklch(0.38_0.14_85)] border-[oklch(0.65_0.12_85_/_0.4)]";
      case "No Answer":
        return "bg-[oklch(0.93_0.04_25_/_0.5)] text-[oklch(0.42_0.18_25)] border-[oklch(0.65_0.14_25_/_0.4)]";
      default:
        return "bg-muted/30 text-muted-foreground border-border/40";
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Feedback Calling Records
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track all feedback and follow-up calls made by FSEs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkOpen(true)}
            className="gap-2"
            data-ocid="feedback.calling.bulk.open_modal_button"
          >
            <FileUp className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="gap-2"
            data-ocid="feedback.calling.open_modal_button"
          >
            <Plus className="w-4 h-4" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={`sk-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                  i
                }`}
                className="h-10 rounded-lg bg-muted/30"
              />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-muted-foreground/50"
            data-ocid="feedback.calling.empty_state"
          >
            <Phone className="w-10 h-10 mb-3 opacity-25" />
            <p className="text-sm font-semibold">No calling records yet</p>
            <p className="text-xs mt-1 opacity-70">
              Add records manually or upload a CSV file
            </p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3 pl-4">
                    FSE Name
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">
                    FIPL Code
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">
                    Customer Name
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">
                    Date
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">
                    Duration
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">
                    Outcome
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">
                    Notes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((record: CallingRecord, i: number) => (
                  <TableRow
                    key={record.id.toString()}
                    className="border-border/40 hover:bg-primary/5 transition-colors"
                    data-ocid={`feedback.calling.item.${i + 1}`}
                  >
                    <TableCell className="py-3 pl-4 font-semibold text-sm">
                      {record.fseName || "—"}
                    </TableCell>
                    <TableCell className="py-3 text-xs font-mono-data text-primary/80">
                      {record.fiplCode || "—"}
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      {record.customerName}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {formatDate(record.date)}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {record.callDuration || "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 border",
                          getOutcomeBadgeStyle(record.outcome),
                        )}
                      >
                        {record.outcome}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground max-w-[180px] truncate">
                      {record.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {!isLoading && sorted.length > 0 && (
        <p className="text-xs text-muted-foreground/60 mt-3 text-right">
          {sorted.length} record{sorted.length !== 1 ? "s" : ""}
        </p>
      )}

      <AddCallingRecordDialog open={addOpen} onOpenChange={setAddOpen} />
      <BulkUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  );
}

// ─── Main FeedbackPage ────────────────────────────────────────────────────────

type FeedbackTab = "calling" | "reviews";

export function FeedbackPage() {
  const [activeTab, setActiveTab] = useState<FeedbackTab>("calling");

  return (
    <div className="p-6 max-w-7xl mx-auto" data-ocid="feedback.page">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold mb-1">
          Insights
        </p>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Feedback
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Calling records and customer reviews in one place
        </p>
      </motion.div>

      {/* Tab switcher */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/50 w-fit mb-7"
      >
        <button
          type="button"
          onClick={() => setActiveTab("calling")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
            activeTab === "calling"
              ? "bg-background text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground",
          )}
          data-ocid="feedback.calling.tab"
        >
          <Phone className="w-3.5 h-3.5" />
          Calling Records
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reviews")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
            activeTab === "reviews"
              ? "bg-background text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground",
          )}
          data-ocid="feedback.reviews.tab"
        >
          <Users className="w-3.5 h-3.5" />
          Customer Reviews
        </button>
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "calling" ? (
          <motion.div
            key="calling"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <CallingRecordsTab />
          </motion.div>
        ) : (
          <motion.div
            key="reviews"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <CustomerReviewsTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
