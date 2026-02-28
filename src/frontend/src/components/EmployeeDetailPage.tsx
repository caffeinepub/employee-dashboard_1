import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  BarChart2,
  Building2,
  Calendar,
  CheckCircle2,
  Lightbulb,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  ShieldAlert,
  Star,
  Trash2,
} from "lucide-react";
import { AnimatePresence, type Variants, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Status } from "../backend";
import type { Employee } from "../backend.d.ts";
import {
  useDeleteEmployee,
  useEmployeeDetails,
  useFeedbackByEmployee,
  useUpdateEmployeeStatus,
} from "../hooks/useQueries";
import { AddFeedbackModal } from "./AddFeedbackModal";
import { EditEmployeeModal } from "./EditEmployeeModal";
import { getStatusClassName, getStatusLabel } from "./EmployeeCard";
import { FeedbackCard } from "./FeedbackCard";

interface EmployeeDetailPageProps {
  employee: Employee;
  onBack: () => void;
  onDeleted?: () => void;
}

const SKELETON_KEYS_3 = ["sk-a", "sk-b", "sk-c"];
const SKELETON_KEYS_4 = ["sk-a", "sk-b", "sk-c", "sk-d"];
const SKELETON_KEYS_6 = ["sk-a", "sk-b", "sk-c", "sk-d", "sk-e", "sk-f"];

