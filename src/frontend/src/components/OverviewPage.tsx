import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Lightbulb,
  PauseCircle,
  Plus,
  RefreshCw,
  UserMinus,
  Users,
} from "lucide-react";
import { type Variants, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Status } from "../backend";
import type { Employee } from "../backend.d.ts";
import { useAppSettings } from "../context/AppSettingsContext";
import { useGoogleSheetEmployees } from "../hooks/useGoogleSheetData";
import { useAllIssues, useTopPerformers } from "../hooks/useQueries";
import { AddEmployeeModal } from "./AddEmployeeModal";
import { EmployeeCard } from "./EmployeeCard";
import { IssuesDialog } from "./IssuesDialog";
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

interface OverviewPageProps {
  onSelectEmployee: (employee: Employee) => void;
}

export function OverviewPage({ onSelectEmployee }: OverviewPageProps) {
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    toast.success("Data refreshed from Google Sheets");
    setIsRefreshing(false);
  };
  const [issuesDialogOpen, setIssuesDialogOpen] = useState(false);
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false);

  const { settings } = useAppSettings();
  const { labels } = settings;

  const { data: employees = [], isLoading: employeesLoading } =
    useGoogleSheetEmployees();
  const { data: issues = [], isLoading: issuesLoading } = useAllIssues();
  const { data: topPerformers = [], isLoading: topPerformersLoading } =
    useTopPerformers();

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

  // Build directory from top performers only (match fiplCode) — active employees only, capped at 10
  const topPerformerCodes = new Set(topPerformers.map((tp) => tp.fiplCode));
  const directoryEmployees = employees
    .filter(
      (e) => topPerformerCodes.has(e.fiplCode) && e.status === Status.active,
    )
    .slice(0, 10);

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
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold mb-1">
              {labels.overviewBadgeLabel}
            </p>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {labels.overviewPageTitle}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {labels.overviewPageSubtitle}
            </p>
          </div>
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
            <Button
              size="sm"
              onClick={() => setAddEmployeeOpen(true)}
              className="gap-2 text-xs"
              data-ocid="overview.open_modal_button"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Employee
            </Button>
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

      {/* Employee Directory — active top performers only */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.14 }}
      >
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-sm text-foreground">
                {labels.overviewDirectoryTitle}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {topPerformers.length > 0
                  ? "Showing active top performers this month"
                  : labels.overviewDirectorySubtitle}
              </p>
            </div>
            <span className="text-[10px] font-mono-data text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
              {directoryEmployees.length} shown
            </span>
          </div>
          <div className="p-4">
            {employeesLoading || topPerformersLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SKELETON_KEYS_10.slice(0, 6).map((k) => (
                  <Skeleton key={k} className="h-24 rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : topPerformers.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-muted-foreground/50"
                data-ocid="directory.empty_state"
              >
                <Users className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm font-semibold">
                  No top performers uploaded
                </p>
                <p className="text-xs mt-0.5">
                  Upload top performers to populate the directory
                </p>
              </div>
            ) : directoryEmployees.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-muted-foreground/50"
                data-ocid="directory.empty_state"
              >
                <Users className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm font-semibold">
                  No active employees found
                </p>
                <p className="text-xs mt-0.5">
                  Only active top performers appear in the directory
                </p>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {directoryEmployees.map((employee, i) => (
                  <motion.div
                    key={employee.id.toString()}
                    variants={itemVariants}
                    data-ocid={`directory.item.${i + 1}`}
                  >
                    <EmployeeCard
                      employee={employee}
                      onClick={() => onSelectEmployee(employee)}
                    />
                  </motion.div>
                ))}
              </motion.div>
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
