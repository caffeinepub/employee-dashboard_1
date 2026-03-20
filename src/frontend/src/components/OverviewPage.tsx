import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Lightbulb,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { type Variants, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Status } from "../backend";
import type { Employee } from "../backend.d.ts";
import { useAppSettings } from "../context/AppSettingsContext";
import {
  useGoogleSheetEmployees,
  useGoogleSheetTopPerformers,
} from "../hooks/useGoogleSheetData";
import { useAllIssues } from "../hooks/useQueries";
import { AddEmployeeModal } from "./AddEmployeeModal";
import { IssuesDialog } from "./IssuesDialog";
import { PasswordGateDialog } from "./PasswordGateDialog";
import { SuggestionsDialog } from "./SuggestionsDialog";
import { TopPerformersSection } from "./TopPerformersSection";

const SKELETON_KEYS_10 = [
  "sk-a",
  "sk-b",
  "sk-c",
  "sk-d",
  "sk-e",
  "sk-f",
  "sk-g",
  "sk-h",
  "sk-i",
  "sk-j",
];

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatJoinDateFromBigInt(val: unknown): string {
  if (!val) return "—";
  try {
    const ns = BigInt(String(val));
    if (ns === 0n) return "—";
    const ms = Number(ns) / 1_000_000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime()) || d.getFullYear() < 1980) return String(val);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return String(val) ?? "—";
  }
}

interface OverviewPageProps {
  onSelectEmployee: (employee: Employee) => void;
}

