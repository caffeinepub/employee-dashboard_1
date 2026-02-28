import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  Plus,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import { type Variants, motion } from "motion/react";
import { useState } from "react";
import { Severity } from "../backend";
import type { Employee, Feedback } from "../backend.d.ts";
import {
  useActiveEmployeeCount,
  useAllEmployees,
  useAllFeedback,
} from "../hooks/useQueries";
import { AddEmployeeModal } from "./AddEmployeeModal";
import { BulkUploadModal } from "./BulkUploadModal";
import { EmployeeCard } from "./EmployeeCard";
import { FeedbackCard } from "./FeedbackCard";

const SKELETON_KEYS_5 = ["sk-a", "sk-b", "sk-c", "sk-d", "sk-e"];
const SKELETON_KEYS_6 = ["sk-a", "sk-b", "sk-c", "sk-d", "sk-e", "sk-f"];

interface OverviewPageProps {
  onSelectEmployee: (employee: Employee) => void;
}

const severityOrder: Record<string, number> = {
  [Severity.high]: 0,
  [Severity.medium]: 1,
  [Severity.low]: 2,
};

export function OverviewPage({ onSelectEmployee }: OverviewPageProps) {
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const { data: activeCount, isLoading: countLoading } =
    useActiveEmployeeCount();
  const { data: employees = [], isLoading: employeesLoading } =
    useAllEmployees();
  const { data: feedback = [], isLoading: feedbackLoading } = useAllFeedback();

  const sortedFeedback = [...feedback].sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2),
  );

  const highSeverityCount = feedback.filter(
    (f) => f.severity === Severity.high,
  ).length;
  const mediumSeverityCount = feedback.filter(
    (f) => f.severity === Severity.medium,
  ).length;

  const getEmployeeName = (id: bigint) =>
    employees.find((e) => e.id === id)?.name ?? `Employee #${id}`;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold mb-1">
              Command Center
            </p>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Workforce Overview
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Real-time insights across your organization
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkUploadOpen(true)}
              className="gap-2 text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Bulk Upload
            </Button>
            <Button
              size="sm"
              onClick={() => setAddEmployeeOpen(true)}
              className="gap-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Employee
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
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
            {countLoading ? (
              <Skeleton className="h-9 w-16 mb-1 bg-muted/50" />
            ) : (
              <p className="text-4xl font-mono-data font-bold text-primary">
                {Number(activeCount ?? 0)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Active Employees
            </p>
          </div>
        </motion.div>

        {/* Total Employees */}
        <motion.div variants={itemVariants}>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-accent border border-border flex items-center justify-center">
                <Activity className="w-4.5 h-4.5 text-foreground/70" />
              </div>
            </div>
            {employeesLoading ? (
              <Skeleton className="h-9 w-16 mb-1 bg-muted/50" />
            ) : (
              <p className="text-4xl font-mono-data font-bold text-foreground">
                {employees.length}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Total Employees
            </p>
          </div>
        </motion.div>

        {/* High Priority Issues */}
        <motion.div variants={itemVariants}>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-[oklch(0.25_0.06_25_/_0.3)] border border-[oklch(0.5_0.15_25_/_0.3)] flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5 text-[oklch(0.8_0.18_25)]" />
              </div>
              {highSeverityCount > 0 && (
                <span className="text-[10px] font-semibold text-[oklch(0.8_0.18_25)] bg-[oklch(0.25_0.06_25_/_0.4)] px-2 py-0.5 rounded-full">
                  Urgent
                </span>
              )}
            </div>
            {feedbackLoading ? (
              <Skeleton className="h-9 w-16 mb-1 bg-muted/50" />
            ) : (
              <p className="text-4xl font-mono-data font-bold text-[oklch(0.8_0.18_25)]">
                {highSeverityCount}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              High Priority Issues
            </p>
          </div>
        </motion.div>

        {/* Total Feedback */}
        <motion.div variants={itemVariants}>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-[oklch(0.25_0.06_75_/_0.3)] border border-[oklch(0.5_0.15_75_/_0.3)] flex items-center justify-center">
                <TrendingUp className="w-4.5 h-4.5 text-[oklch(0.82_0.16_75)]" />
              </div>
            </div>
            {feedbackLoading ? (
              <Skeleton className="h-9 w-16 mb-1 bg-muted/50" />
            ) : (
              <p className="text-4xl font-mono-data font-bold text-[oklch(0.82_0.16_75)]">
                {mediumSeverityCount}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Medium Priority Issues
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Issues & Feedback */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="xl:col-span-1"
        >
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-sm text-foreground">
                  Issues & Feedback
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  {sortedFeedback.length} total entries
                </p>
              </div>
              <div className="flex gap-1.5">
                {highSeverityCount > 0 && (
                  <span className="severity-high text-[10px] font-semibold px-2 py-0.5 rounded-full border">
                    {highSeverityCount} high
                  </span>
                )}
              </div>
            </div>
            <div className="max-h-[520px] overflow-y-auto divide-y divide-border/30">
              {feedbackLoading ? (
                <div className="p-4 space-y-3">
                  {SKELETON_KEYS_5.map((k) => (
                    <Skeleton key={k} className="h-16 rounded-lg bg-muted/50" />
                  ))}
                </div>
              ) : sortedFeedback.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
                  <Activity className="w-8 h-8 mb-3 opacity-40" />
                  <p className="text-sm">No feedback recorded</p>
                </div>
              ) : (
                sortedFeedback.map((item) => (
                  <FeedbackCard
                    key={item.id.toString()}
                    feedback={item}
                    employeeName={getEmployeeName(item.employeeId)}
                  />
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Employee Grid */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="xl:col-span-2"
        >
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-sm text-foreground">
                  Employee Directory
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  Click any card to view full profile
                </p>
              </div>
              <span className="text-[10px] font-mono-data text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
                {employees.length} total
              </span>
            </div>
            <div className="p-4">
              {employeesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SKELETON_KEYS_6.map((k) => (
                    <Skeleton key={k} className="h-24 rounded-lg bg-muted/50" />
                  ))}
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {employees.map((employee) => (
                    <motion.div
                      key={employee.id.toString()}
                      variants={itemVariants}
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
      </div>

      <AddEmployeeModal
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
      />
      <BulkUploadModal open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} />
    </div>
  );
}
