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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Severity } from "../backend";
import { useAppSettings } from "../context/AppSettingsContext";
import { useAddFeedback } from "../hooks/useQueries";

interface AddFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: bigint;
  employeeName: string;
}

interface FeedbackFormData {
  category: string;
  description: string;
  severity: Severity;
}

const defaultForm: FeedbackFormData = {
  category: "",
  description: "",
  severity: Severity.medium,
};

const SEVERITY_OPTIONS: {
  value: Severity;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: Severity.low,
    label: "Low",
    description: "Minor issue, no immediate action",
    color:
      "border-[oklch(0.65_0.14_145_/_0.4)] bg-[oklch(0.93_0.05_145_/_0.5)] text-[oklch(0.38_0.16_145)]",
  },
  {
    value: Severity.medium,
    label: "Medium",
    description: "Needs attention soon",
    color:
      "border-[oklch(0.65_0.15_75_/_0.4)] bg-[oklch(0.96_0.04_75_/_0.5)] text-[oklch(0.45_0.16_75)]",
  },
  {
    value: Severity.high,
    label: "High",
    description: "Urgent — requires immediate action",
    color:
      "border-[oklch(0.65_0.18_25_/_0.4)] bg-[oklch(0.96_0.04_25_/_0.5)] text-[oklch(0.45_0.2_25)]",
  },
];

export function AddFeedbackModal({
  open,
  onOpenChange,
  employeeId,
  employeeName,
}: AddFeedbackModalProps) {
  const [form, setForm] = useState<FeedbackFormData>(defaultForm);
  const addFeedback = useAddFeedback();
  const { settings } = useAppSettings();
  const CATEGORY_SUGGESTIONS = settings.feedbackCategories;

  const set = <K extends keyof FeedbackFormData>(
    key: K,
    value: FeedbackFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.category.trim()) {
      toast.error("Category is required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }

    addFeedback.mutate(
      {
        employeeId,
        category: form.category.trim(),
        description: form.description.trim(),
        severity: form.severity,
      },
      {
        onSuccess: () => {
          toast.success(`Feedback recorded for ${employeeName}`);
          setForm(defaultForm);
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(`Failed to add feedback: ${err.message}`);
        },
      },
    );
  };

  const handleClose = () => {
    if (!addFeedback.isPending) {
      setForm(defaultForm);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-primary" />
            Add Feedback
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Recording feedback for{" "}
            <span className="font-semibold text-foreground">
              {employeeName}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-y-auto"
        >
          <div className="px-6 py-4 space-y-5">
            {/* Category */}
            <div className="space-y-2">
              <Label
                htmlFor="fb-category"
                className="text-xs font-semibold text-foreground/80"
              >
                Category <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fb-category"
                placeholder="e.g. Performance, HR, Operations..."
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="text-sm"
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_SUGGESTIONS.slice(0, 4).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => set("category", cat)}
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all",
                      form.category === cat
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80">
                Severity <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("severity", opt.value)}
                    className={cn(
                      "relative rounded-lg border p-3 text-left transition-all",
                      form.severity === opt.value
                        ? cn("border-2", opt.color)
                        : "border-border bg-muted/10 hover:bg-accent/30",
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-bold",
                        form.severity === opt.value ? "" : "text-foreground/80",
                      )}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                      {opt.description}
                    </p>
                    {form.severity === opt.value && (
                      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="fb-description"
                className="text-xs font-semibold text-foreground/80"
              >
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="fb-description"
                placeholder="Provide details about the feedback..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="text-sm min-h-[100px] resize-none"
              />
              <p className="text-[10px] text-muted-foreground/50 text-right">
                {form.description.length} chars
              </p>
            </div>
          </div>

          <Separator />
          <DialogFooter className="px-6 py-4 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={addFeedback.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={addFeedback.isPending}
              className="gap-2"
            >
              {addFeedback.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  Save Feedback
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
