import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  ChevronRight,
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
  Wifi,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { CallingRecord, CustomerReview } from "../backend.d.ts";
import {
  type SheetCallRecord,
  useGoogleSheetCallRecords,
} from "../hooks/useGoogleSheetData";
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
      <div className="relative glass-card rounded-xl p-5 border border-border/50">
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
      </div>
    </div>
  );
}

// ─── Remark View Dialog ───────────────────────────────────────────────────────

type RemarkRecord = {
  remark: string;
  customerName?: string;
  fseName?: string;
  cesScore?: number;
  dateOfCall?: string;
};

function RemarkViewDialog({
  record,
  open,
  onOpenChange,
}: {
  record: RemarkRecord | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!record) return null;
  const isNegative = record.cesScore !== undefined && record.cesScore < 30;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-ocid="feedback.remark.modal">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-bold">
            Remark
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap gap-3 pt-1">
              {record.customerName && (
                <span className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground/80">
                    Customer:
                  </span>{" "}
                  {record.customerName}
                </span>
              )}
              {record.fseName && (
                <span className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground/80">FSE:</span>{" "}
                  {record.fseName}
                </span>
              )}
              {record.cesScore !== undefined && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${isNegative ? "bg-red-500/20 text-red-600" : "bg-emerald-500/20 text-emerald-600"}`}
                >
                  CES {record.cesScore}
                </span>
              )}
              {record.dateOfCall && (
                <span className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground/80">
                    Date:
                  </span>{" "}
                  {record.dateOfCall}
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 rounded-lg bg-muted/30 border border-border/40 p-4 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {record.remark || "—"}
        </div>
        <div className="flex justify-end mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            data-ocid="feedback.remark.close_button"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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

function SheetCallRecordCard({ record }: { record: SheetCallRecord }) {
  const isNegative = record.cesScore < 30;
  const [remarkOpen, setRemarkOpen] = useState(false);
  return (
    <div className="break-inside-avoid mb-4">
      <div
        className={`relative rounded-xl p-5 border ${isNegative ? "border-red-400/50 border-l-4 border-l-red-500 bg-red-50/10" : "border-border/50 glass-card"}`}
      >
        {/* CES Score badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="font-semibold text-sm text-foreground leading-tight pr-2">
            {record.customerName || "Unknown Customer"}
          </p>
          <span
            className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${isNegative ? "bg-red-500/20 text-red-600" : "bg-emerald-500/20 text-emerald-600"}`}
          >
            CES {record.cesScore}
          </span>
        </div>

        {/* Remark */}
        {record.remark && (
          <button
            type="button"
            className="text-sm text-foreground/80 leading-relaxed line-clamp-3 cursor-pointer hover:underline hover:text-foreground transition-colors text-left w-full bg-transparent border-0 p-0"
            onClick={() => setRemarkOpen(true)}
            title="Click to view full remark"
          >
            {record.remark}
          </button>
        )}
        <RemarkViewDialog
          record={{
            remark: record.remark,
            customerName: record.customerName,
            fseName: record.fseName,
            cesScore: record.cesScore,
            dateOfCall: record.dateOfCall,
          }}
          open={remarkOpen}
          onOpenChange={setRemarkOpen}
        />

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border/30 flex items-end justify-between gap-2">
          <div>
            {record.fseName && (
              <p className="text-[11px] text-muted-foreground/80 font-medium">
                FSE: {record.fseName}
              </p>
            )}
            {record.priority && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Priority: {record.priority}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-[10px] text-muted-foreground/60 shrink-0">
              {record.dateOfCall}
            </p>
            <span className="text-[9px] bg-primary/10 text-primary/70 rounded px-1.5 py-0.5 font-medium">
              Live Sheet
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type ReviewFilter = "all" | "positive" | "negative";

function CustomerReviewsTab() {
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [reviewEmpFilter, setReviewEmpFilter] = useState("all");
  const { data: reviews = [], isLoading } = useCustomerReviews();
  const { data: sheetCallRecords = [], isLoading: sheetLoading } =
    useGoogleSheetCallRecords();
  const deleteReview = useDeleteCustomerReview();
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  // Unique FSE names for employee filter
  const reviewFseNames = Array.from(
    new Set(
      sheetCallRecords.map((r: SheetCallRecord) => r.fseName).filter(Boolean),
    ),
  ).sort() as string[];

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

  // Filter sheet records by CES score and employee
  const filteredSheetRecords = sheetCallRecords.filter((r: SheetCallRecord) => {
    if (filter === "positive" && r.cesScore < 30) return false;
    if (filter === "negative" && r.cesScore >= 30) return false;
    if (reviewEmpFilter !== "all" && r.fseName !== reviewEmpFilter)
      return false;
    return true;
  });

  // Sort sheet records by date desc
  const sortedSheetRecords = [...filteredSheetRecords].sort(
    (a: SheetCallRecord, b: SheetCallRecord) => {
      return (b.dateOfCall || "").localeCompare(a.dateOfCall || "");
    },
  );

  // Filter manual reviews (canister) - treat rating as CES proxy if needed, or show all
  const filteredReviews = reviews.filter((r) => {
    const ces = Number(r.rating) * 20; // map 1-5 stars to 0-100 scale
    if (filter === "positive") return ces >= 30;
    if (filter === "negative") return ces < 30;
    return true;
  });

  const sortedReviews = [...filteredReviews].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt),
  );

  const isLoadingAll = isLoading || sheetLoading;
  const hasAny = sortedSheetRecords.length > 0 || sortedReviews.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-bold text-foreground">
              Customer Reviews & Feedback
            </h2>
            {sheetCallRecords.length > 0 && (
              <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 rounded-full px-2 py-0.5">
                Live · Google Sheets
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Call records from Sheet 7 and manually added reviews
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

      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-2 mb-6"
        data-ocid="feedback.review.tab"
      >
        {(["all", "positive", "negative"] as ReviewFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              filter === f
                ? f === "negative"
                  ? "bg-red-500 text-white border-red-500"
                  : f === "positive"
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
            }`}
          >
            {f === "all"
              ? "All"
              : f === "positive"
                ? "✓ Positive (CES ≥ 30)"
                : "✗ Negative (CES < 30)"}
          </button>
        ))}
        <Select value={reviewEmpFilter} onValueChange={setReviewEmpFilter}>
          <SelectTrigger
            className="h-7 text-xs w-40"
            data-ocid="feedback.review_employee.select"
          >
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            <SelectItem value="all">All Employees</SelectItem>
            {reviewFseNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground/60">
          {sortedSheetRecords.length} call records · {sortedReviews.length}{" "}
          manual reviews
        </span>
      </div>

      {isLoadingAll ? (
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
      ) : !hasAny ? (
        <div
          className="flex flex-col items-center justify-center py-24 text-muted-foreground/50"
          data-ocid="feedback.review.empty_state"
        >
          <MessageSquare className="w-10 h-10 mb-3 opacity-25" />
          <p className="text-sm font-semibold">No reviews found</p>
          <p className="text-xs mt-1 opacity-70">
            {filter !== "all"
              ? "Try changing the filter or add"
              : "Add the first"}{" "}
            customer review to get started
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {/* Sheet 7 call records first */}
          {sortedSheetRecords.map((record: SheetCallRecord, idx: number) => (
            <SheetCallRecordCard
              key={`sheet-${record.id || idx}`}
              record={record}
            />
          ))}
          {/* Manual canister reviews with "Manual" badge */}
          {sortedReviews.map((review) => (
            <div
              key={review.id.toString()}
              className="break-inside-avoid mb-4 relative"
            >
              <span className="absolute top-3 left-3 z-10 text-[9px] font-semibold bg-muted/70 text-muted-foreground rounded px-1.5 py-0.5">
                Manual
              </span>
              <ReviewCard
                review={review}
                onDelete={() => handleDelete(review.id)}
                isDeleting={deletingId === review.id}
              />
            </div>
          ))}
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
  customerContact: "",
  brand: "",
  product: "",
  cesScore: "",
  remark: "",
  date: new Date().toISOString().split("T")[0],
  callDuration: "",
  outcome: "Completed",
  notes: "",
  agent: "",
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
        customerContact: form.customerContact,
        brand: form.brand,
        product: form.product,
        cesScore: BigInt(Number(form.cesScore) || 0),
        remark: form.remark,
        date: parseDateToNs(form.date),
        callDuration: form.callDuration,
        outcome: form.outcome,
        notes: form.notes,
        agent: form.agent,
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
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="feedback.calling.dialog"
      >
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
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Customer Contact</Label>
            <Input
              value={form.customerContact}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerContact: e.target.value }))
              }
              placeholder="e.g. 9876543210"
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Brand</Label>
              <Input
                value={form.brand}
                onChange={(e) =>
                  setForm((f) => ({ ...f, brand: e.target.value }))
                }
                placeholder="e.g. Ecovacs"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Product</Label>
              <Input
                value={form.product}
                onChange={(e) =>
                  setForm((f) => ({ ...f, product: e.target.value }))
                }
                placeholder="e.g. X2 PRO"
                className="text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">CES Score (0-10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={form.cesScore}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cesScore: e.target.value }))
                }
                placeholder="e.g. 8"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Agent</Label>
              <Input
                value={form.agent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, agent: e.target.value }))
                }
                placeholder="e.g. Ramesh Kumar"
                className="text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Remark</Label>
            <Input
              value={form.remark}
              onChange={(e) =>
                setForm((f) => ({ ...f, remark: e.target.value }))
              }
              placeholder="e.g. Customer was satisfied"
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Date of Call</Label>
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
  customerContact: string;
  brand: string;
  product: string;
  cesScore: number;
  remark: string;
  dateOfCall: string;
  callDuration: string;
  outcome: string;
  notes: string;
  agent: string;
  valid: boolean;
  error?: string;
}

function downloadCallingTemplate() {
  const headers = [
    "FIPL Code",
    "FSE Name",
    "Customer Name",
    "Brand",
    "Product",
    "CES Score",
    "Remark",
    "Date of Call",
    "Agent",
  ];
  const sample = [
    "FIPL001",
    "Arjun Singh",
    "Priya Sharma",
    "Ecovacs",
    "Ecovacs X2 PRO",
    "8",
    "Customer was satisfied with demo",
    "15-03-2026",
    "Ramesh Kumar",
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
      const normalized = c.toLowerCase().replace(/[^a-z0-9]/g, "");
      const idx = header.findIndex(
        (h) => h === normalized || h.includes(normalized),
      );
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const fiplIdx = colIdx(["fiplcode", "fipl"]);
  const nameIdx = colIdx(["fsename", "fsename"]);
  const custIdx = colIdx(["customername", "customer"]);
  const _contactIdx = colIdx(["customercontact", "contact"]); // kept for backwards-compat, not used
  const brandIdx = colIdx(["brand"]);
  const productIdx = colIdx(["product"]);
  const cesIdx = colIdx(["cesscore", "ces"]);
  const remarkIdx = colIdx(["remark", "remarks"]);
  const dateIdx = colIdx(["dateofcall", "date"]);
  const durIdx = colIdx(["callduration", "duration"]);
  const outIdx = colIdx(["outcome"]);
  const notesIdx = colIdx(["notes"]);
  const agentIdx = colIdx(["agent"]);

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
      customerContact: "", // column removed from template
      brand: get(brandIdx),
      product: get(productIdx),
      cesScore: Number(get(cesIdx)) || 0,
      remark: get(remarkIdx),
      dateOfCall: get(dateIdx),
      callDuration: get(durIdx),
      outcome: get(outIdx) || "Completed",
      notes: get(notesIdx),
      agent: get(agentIdx),
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
      const ddmm = r.dateOfCall.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (ddmm) {
        dateMs = new Date(
          `${ddmm[3]}-${ddmm[2].padStart(2, "0")}-${ddmm[1].padStart(2, "0")}`,
        ).getTime();
      } else {
        dateMs = new Date(r.dateOfCall).getTime();
      }
      return {
        fiplCode: r.fiplCode,
        fseName: r.fseName,
        customerName: r.customerName,
        customerContact: r.customerContact,
        brand: r.brand,
        product: r.product,
        cesScore: BigInt(r.cesScore || 0),
        remark: r.remark,
        date: BigInt(Number.isNaN(dateMs) ? Date.now() : dateMs) * 1_000_000n,
        callDuration: r.callDuration || "",
        outcome: r.outcome || "Completed",
        notes: r.notes || "",
        agent: r.agent,
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
                      <TableHead className="text-[10px] py-2">Brand</TableHead>
                      <TableHead className="text-[10px] py-2">
                        Product
                      </TableHead>
                      <TableHead className="text-[10px] py-2">CES</TableHead>
                      <TableHead className="text-[10px] py-2">Remark</TableHead>
                      <TableHead className="text-[10px] py-2">Date</TableHead>
                      <TableHead className="text-[10px] py-2">Agent</TableHead>
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
                          {row.brand || "—"}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 text-muted-foreground max-w-[80px] truncate">
                          {row.product || "—"}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 font-mono-data">
                          {row.cesScore}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 text-muted-foreground max-w-[100px] truncate">
                          {row.remark || "—"}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 text-muted-foreground">
                          {row.dateOfCall}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 text-muted-foreground">
                          {row.agent || "—"}
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

type DisplayRecord = {
  key: string;
  fiplCode: string;
  fseName: string;
  customerName: string;
  brand: string;
  product: string;
  cesScore: number;
  remark: string;
  dateDisplay: string;
  agent: string;
  priority: string;
  isFromSheet: boolean;
};

function CallingRecordsTab() {
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DisplayRecord | null>(
    null,
  );
  const [recordDetailOpen, setRecordDetailOpen] = useState(false);
  const { data: canisterRecords = [], isLoading: canisterLoading } =
    useCallingRecords();
  const { data: sheetRecords = [], isLoading: sheetLoading } =
    useGoogleSheetCallRecords();

  const isLive = sheetRecords.length > 0;
  const isLoading = sheetLoading || canisterLoading;

  const displayRecords: DisplayRecord[] = isLive
    ? sheetRecords.map((r: SheetCallRecord, i: number) => ({
        key: `sheet-${i}`,
        fiplCode: r.fiplCode,
        fseName: r.fseName,
        customerName: r.customerName,
        brand: r.brand,
        product: r.product,
        cesScore: r.cesScore,
        remark: r.remark,
        dateDisplay: r.dateOfCall,
        agent: r.agent,
        priority: r.priority,
        isFromSheet: true,
      }))
    : [...canisterRecords]
        .sort((a, b) => Number(b.date) - Number(a.date))
        .map((r) => ({
          key: r.id.toString(),
          fiplCode: r.fiplCode || "",
          fseName: r.fseName || "",
          customerName: r.customerName,
          brand: r.brand || "",
          product: r.product || "",
          cesScore: Number(r.cesScore),
          remark: r.remark || "",
          dateDisplay: formatDate(r.date),
          agent: r.agent || "",
          priority: "",
          isFromSheet: false,
        }));

  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [empFilter, setEmpFilter] = useState("all");

  // Unique FSE names for employee filter
  const fseNames = Array.from(
    new Set(displayRecords.map((r) => r.fseName).filter(Boolean)),
  ).sort();

  // Helper: parse month/year from dateOfCall string
  function parseMY(dateStr: string): { month: number; year: number } | null {
    if (!dateStr) return null;
    // Try DD-MM-YYYY
    const ddmm = dateStr.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
    if (ddmm)
      return {
        month: Number.parseInt(ddmm[2]),
        year: Number.parseInt(ddmm[3]),
      };
    // Try YYYY-MM-DD
    const yyyymm = dateStr.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})$/);
    if (yyyymm)
      return {
        month: Number.parseInt(yyyymm[2]),
        year: Number.parseInt(yyyymm[1]),
      };
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime()))
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    return null;
  }

  const availableYears = Array.from(
    new Set(
      displayRecords.map((r) => parseMY(r.dateDisplay)?.year).filter(Boolean),
    ),
  ).sort() as number[];

  // Keep sorted for any legacy references — now filtered
  const sorted = displayRecords.filter((r) => {
    const my = parseMY(r.dateDisplay);
    if (filterMonth !== "all" && my?.month !== Number.parseInt(filterMonth))
      return false;
    if (filterYear !== "all" && my?.year !== Number.parseInt(filterYear))
      return false;
    if (empFilter !== "all" && r.fseName !== empFilter) return false;
    return true;
  });

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
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1.5">
              <Wifi className="w-2.5 h-2.5" />
              Live · Google Sheets
            </span>
          )}
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

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger
            className="h-7 text-xs w-32"
            data-ocid="feedback.month.select"
          >
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            <SelectItem value="all">All Months</SelectItem>
            {[
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ].map((m, idx) => (
              <SelectItem key={m} value={String(idx + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger
            className="h-7 text-xs w-24"
            data-ocid="feedback.year.select"
          >
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={empFilter} onValueChange={setEmpFilter}>
          <SelectTrigger
            className="h-7 text-xs w-40"
            data-ocid="feedback.employee.select"
          >
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            <SelectItem value="all">All Employees</SelectItem>
            {fseNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <div className="divide-y divide-border/40">
            {sorted.map((record: DisplayRecord, i: number) => {
              const isNeg = record.cesScore < 30;
              return (
                <button
                  key={record.key}
                  type="button"
                  className={cn(
                    "w-full text-left px-4 py-3.5 flex items-center gap-4 cursor-pointer transition-colors hover:bg-primary/5",
                    isNeg &&
                      "border-l-[3px] border-l-red-500 bg-red-50/30 hover:bg-red-50/50",
                    !isNeg && "border-l-[3px] border-l-transparent",
                  )}
                  onClick={() => {
                    setSelectedRecord(record);
                    setRecordDetailOpen(true);
                  }}
                  data-ocid={`feedback.calling.item.${i + 1}`}
                >
                  {/* CES badge */}
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full",
                      isNeg
                        ? "bg-red-100 text-red-700 border border-red-300"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-300",
                    )}
                  >
                    {isNeg ? "⚠" : "✓"} CES: {record.cesScore}
                  </span>
                  {/* FSE Name */}
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-sm text-foreground truncate">
                      {record.fseName || "—"}
                    </span>
                    <span className="block text-[10px] font-mono text-muted-foreground/70 mt-0.5">
                      {record.fiplCode || "—"}
                    </span>
                  </span>
                  {/* Date */}
                  <span className="shrink-0 text-xs text-muted-foreground hidden sm:block">
                    {record.dateDisplay || "—"}
                  </span>
                  {/* Chevron hint */}
                  <ChevronRight className="shrink-0 w-3.5 h-3.5 text-muted-foreground/40" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!isLoading && sorted.length > 0 && (
        <p className="text-xs text-muted-foreground/60 mt-3 text-right">
          {sorted.length} record{sorted.length !== 1 ? "s" : ""}
        </p>
      )}

      <AddCallingRecordDialog open={addOpen} onOpenChange={setAddOpen} />
      <BulkUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} />

      {/* Call Record Detail Dialog */}
      <Dialog open={recordDetailOpen} onOpenChange={setRecordDetailOpen}>
        <DialogContent className="max-w-lg" data-ocid="feedback.calling.dialog">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Call Record Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Full details for this feedback call record
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="mt-2 space-y-4">
              {/* CES Score banner */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2.5",
                  selectedRecord.cesScore < 30
                    ? "bg-red-50 border border-red-200"
                    : "bg-emerald-50 border border-emerald-200",
                )}
              >
                <span
                  className={cn(
                    "text-2xl font-bold",
                    selectedRecord.cesScore < 30
                      ? "text-red-600"
                      : "text-emerald-600",
                  )}
                >
                  {selectedRecord.cesScore}
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    CES Score
                  </p>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      selectedRecord.cesScore < 30
                        ? "text-red-600"
                        : "text-emerald-600",
                    )}
                  >
                    {selectedRecord.cesScore < 30
                      ? "⚠ Negative Feedback"
                      : "✓ Positive Feedback"}
                  </p>
                </div>
              </div>
              {/* 2-column grid fields */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                    FIPL Code
                  </p>
                  <p className="text-sm font-mono text-foreground">
                    {selectedRecord.fiplCode || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                    FSE Name
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedRecord.fseName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                    Customer Name
                  </p>
                  <p className="text-sm text-foreground">
                    {selectedRecord.customerName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                    Brand
                  </p>
                  <p className="text-sm text-foreground">
                    {selectedRecord.brand || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                    Product
                  </p>
                  <p className="text-sm text-foreground">
                    {selectedRecord.product || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                    Agent
                  </p>
                  <p className="text-sm text-foreground">
                    {selectedRecord.agent || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                    Date of Call
                  </p>
                  <p className="text-sm text-foreground">
                    {selectedRecord.dateDisplay || "—"}
                  </p>
                </div>
                {selectedRecord.priority && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                      Priority
                    </p>
                    <p className="text-sm text-foreground">
                      {selectedRecord.priority}
                    </p>
                  </div>
                )}
              </div>
              {/* Remark full-width */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                  Remark
                </p>
                <p className="text-sm text-foreground bg-muted/30 rounded-lg px-3 py-2.5 leading-relaxed">
                  {selectedRecord.remark || "No remark provided."}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecordDetailOpen(false)}
              data-ocid="feedback.calling.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold mb-1">
          Insights
        </p>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Feedback
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Calling records and customer reviews in one place
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/50 w-fit mb-7">
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
      </div>

      {/* Tab content */}

      {activeTab === "calling" ? (
        <div key="calling">
          <CallingRecordsTab />
        </div>
      ) : (
        <div key="reviews">
          <CustomerReviewsTab />
        </div>
      )}
    </div>
  );
}
