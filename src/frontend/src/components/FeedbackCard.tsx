import { cn } from "@/lib/utils";
import { Severity } from "../backend";
import type { Feedback } from "../backend.d.ts";

interface FeedbackCardProps {
  feedback: Feedback;
  employeeName: string;
  compact?: boolean;
}

const severityConfig = {
  [Severity.high]: {
    label: "High",
    className: "severity-high",
    dot: "bg-[oklch(0.8_0.18_25)]",
  },
  [Severity.medium]: {
    label: "Medium",
    className: "severity-medium",
    dot: "bg-[oklch(0.82_0.16_75)]",
  },
  [Severity.low]: {
    label: "Low",
    className: "severity-low",
    dot: "bg-[oklch(0.75_0.16_145)]",
  },
};

export function FeedbackCard({
  feedback,
  employeeName,
  compact = false,
}: FeedbackCardProps) {
  const config =
    severityConfig[feedback.severity] ?? severityConfig[Severity.low];

  const formatDate = (ts: bigint) => {
    try {
      // ICP timestamps are in nanoseconds
      const ms = Number(ts) / 1_000_000;
      return new Date(ms).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      className={cn(
        "px-4 py-3 hover:bg-accent/20 transition-colors",
        compact && "px-3 py-2.5",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", config.dot)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            <span className="text-xs font-semibold text-foreground truncate">
              {employeeName}
            </span>
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                config.className,
              )}
            >
              {config.label}
            </span>
            <span className="text-[10px] text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded">
              {feedback.category}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {feedback.description}
          </p>
          {feedback.date > BigInt(0) && (
            <p className="text-[10px] font-mono-data text-muted-foreground/50 mt-1">
              {formatDate(feedback.date)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