export function OverviewPage({ onSelectEmployee }: OverviewPageProps) {
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [timeAgoText, setTimeAgoText] = useState("Just now");
  const queryClient = useQueryClient();

  // Update the "X min ago" text every 30 seconds
  useEffect(() => {
    setTimeAgoText(formatTimeAgo(lastRefreshed));
    const interval = setInterval(() => {
      setTimeAgoText(formatTimeAgo(lastRefreshed));
    }, 30_000);
    return () => clearInterval(interval);
  }, [lastRefreshed]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    const now = new Date();
    setLastRefreshed(now);
    setTimeAgoText("Just now");
    toast.success("Data refreshed from Google Sheets");
    setIsRefreshing(false);
  };

  const [issuesDialogOpen, setIssuesDialogOpen] = useState(false);
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false);

  const { settings, updateLabel } = useAppSettings();
  const { labels } = settings;

  // ── Inline editing for company branding ─────────────────────────────────
  const [brandingHover, setBrandingHover] = useState(false);
  const [editingBranding, setEditingBranding] = useState(false);
  const [draftName, setDraftName] = useState(labels.companyName);
  const [draftTagline, setDraftTagline] = useState(labels.companyTagline);
  const nameRef = useRef<HTMLInputElement>(null);

  const startEditBranding = () => {
    setDraftName(labels.companyName);
    setDraftTagline(labels.companyTagline);
    setEditingBranding(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const saveBranding = () => {
    if (draftName.trim()) updateLabel("companyName", draftName.trim());
    if (draftTagline.trim()) updateLabel("companyTagline", draftTagline.trim());
    setEditingBranding(false);
  };

  const cancelBranding = () => {
    setEditingBranding(false);
  };

  const { data: topPerformers = [] } = useGoogleSheetTopPerformers();
  const { data: employees = [], isLoading: employeesLoading } =
    useGoogleSheetEmployees();
  const { data: issues = [], isLoading: issuesLoading } = useAllIssues();

  // Derive counts directly from the employee list — filtered by status
  const activeCount = employees.filter(
    (e) => e.status === Status.active,
  ).length;
  const onHoldCount = employees.filter(
    (e) => e.status === Status.onHold,
  ).length;
  const inactiveCount = employees.filter(
    (e) => e.status === Status.inactive,
  ).length;

  const issueCount = issues.filter((i) => i.category !== "Suggestion").length;
  const suggestionCount = issues.filter(
    (i) => i.category === "Suggestion",
  ).length;

  const topPerformerCodes = new Set(
    topPerformers.map((tp) => tp.fiplCode.toUpperCase()),
  );
  const recentEmployees = employees.filter((emp) =>
    topPerformerCodes.has(emp.fiplCode.toUpperCase()),
  );

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4">
          {/* Company Branding — editable */}
          <div
            className="relative group flex-1 min-w-0"
            onMouseEnter={() => setBrandingHover(true)}
            onMouseLeave={() => setBrandingHover(false)}
          >
            {editingBranding ? (
              <div className="flex flex-col gap-1.5 max-w-sm">
                <input
                  ref={nameRef}
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveBranding();
                    if (e.key === "Escape") cancelBranding();
                  }}
                  placeholder="Company name"
                  className="text-2xl font-display font-bold bg-transparent border-b-2 border-primary/50 outline-none text-foreground w-full pb-0.5"
                />
                <input
                  type="text"
                  value={draftTagline}
                  onChange={(e) => setDraftTagline(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveBranding();
                    if (e.key === "Escape") cancelBranding();
                  }}
                  placeholder="Tagline"
                  className="text-sm bg-transparent border-b border-primary/30 outline-none text-muted-foreground w-full pb-0.5"
                />
                <div className="flex items-center gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={saveBranding}
                    className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelBranding}
                    className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md hover:bg-muted/80 transition-colors"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground leading-tight">
                    {labels.companyName}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5 italic">
                    {labels.companyTagline}
                  </p>
                </div>
                {brandingHover && (
                  <button
                    type="button"
                    onClick={startEditBranding}
                    className="mt-1 w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary/70 hover:bg-primary/20 transition-colors"
                    title="Edit company name and tagline"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right side controls */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2 text-xs"
                data-ocid="overview.refresh_button"
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
                />
                Refresh Data
              </Button>
              <PasswordGateDialog onSuccess={() => setAddEmployeeOpen(true)}>
                <Button
                  size="sm"
                  className="gap-2 text-xs"
                  data-ocid="overview.open_modal_button"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Employee
                </Button>
              </PasswordGateDialog>
            </div>
            {/* Last updated timestamp */}
            <p className="text-[10px] text-muted-foreground/60">
              Last updated: {timeAgoText}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards — 3 cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      >
        {/* Active Employees */}
        <motion.div variants={itemVariants}>
          <div className="glass-card rounded-xl p-5 teal-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-primary" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>
            {employeesLoading ? (
              <Skeleton className="h-9 w-16 mb-1 bg-muted/50" />
            ) : (
              <p className="text-4xl font-mono-data font-bold text-primary">
                {activeCount}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {labels.overviewActiveEmployeesLabel}
            </p>
          </div>
        </motion.div>

        {/* On Hold Employees */}
        <motion.div variants={itemVariants}>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-[oklch(0.96_0.04_75_/_0.6)] border border-[oklch(0.7_0.15_75_/_0.3)] flex items-center justify-center">
                <PauseCircle className="w-4.5 h-4.5 text-[oklch(0.48_0.16_75)]" />
              </div>
            </div>
            {employeesLoading ? (
              <Skeleton className="h-9 w-16 mb-1 bg-muted/50" />
            ) : (
              <p className="text-4xl font-mono-data font-bold text-[oklch(0.48_0.16_75)]">
                {onHoldCount}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {labels.overviewOnHoldLabel}
            </p>
          </div>
        </motion.div>

        {/* Inactive Employees */}
        <motion.div variants={itemVariants}>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-[oklch(0.96_0.03_25_/_0.5)] border border-[oklch(0.7_0.1_25_/_0.3)] flex items-center justify-center">
                <UserMinus className="w-4.5 h-4.5 text-[oklch(0.45_0.15_25)]" />
              </div>
            </div>
            {employeesLoading ? (
              <Skeleton className="h-9 w-16 mb-1 bg-muted/50" />
            ) : (
              <p className="text-4xl font-mono-data font-bold text-[oklch(0.45_0.15_25)]">
                {inactiveCount}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Inactive Employees
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Issues & Suggestions Buttons Row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.08 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6"
      >
        {/* Issues Button */}
        <button
          type="button"
          onClick={() => setIssuesDialogOpen(true)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 text-left group bg-[oklch(0.95_0.04_25_/_0.1)] hover:bg-[oklch(0.95_0.04_25_/_0.2)] text-[oklch(0.45_0.2_25)] border-[oklch(0.7_0.15_25_/_0.3)] hover:border-[oklch(0.7_0.15_25_/_0.5)]"
          data-ocid="overview.issues_button"
        >
          <div className="w-9 h-9 rounded-lg bg-[oklch(0.95_0.04_25_/_0.4)] border border-[oklch(0.7_0.15_25_/_0.3)] flex items-center justify-center shrink-0">
            <AlertCircle className="w-4.5 h-4.5 text-[oklch(0.45_0.2_25)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-bold">Issues</p>
            <p className="text-[11px] opacity-70">
              Operational &amp; HR issues
            </p>
          </div>
          {issuesLoading ? (
            <Skeleton className="h-6 w-8 bg-muted/50" />
          ) : (
            <span className="text-lg font-mono-data font-bold shrink-0">
              {issueCount}
            </span>
          )}
        </button>

        {/* Suggestions Button */}
        <button
          type="button"
          onClick={() => setSuggestionsDialogOpen(true)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 text-left group bg-[oklch(0.95_0.05_85_/_0.1)] hover:bg-[oklch(0.95_0.05_85_/_0.2)] text-[oklch(0.40_0.14_85)] border-[oklch(0.65_0.12_85_/_0.3)] hover:border-[oklch(0.65_0.12_85_/_0.5)]"
          data-ocid="overview.suggestions_button"
        >
          <div className="w-9 h-9 rounded-lg bg-[oklch(0.95_0.05_85_/_0.4)] border border-[oklch(0.65_0.12_85_/_0.3)] flex items-center justify-center shrink-0">
            <Lightbulb className="w-4.5 h-4.5 text-[oklch(0.40_0.14_85)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-bold">Suggestions</p>
            <p className="text-[11px] opacity-70">
              Ideas from the organization
            </p>
          </div>
          {issuesLoading ? (
            <Skeleton className="h-6 w-8 bg-muted/50" />
          ) : (
            <span className="text-lg font-mono-data font-bold shrink-0">
              {suggestionCount}
            </span>
          )}
        </button>
      </motion.div>

      {/* Top Performers */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="mb-6"
      >
        <TopPerformersSection />
      </motion.div>

      {/* Employee Directory — 10 active employees from database */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.13 }}
      >
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-sm text-foreground">
                Employee Directory
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Employees from the Top Performers list
              </p>
            </div>
            <span className="text-[10px] font-mono-data text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
              {recentEmployees.length} shown
            </span>
          </div>
          <div className="p-4">
            {employeesLoading ? (
              <div className="space-y-2">
                {SKELETON_KEYS_10.map((k) => (
                  <Skeleton key={k} className="h-10 rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : recentEmployees.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-muted-foreground/50"
                data-ocid="emp_directory.empty_state"
              >
                <Users className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm font-semibold">
                  No top performer employee records found
                </p>
                <p className="text-xs mt-0.5">
                  Make sure Top Performers FIPL Codes match employee records
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        #
                      </th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        Name
                      </th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        FIPL Code
                      </th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        Region
                      </th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        Category
                      </th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        Joining Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEmployees.map((emp, i) => (
                      <tr
                        key={emp.id.toString()}
                        className="border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => onSelectEmployee(emp)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && onSelectEmployee(emp)
                        }
                        tabIndex={0}
                        data-ocid={`emp_directory.item.${i + 1}`}
                      >
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          {emp.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">
                          {emp.fiplCode}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {emp.region ?? "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          {emp.fseCategory ? (
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-medium">
                              {emp.fseCategory}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {formatJoinDateFromBigInt(emp.joinDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      <AddEmployeeModal
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
      />
      <IssuesDialog
        open={issuesDialogOpen}
        onOpenChange={setIssuesDialogOpen}
      />
      <SuggestionsDialog
        open={suggestionsDialogOpen}
        onOpenChange={setSuggestionsDialogOpen}
      />
    </div>
  );
}