export function EmployeeDetailPage({
  employee,
  onBack,
  onDeleted,
}: EmployeeDetailPageProps) {
  const [addFeedbackOpen, setAddFeedbackOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: details, isLoading: detailsLoading } = useEmployeeDetails(
    employee.id,
  );
  const { data: feedbackItems = [], isLoading: feedbackLoading } =
    useFeedbackByEmployee(employee.id);

  const updateStatus = useUpdateEmployeeStatus();
  const deleteEmployee = useDeleteEmployee();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleStatusChange = (value: string) => {
    const newStatus = value as Status;
    updateStatus.mutate(
      { id: employee.id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Status updated to ${getStatusLabel(newStatus)}`);
        },
        onError: () => {
          toast.error("Failed to update status");
        },
      },
    );
  };

  const handleDelete = () => {
    deleteEmployee.mutate(employee.id, {
      onSuccess: () => {
        toast.success(`${employee.name} has been removed`);
        setDeleteOpen(false);
        if (onDeleted) onDeleted();
        else onBack();
      },
      onError: () => {
        toast.error("Failed to delete employee");
        setDeleteOpen(false);
      },
    });
  };

  const formatJoinDate = (ts: bigint) => {
    try {
      const ms = Number(ts) / 1_000_000;
      const date = new Date(ms);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={employee.id.toString()}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.4 }}
        className="p-8 max-w-6xl mx-auto"
      >
        {/* Back button */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground -ml-2 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Overview
          </Button>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="gap-2 text-xs"
              disabled={detailsLoading || !details}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Employee
            </Button>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Employee
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {employee.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove {employee.name} and all their
                    associated data. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteEmployee.isPending}
                  >
                    {deleteEmployee.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      "Delete"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Employee Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={sectionVariants}>
            <div className="glass-card rounded-xl p-6 teal-glow">
              <div className="flex items-start gap-5">
                <Avatar className="w-16 h-16 shrink-0">
                  <AvatarFallback className="text-xl font-display font-bold bg-primary/15 text-primary border-2 border-primary/20">
                    {getInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-3 mb-1">
                    <h1 className="text-2xl font-display font-bold text-foreground">
                      {employee.name}
                    </h1>
                    <span
                      className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-full border",
                        getStatusClassName(employee.status),
                      )}
                    >
                      ● {getStatusLabel(employee.status)}
                    </span>
                  </div>

                  <p className="text-primary/80 font-semibold text-sm mb-2">
                    {employee.role}
                  </p>

                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {employee.department}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Joined {formatJoinDate(employee.joinDate)}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono-data">
                      <span className="text-muted-foreground/50">#</span>
                      {employee.id.toString()}
                    </span>
                  </div>

                  {/* Status change selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
                      Change status:
                    </span>
                    <Select
                      value={employee.status}
                      onValueChange={handleStatusChange}
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger className="h-7 text-xs w-36 border-border/50 bg-background/30">
                        {updateStatus.isPending ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Updating…
                          </span>
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Status.active} className="text-xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[oklch(0.72_0.18_145)] inline-block" />
                            Active
                          </span>
                        </SelectItem>
                        <SelectItem value={Status.inactive} className="text-xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
                            Inactive
                          </span>
                        </SelectItem>
                        <SelectItem value={Status.onHold} className="text-xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[oklch(0.82_0.16_75)] inline-block" />
                            On Hold
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div variants={sectionVariants}>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3 flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5" />
              Performance Metrics
            </h2>

            {detailsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {SKELETON_KEYS_3.map((k) => (
                  <Skeleton key={k} className="h-28 rounded-xl bg-muted/50" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Sales Score */}
                <div className="glass-card rounded-xl p-5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                    Sales Score
                  </p>
                  <p className="text-3xl font-mono-data font-bold text-primary mb-3">
                    {details?.performance
                      ? Number(details.performance.salesScore)
                      : 0}
                    <span className="text-sm text-muted-foreground font-normal">
                      /100
                    </span>
                  </p>
                  <Progress
                    value={
                      details?.performance
                        ? Number(details.performance.salesScore)
                        : 0
                    }
                    className="h-2 bg-muted/50"
                  />
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/60">
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Ops Score */}
                <div className="glass-card rounded-xl p-5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                    Operational Discipline
                  </p>
                  <p className="text-3xl font-mono-data font-bold text-[oklch(0.72_0.18_220)] mb-3">
                    {details?.performance
                      ? Number(details.performance.opsScore)
                      : 0}
                    <span className="text-sm text-muted-foreground font-normal">
                      /100
                    </span>
                  </p>
                  <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full score-bar-ops transition-all duration-700"
                      style={{
                        width: `${details?.performance ? Number(details.performance.opsScore) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/60">
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Reviews */}
                <div className="glass-card rounded-xl p-5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                    Total Reviews
                  </p>
                  <div className="flex items-end gap-2 mb-3">
                    <p className="text-3xl font-mono-data font-bold text-[oklch(0.82_0.16_75)]">
                      {details?.performance
                        ? Number(details.performance.reviewCount)
                        : 0}
                    </p>
                    <Star
                      className="w-5 h-5 text-[oklch(0.82_0.16_75)] mb-1"
                      fill="currentColor"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Performance reviews received
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* SWOT Analysis */}
          <motion.div variants={sectionVariants}>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
              SWOT Analysis
            </h2>
            {detailsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {SKELETON_KEYS_4.map((k) => (
                  <Skeleton key={k} className="h-36 rounded-xl bg-muted/50" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Strengths */}
                <div className="swot-strength rounded-xl p-5 border">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.72_0.18_145)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.72_0.18_145)]">
                      Strengths
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {(details?.swot.strengths ?? []).length === 0 ? (
                      <li className="text-xs text-muted-foreground/60 italic">
                        No data
                      </li>
                    ) : (
                      (details?.swot.strengths ?? []).map((s) => (
                        <li
                          key={s}
                          className="flex items-start gap-2 text-xs text-foreground/80"
                        >
                          <span className="text-[oklch(0.72_0.18_145)] mt-0.5 shrink-0">
                            ▸
                          </span>
                          {s}
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="swot-weakness rounded-xl p-5 border">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-[oklch(0.8_0.18_25)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.8_0.18_25)]">
                      Weaknesses
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {(details?.swot.weaknesses ?? []).length === 0 ? (
                      <li className="text-xs text-muted-foreground/60 italic">
                        No data
                      </li>
                    ) : (
                      (details?.swot.weaknesses ?? []).map((s) => (
                        <li
                          key={s}
                          className="flex items-start gap-2 text-xs text-foreground/80"
                        >
                          <span className="text-[oklch(0.8_0.18_25)] mt-0.5 shrink-0">
                            ▸
                          </span>
                          {s}
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                {/* Opportunities */}
                <div className="swot-opportunity rounded-xl p-5 border">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-[oklch(0.7_0.18_240)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.7_0.18_240)]">
                      Opportunities
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {(details?.swot.opportunities ?? []).length === 0 ? (
                      <li className="text-xs text-muted-foreground/60 italic">
                        No data
                      </li>
                    ) : (
                      (details?.swot.opportunities ?? []).map((s) => (
                        <li
                          key={s}
                          className="flex items-start gap-2 text-xs text-foreground/80"
                        >
                          <span className="text-[oklch(0.7_0.18_240)] mt-0.5 shrink-0">
                            ▸
                          </span>
                          {s}
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                {/* Threats */}
                <div className="swot-threat rounded-xl p-5 border">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="w-4 h-4 text-[oklch(0.82_0.16_75)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.82_0.16_75)]">
                      Threats
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {(details?.swot.threats ?? []).length === 0 ? (
                      <li className="text-xs text-muted-foreground/60 italic">
                        No data
                      </li>
                    ) : (
                      (details?.swot.threats ?? []).map((s) => (
                        <li
                          key={s}
                          className="flex items-start gap-2 text-xs text-foreground/80"
                        >
                          <span className="text-[oklch(0.82_0.16_75)] mt-0.5 shrink-0">
                            ▸
                          </span>
                          {s}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            )}
          </motion.div>

          {/* Behavioral Traits + Problems Row */}
          <motion.div
            variants={sectionVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Behavioral Traits */}
            <div>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                Behavioral Traits
              </h2>
              <div className="glass-card rounded-xl p-5 min-h-[100px]">
                {detailsLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {SKELETON_KEYS_6.map((k) => (
                      <Skeleton
                        key={k}
                        className="h-7 w-20 rounded-full bg-muted/50"
                      />
                    ))}
                  </div>
                ) : (details?.traits ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic">
                    No traits recorded
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(details?.traits ?? []).map((trait) => (
                      <span
                        key={trait}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Problems Faced */}
            <div>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                Problems Faced
              </h2>
              <div className="glass-card rounded-xl p-5 min-h-[100px]">
                {detailsLoading ? (
                  <div className="space-y-2">
                    {SKELETON_KEYS_4.map((k) => (
                      <Skeleton key={k} className="h-5 rounded bg-muted/50" />
                    ))}
                  </div>
                ) : (details?.problems ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic">
                    No problems recorded
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {(details?.problems ?? []).map((problem, i) => (
                      <li
                        key={problem}
                        className="flex items-start gap-3 text-xs text-foreground/80"
                      >
                        <span className="font-mono-data text-[10px] text-primary/60 mt-0.5 shrink-0 w-4 text-right">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="leading-relaxed">{problem}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </motion.div>

          {/* Employee Feedback */}
          <motion.div variants={sectionVariants}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Employee Feedback
                {!feedbackLoading && (
                  <span className="font-mono-data text-[10px] text-primary/60 bg-primary/10 px-2 py-0.5 rounded-full">
                    {feedbackItems.length}
                  </span>
                )}
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddFeedbackOpen(true)}
                className="gap-1.5 text-xs h-7 px-3"
              >
                <MessageSquarePlus className="w-3 h-3" />
                Add Feedback
              </Button>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              {feedbackLoading ? (
                <div className="p-4 space-y-3">
                  {SKELETON_KEYS_3.map((k) => (
                    <Skeleton key={k} className="h-16 rounded-lg bg-muted/50" />
                  ))}
                </div>
              ) : feedbackItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
                  <MessageSquare className="w-7 h-7 mb-3 opacity-40" />
                  <p className="text-sm">No feedback for this employee</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {feedbackItems.map((item) => (
                    <FeedbackCard
                      key={item.id.toString()}
                      feedback={item}
                      employeeName={employee.name}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      <AddFeedbackModal
        open={addFeedbackOpen}
        onOpenChange={setAddFeedbackOpen}
        employeeId={employee.id}
        employeeName={employee.name}
      />

      {details && (
        <EditEmployeeModal
          open={editOpen}
          onOpenChange={setEditOpen}
          employeeId={employee.id}
          details={details}
        />
      )}
    </AnimatePresence>
  );
}
