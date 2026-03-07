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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  AlertCircle,
  ArrowLeft,
  BarChart2,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Lightbulb,
  Loader2,
  MapPin,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Plus,
  ShieldAlert,
  ShoppingBag,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { AnimatePresence, type Variants, motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { SaleType, SalesBrand, Status } from "../backend";
import type { Employee } from "../backend.d.ts";
import { useAppSettings } from "../context/AppSettingsContext";
import {
  useAddAttendanceRecord,
  useAddSalesRecord,
  useAttendanceByEmployee,
  useDeleteEmployee,
  useEmployeeDetails,
  useFeedbackByEmployee,
  useSalesRecordsByEmployee,
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

function getFseCategoryClassName(category: string): string {
  switch (category) {
    case "Cash Cow":
      return "bg-[oklch(0.93_0.05_165_/_0.5)] text-[oklch(0.32_0.15_165)] border-[oklch(0.65_0.12_165_/_0.4)]";
    case "Star":
      return "bg-[oklch(0.95_0.05_85_/_0.5)] text-[oklch(0.38_0.14_85)] border-[oklch(0.65_0.12_85_/_0.4)]";
    case "Question Mark":
      return "bg-[oklch(0.93_0.04_240_/_0.5)] text-[oklch(0.35_0.14_240)] border-[oklch(0.65_0.12_240_/_0.4)]";
    case "Dog":
      return "bg-[oklch(0.95_0.04_25_/_0.5)] text-[oklch(0.40_0.18_25)] border-[oklch(0.65_0.14_25_/_0.4)]";
    default:
      return "bg-muted/30 text-muted-foreground border-border/40";
  }
}

export function EmployeeDetailPage({
  employee,
  onBack,
  onDeleted,
}: EmployeeDetailPageProps) {
  const [addFeedbackOpen, setAddFeedbackOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addSalesOpen, setAddSalesOpen] = useState(false);
  const [addAttendanceOpen, setAddAttendanceOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  // Add Sales form state
  const [salesForm, setSalesForm] = useState({
    brand: "ecovacs",
    product: "",
    saleType: "accessories",
    quantity: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });
  // Add Attendance form state
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split("T")[0],
    lapseType: "Late Attendance",
    reason: "",
    daysOff: "0",
  });

  const { settings } = useAppSettings();
  const { labels } = settings;

  const { data: details, isLoading: detailsLoading } = useEmployeeDetails(
    employee.id,
  );
  const { data: feedbackItems = [], isLoading: feedbackLoading } =
    useFeedbackByEmployee(employee.id);
  const { data: salesRecords = [], isLoading: salesLoading } =
    useSalesRecordsByEmployee(employee.id);
  const { data: attendanceRecords = [], isLoading: attendanceLoading } =
    useAttendanceByEmployee(employee.id);

  const updateStatus = useUpdateEmployeeStatus();
  const deleteEmployee = useDeleteEmployee();
  const addSalesRecord = useAddSalesRecord();
  const addAttendanceRecord = useAddAttendanceRecord();

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
      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch {
      return "—";
    }
  };

  const formatDate = (ts: bigint) => {
    try {
      const ms = Number(ts) / 1_000_000;
      const date = new Date(ms);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatCurrency = (amount: bigint) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount));

  // ── Sales Trend Chart Data ──────────────────────────────────────────────────
  // Build month-over-month line data per year (last 2 years shown as separate lines)
  const salesChartData = useMemo(() => {
    if (salesRecords.length === 0) return { monthlyData: [], years: [] };

    type MonthEntry = {
      monthKey: string; // "Jan", "Feb", ...
      monthIndex: number;
      [year: string]: number | string;
    };

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const yearMap = new Map<number, Map<number, number>>();

    for (const rec of salesRecords) {
      const d = new Date(Number(rec.saleDate) / 1_000_000);
      const year = d.getFullYear();
      const month = d.getMonth();
      if (!yearMap.has(year)) yearMap.set(year, new Map());
      const ym = yearMap.get(year)!;
      ym.set(month, (ym.get(month) ?? 0) + Number(rec.amount));
    }

    const years = Array.from(yearMap.keys()).sort();
    // Build 12-month array
    const monthlyData: MonthEntry[] = monthNames.map((name, idx) => {
      const entry: MonthEntry = { monthKey: name, monthIndex: idx };
      for (const yr of years) {
        entry[yr.toString()] = yearMap.get(yr)?.get(idx) ?? 0;
      }
      return entry;
    });

    return { monthlyData, years };
  }, [salesRecords]);

  // ── Attendance Chart Data ───────────────────────────────────────────────────
  const attendanceChartData = useMemo(() => {
    if (attendanceRecords.length === 0) return [];

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    type AttMonth = {
      month: string;
      lapses: number;
      daysOff: number;
      sortKey: number;
    };
    const map = new Map<string, AttMonth>();

    for (const rec of attendanceRecords) {
      const d = new Date(Number(rec.date) / 1_000_000);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const existing = map.get(key) ?? {
        month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        lapses: 0,
        daysOff: 0,
        sortKey: d.getFullYear() * 100 + d.getMonth(),
      };
      if (rec.lapseType === "Day Off") {
        existing.daysOff += Number(rec.daysOff) || 1;
      } else {
        existing.lapses += 1;
      }
      map.set(key, existing);
    }

    return Array.from(map.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-12); // last 12 months
  }, [attendanceRecords]);

  const LINE_COLORS = [
    "oklch(0.52 0.14 175)",
    "oklch(0.55 0.2 25)",
    "oklch(0.52 0.16 240)",
    "oklch(0.62 0.16 75)",
    "oklch(0.52 0.16 290)",
  ];

  const handleAddSales = () => {
    const dateMs = salesForm.date
      ? new Date(salesForm.date).getTime()
      : Date.now();
    const saleDateNs =
      BigInt(Number.isNaN(dateMs) ? Date.now() : dateMs) * 1_000_000n;
    addSalesRecord.mutate(
      {
        employeeId: employee.id,
        fiplCode: employee.fiplCode ?? "",
        brand: salesForm.brand as SalesBrand,
        product: salesForm.product,
        saleType: salesForm.saleType as SaleType,
        quantity: BigInt(Number(salesForm.quantity) || 0),
        amount: BigInt(Number(salesForm.amount) || 0),
        saleDate: saleDateNs,
      },
      {
        onSuccess: () => {
          toast.success("Sales record added");
          setSalesForm({
            brand: "ecovacs",
            product: "",
            saleType: "accessories",
            quantity: "",
            amount: "",
            date: new Date().toISOString().split("T")[0],
          });
          setAddSalesOpen(false);
        },
        onError: () => toast.error("Failed to add sales record"),
      },
    );
  };

  const handleAddAttendance = () => {
    const dateMs = attendanceForm.date
      ? new Date(attendanceForm.date).getTime()
      : Date.now();
    const dateNs =
      BigInt(Number.isNaN(dateMs) ? Date.now() : dateMs) * 1_000_000n;
    addAttendanceRecord.mutate(
      {
        employeeId: employee.id,
        lapseType: attendanceForm.lapseType,
        date: dateNs,
        reason: attendanceForm.reason,
        daysOff: BigInt(Number(attendanceForm.daysOff) || 0),
      },
      {
        onSuccess: () => {
          toast.success("Attendance record added");
          setAttendanceForm({
            date: new Date().toISOString().split("T")[0],
            lapseType: "Late Attendance",
            reason: "",
            daysOff: "0",
          });
          setAddAttendanceOpen(false);
        },
        onError: () => toast.error("Failed to add attendance record"),
      },
    );
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
                    {/* FSE Category badge */}
                    {(employee as unknown as Record<string, string>)
                      .fseCategory && (
                      <span
                        className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-full border",
                          getFseCategoryClassName(
                            (employee as unknown as Record<string, string>)
                              .fseCategory,
                          ),
                        )}
                      >
                        {
                          (employee as unknown as Record<string, string>)
                            .fseCategory
                        }
                      </span>
                    )}
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
                    {(employee as unknown as Record<string, string>)
                      .fiplCode && (
                      <span className="flex items-center gap-1.5 font-mono-data text-primary/80 font-semibold">
                        <span className="text-muted-foreground/50">FIPL:</span>
                        {
                          (employee as unknown as Record<string, string>)
                            .fiplCode
                        }
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 font-mono-data">
                      <span className="text-muted-foreground/50">#</span>
                      {employee.id.toString()}
                    </span>
                  </div>

                  {/* Efficiency Score summary */}
                  {details?.performance &&
                    (() => {
                      const p = details.performance;
                      const effScore = Math.round(
                        (Number(p.salesInfluenceIndex) +
                          Number(p.reviewCount) +
                          Number(p.operationalDiscipline) +
                          Number(p.productKnowledgeScore) +
                          Number(p.softSkillsScore)) /
                          5,
                      );
                      const effColor =
                        effScore >= 75
                          ? "text-[oklch(0.42_0.16_145)]"
                          : effScore >= 50
                            ? "text-[oklch(0.48_0.16_75)]"
                            : "text-[oklch(0.42_0.2_25)]";
                      return (
                        <div className="mb-3 inline-flex items-center gap-2 bg-muted/30 border border-border/50 rounded-lg px-3 py-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Efficiency Score
                          </span>
                          <span
                            className={cn(
                              "text-lg font-mono-data font-bold",
                              effColor,
                            )}
                          >
                            {effScore}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            /100
                          </span>
                        </div>
                      );
                    })()}

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
                            <span className="w-2 h-2 rounded-full bg-[oklch(0.52_0.18_145)] inline-block" />
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
                            <span className="w-2 h-2 rounded-full bg-[oklch(0.62_0.16_75)] inline-block" />
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

          {/* Personal & Background */}
          <motion.div variants={sectionVariants}>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5" />
              {labels.detailPersonalSectionTitle}
            </h2>
            {detailsLoading ? (
              <div className="glass-card rounded-xl p-5 space-y-4">
                <Skeleton className="h-5 w-48 bg-muted/50" />
                <Skeleton className="h-5 w-64 bg-muted/50" />
                <Skeleton className="h-16 w-full bg-muted/50" />
              </div>
            ) : (
              <div className="glass-card rounded-xl p-5 space-y-5">
                {/* Region */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                      Region
                    </p>
                    <p className="text-sm text-foreground/80">
                      {details?.info.region || "—"}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-border/40" />

                {/* Family Details */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mt-0.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                      Family Details
                    </p>
                    <p className="text-sm text-foreground/80">
                      {details?.info.familyDetails || "—"}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-border/40" />

                {/* Past Work Experience */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mt-0.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      Past Work Experience
                    </p>
                    {(details?.info.pastExperience ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic">
                        No past experience recorded
                      </p>
                    ) : (
                      <ol className="space-y-1.5">
                        {(details?.info.pastExperience ?? []).map((exp, i) => (
                          <li
                            key={`exp-${i}-${exp.slice(0, 12)}`}
                            className="flex items-start gap-2.5 text-xs text-foreground/80"
                          >
                            <span className="font-mono-data text-[10px] text-primary/60 mt-0.5 shrink-0 w-4 text-right">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="leading-relaxed">{exp}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Performance Metrics */}
          <motion.div variants={sectionVariants}>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3 flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5" />
              {labels.detailPerformanceSectionTitle}
            </h2>

            {detailsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {["sk-a", "sk-b", "sk-c", "sk-d", "sk-e"].map((k) => (
                  <Skeleton key={k} className="h-28 rounded-xl bg-muted/50" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Sales Influence Index */}
                <div className="glass-card rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 leading-tight">
                    {labels.detailSalesInfluenceLabel}
                  </p>
                  <p className="text-2xl font-mono-data font-bold text-primary mb-2">
                    {details?.performance
                      ? Number(
                          (
                            details.performance as unknown as Record<
                              string,
                              bigint
                            >
                          ).salesInfluenceIndex ??
                            (
                              details.performance as unknown as Record<
                                string,
                                bigint
                              >
                            ).salesScore ??
                            0n,
                        )
                      : 0}
                  </p>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{
                        width: `${Math.min(100, details?.performance ? Number((details.performance as unknown as Record<string, bigint>).salesInfluenceIndex ?? (details.performance as unknown as Record<string, bigint>).salesScore ?? 0n) : 0)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Review Count */}
                <div className="glass-card rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 leading-tight">
                    {labels.detailReviewsLabel}
                  </p>
                  <div className="flex items-end gap-1.5 mb-2">
                    <p className="text-2xl font-mono-data font-bold text-[oklch(0.48_0.16_75)]">
                      {details?.performance
                        ? Number(details.performance.reviewCount)
                        : 0}
                    </p>
                    <Star
                      className="w-4 h-4 text-[oklch(0.48_0.16_75)] mb-0.5"
                      fill="currentColor"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Customer feedbacks
                  </p>
                </div>

                {/* Operational Discipline */}
                <div className="glass-card rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 leading-tight">
                    {labels.detailOperationalDisciplineLabel}
                  </p>
                  <p className="text-2xl font-mono-data font-bold text-[oklch(0.42_0.16_220)] mb-2">
                    {details?.performance
                      ? Number(
                          (
                            details.performance as unknown as Record<
                              string,
                              bigint
                            >
                          ).operationalDiscipline ??
                            (
                              details.performance as unknown as Record<
                                string,
                                bigint
                              >
                            ).opsScore ??
                            0n,
                        )
                      : 0}
                    <span className="text-xs text-muted-foreground font-normal">
                      /100
                    </span>
                  </p>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[oklch(0.48_0.16_220)] transition-all duration-700"
                      style={{
                        width: `${details?.performance ? Number((details.performance as unknown as Record<string, bigint>).operationalDiscipline ?? (details.performance as unknown as Record<string, bigint>).opsScore ?? 0n) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Product Knowledge */}
                <div className="glass-card rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 leading-tight">
                    {labels.detailProductKnowledgeLabel}
                  </p>
                  <p className="text-2xl font-mono-data font-bold text-[oklch(0.42_0.14_290)] mb-2">
                    {details?.performance
                      ? Number(
                          (
                            details.performance as unknown as Record<
                              string,
                              bigint
                            >
                          ).productKnowledgeScore ?? 0n,
                        )
                      : 0}
                    <span className="text-xs text-muted-foreground font-normal">
                      /100
                    </span>
                  </p>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[oklch(0.48_0.16_290)] transition-all duration-700"
                      style={{
                        width: `${details?.performance ? Number((details.performance as unknown as Record<string, bigint>).productKnowledgeScore ?? 0n) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Soft Skills */}
                <div className="glass-card rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 leading-tight">
                    {labels.detailSoftSkillsLabel}
                  </p>
                  <p className="text-2xl font-mono-data font-bold text-[oklch(0.42_0.14_175)] mb-2">
                    {details?.performance
                      ? Number(
                          (
                            details.performance as unknown as Record<
                              string,
                              bigint
                            >
                          ).softSkillsScore ?? 0n,
                        )
                      : 0}
                    <span className="text-xs text-muted-foreground font-normal">
                      /100
                    </span>
                  </p>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[oklch(0.48_0.16_175)] transition-all duration-700"
                      style={{
                        width: `${details?.performance ? Number((details.performance as unknown as Record<string, bigint>).softSkillsScore ?? 0n) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* SWOT Analysis */}
          <motion.div variants={sectionVariants}>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
              {labels.detailSwotSectionTitle}
            </h2>
            {detailsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {SKELETON_KEYS_4.map((k) => (
                  <Skeleton key={k} className="h-36 rounded-xl bg-muted/50" />
                ))}
              </div>
            ) : (
              <>
                {/* CES Score Badge */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border/50 text-xs font-semibold text-foreground/80">
                    <span className="text-muted-foreground font-normal">
                      CES Score
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {Number(details?.swot?.cesScore ?? 0n)}
                    </span>
                    <span className="text-muted-foreground/60 font-normal">
                      / 100
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Strengths */}
                  <div className="swot-strength rounded-xl p-5 border">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-[oklch(0.42_0.16_145)]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.42_0.16_145)]">
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
                            <span className="text-[oklch(0.42_0.16_145)] mt-0.5 shrink-0">
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
                      <AlertCircle className="w-4 h-4 text-[oklch(0.48_0.2_25)]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.48_0.2_25)]">
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
                            <span className="text-[oklch(0.48_0.2_25)] mt-0.5 shrink-0">
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
                      <Lightbulb className="w-4 h-4 text-[oklch(0.42_0.16_240)]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.42_0.16_240)]">
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
                            <span className="text-[oklch(0.42_0.16_240)] mt-0.5 shrink-0">
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
                      <ShieldAlert className="w-4 h-4 text-[oklch(0.48_0.16_75)]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.48_0.16_75)]">
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
                            <span className="text-[oklch(0.48_0.16_75)] mt-0.5 shrink-0">
                              ▸
                            </span>
                            {s}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </>
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
                {labels.detailTraitsSectionTitle}
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
                {labels.detailProblemsSectionTitle}
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
                {labels.detailFeedbackSectionTitle}
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

          {/* Sales Trend Chart — always visible */}
          <motion.div variants={sectionVariants}>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3 flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5" />
              Sales Trend — Year-wise Monthly Performance
            </h2>
            <div className="glass-card rounded-xl p-5">
              {salesLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Skeleton className="w-full h-full rounded-lg bg-muted/50" />
                </div>
              ) : salesRecords.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/50">
                  <ShoppingBag className="w-8 h-8 mb-2 opacity-25" />
                  <p className="text-sm">No sales data to chart</p>
                  <p className="text-xs mt-1 opacity-70">
                    Add sales records to see the trend
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={salesChartData.monthlyData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.88 0.008 240)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="monthKey"
                      tick={{ fontSize: 11, fill: "oklch(0.5 0.012 240)" }}
                      axisLine={{ stroke: "oklch(0.88 0.008 240)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "oklch(0.5 0.012 240)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 100000
                          ? `₹${(v / 100000).toFixed(1)}L`
                          : v >= 1000
                            ? `₹${(v / 1000).toFixed(0)}K`
                            : `₹${v}`
                      }
                      width={56}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.99 0 0)",
                        border: "1px solid oklch(0.88 0.008 240)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px oklch(0.18 0.01 240 / 0.1)",
                      }}
                      formatter={(value: number, name: string) => [
                        new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(value),
                        name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    />
                    {salesChartData.years.map((yr, idx) => (
                      <Line
                        key={yr}
                        type="monotone"
                        dataKey={yr.toString()}
                        name={yr.toString()}
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{
                          r: 3.5,
                          fill: LINE_COLORS[idx % LINE_COLORS.length],
                          strokeWidth: 0,
                        }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Sales Records — collapsible dropdown */}
          <motion.div variants={sectionVariants}>
            {/* Header row — clicking toggles the table */}
            <button
              type="button"
              className="w-full flex items-center justify-between mb-3 group"
              onClick={() => setSalesOpen((v) => !v)}
              data-ocid="sales.toggle"
            >
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2 group-hover:text-foreground transition-colors">
                <ShoppingBag className="w-3.5 h-3.5" />
                Sales Records
                {!salesLoading && (
                  <span className="font-mono-data text-[10px] text-primary/60 bg-primary/10 px-2 py-0.5 rounded-full">
                    {salesRecords.length}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddSalesOpen(true);
                  }}
                  className="gap-1.5 text-xs h-7 px-3"
                  data-ocid="sales.open_modal_button"
                >
                  <Plus className="w-3 h-3" />
                  Add Record
                </Button>
                <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                  {salesOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {salesOpen && (
                <motion.div
                  key="sales-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="glass-card rounded-xl overflow-hidden">
                    {salesLoading ? (
                      <div className="p-4 space-y-3">
                        {SKELETON_KEYS_3.map((k) => (
                          <Skeleton
                            key={k}
                            className="h-10 rounded-lg bg-muted/50"
                          />
                        ))}
                      </div>
                    ) : salesRecords.length === 0 ? (
                      <div
                        className="flex flex-col items-center justify-center py-8 text-muted-foreground/50"
                        data-ocid="sales.empty_state"
                      >
                        <ShoppingBag className="w-7 h-7 mb-2 opacity-30" />
                        <p className="text-sm">No sales records</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/10">
                            <TableHead className="text-[10px] font-bold uppercase py-2">
                              Date
                            </TableHead>
                            <TableHead className="text-[10px] font-bold uppercase py-2">
                              Brand
                            </TableHead>
                            <TableHead className="text-[10px] font-bold uppercase py-2">
                              Product
                            </TableHead>
                            <TableHead className="text-[10px] font-bold uppercase py-2">
                              Type
                            </TableHead>
                            <TableHead className="text-[10px] font-bold uppercase py-2 text-right">
                              Qty
                            </TableHead>
                            <TableHead className="text-[10px] font-bold uppercase py-2 text-right">
                              Amount (₹)
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesRecords.map((record, i) => (
                            <TableRow
                              key={record.id.toString()}
                              data-ocid={`sales.item.${i + 1}`}
                            >
                              <TableCell className="text-xs py-2 text-muted-foreground">
                                {formatDate(record.saleDate)}
                              </TableCell>
                              <TableCell className="text-xs py-2 capitalize">
                                {String(record.brand)}
                              </TableCell>
                              <TableCell className="text-xs py-2 max-w-[120px] truncate">
                                {record.product}
                              </TableCell>
                              <TableCell className="text-xs py-2 text-muted-foreground">
                                {record.saleType === SaleType.extendedWarranty
                                  ? "Ext. Warranty"
                                  : "Accessories"}
                              </TableCell>
                              <TableCell className="text-xs py-2 text-right font-mono-data">
                                {Number(record.quantity)}
                              </TableCell>
                              <TableCell className="text-xs py-2 text-right font-mono-data font-bold text-primary">
                                {formatCurrency(record.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Attendance Chart — always visible */}
          <motion.div variants={sectionVariants}>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5" />
              Attendance Overview — Lapses &amp; Days Off
            </h2>
            <div className="glass-card rounded-xl p-5">
              {attendanceLoading ? (
                <div className="h-56 flex items-center justify-center">
                  <Skeleton className="w-full h-full rounded-lg bg-muted/50" />
                </div>
              ) : attendanceChartData.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-muted-foreground/50">
                  <ClipboardList className="w-8 h-8 mb-2 opacity-25" />
                  <p className="text-sm">No attendance data to chart</p>
                  <p className="text-xs mt-1 opacity-70">
                    Add attendance records to see trends
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={attendanceChartData}
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.88 0.008 240)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "oklch(0.5 0.012 240)" }}
                      axisLine={{ stroke: "oklch(0.88 0.008 240)" }}
                      tickLine={false}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={44}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "oklch(0.5 0.012 240)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.99 0 0)",
                        border: "1px solid oklch(0.88 0.008 240)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px oklch(0.18 0.01 240 / 0.1)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    />
                    <Bar
                      dataKey="lapses"
                      name="Lapses"
                      fill="oklch(0.55 0.2 25)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="daysOff"
                      name="Days Off"
                      fill="oklch(0.52 0.14 240)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Attendance Records — collapsible dropdown */}
          <motion.div variants={sectionVariants}>
            {/* Header row — clicking toggles the table */}
            <button
              type="button"
              className="w-full flex items-center justify-between mb-3 group"
              onClick={() => setAttendanceOpen((v) => !v)}
              data-ocid="attendance.toggle"
            >
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2 group-hover:text-foreground transition-colors">
                <ClipboardList className="w-3.5 h-3.5" />
                Attendance Records
                {!attendanceLoading && (
                  <span className="font-mono-data text-[10px] text-primary/60 bg-primary/10 px-2 py-0.5 rounded-full">
                    {attendanceRecords.length}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddAttendanceOpen(true);
                  }}
                  className="gap-1.5 text-xs h-7 px-3"
                  data-ocid="attendance.open_modal_button"
                >
                  <Plus className="w-3 h-3" />
                  Add Record
                </Button>
                <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                  {attendanceOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {attendanceOpen && (
                <motion.div
                  key="attendance-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="glass-card rounded-xl overflow-hidden">
                    {attendanceLoading ? (
                      <div className="p-4 space-y-3">
                        {SKELETON_KEYS_3.map((k) => (
                          <Skeleton
                            key={k}
                            className="h-10 rounded-lg bg-muted/50"
                          />
                        ))}
                      </div>
                    ) : attendanceRecords.length === 0 ? (
                      <div
                        className="flex flex-col items-center justify-center py-8 text-muted-foreground/50"
                        data-ocid="attendance.empty_state"
                      >
                        <ClipboardList className="w-7 h-7 mb-2 opacity-30" />
                        <p className="text-sm">No attendance records</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/10">
                            <TableHead className="text-[10px] font-bold uppercase py-2">
                              Date
                            </TableHead>
                            <TableHead className="text-[10px] font-bold uppercase py-2">
                              Type
                            </TableHead>
                            <TableHead className="text-[10px] font-bold uppercase py-2">
                              Reason
                            </TableHead>
                            <TableHead className="text-[10px] font-bold uppercase py-2 text-right">
                              Days Off
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceRecords.map((record, i) => (
                            <TableRow
                              key={record.id.toString()}
                              data-ocid={`attendance.item.${i + 1}`}
                            >
                              <TableCell className="text-xs py-2 text-muted-foreground">
                                {formatDate(record.date)}
                              </TableCell>
                              <TableCell className="text-xs py-2">
                                <span
                                  className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                    record.lapseType === "Day Off"
                                      ? "bg-[oklch(0.93_0.04_240_/_0.5)] text-[oklch(0.38_0.14_240)] border-[oklch(0.65_0.12_240_/_0.3)]"
                                      : "bg-[oklch(0.95_0.04_25_/_0.5)] text-[oklch(0.42_0.18_25)] border-[oklch(0.65_0.14_25_/_0.3)]",
                                  )}
                                >
                                  {record.lapseType}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs py-2 text-muted-foreground/80">
                                {record.reason || "—"}
                              </TableCell>
                              <TableCell className="text-xs py-2 text-right font-mono-data">
                                {Number(record.daysOff) > 0
                                  ? Number(record.daysOff)
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Add Sales Record Dialog */}
      <Dialog open={addSalesOpen} onOpenChange={setAddSalesOpen}>
        <DialogContent className="max-w-sm" data-ocid="sales.dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">
              Add Sales Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Brand */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">
                Brand
              </Label>
              <Select
                value={salesForm.brand}
                onValueChange={(v) => setSalesForm((f) => ({ ...f, brand: v }))}
              >
                <SelectTrigger className="text-sm" data-ocid="sales.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SalesBrand.ecovacs} className="text-xs">
                    Ecovacs
                  </SelectItem>
                  <SelectItem value={SalesBrand.kuvings} className="text-xs">
                    Kuvings
                  </SelectItem>
                  <SelectItem value={SalesBrand.coway} className="text-xs">
                    Coway
                  </SelectItem>
                  <SelectItem value={SalesBrand.tineco} className="text-xs">
                    Tineco
                  </SelectItem>
                  <SelectItem value={SalesBrand.instant} className="text-xs">
                    Instant
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Product */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">
                Product
              </Label>
              <Input
                type="text"
                placeholder="e.g. Ecovacs X2 PRO"
                value={salesForm.product}
                onChange={(e) =>
                  setSalesForm((f) => ({ ...f, product: e.target.value }))
                }
                className="text-sm"
                data-ocid="sales.input"
              />
            </div>
            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">
                Type
              </Label>
              <Select
                value={salesForm.saleType}
                onValueChange={(v) =>
                  setSalesForm((f) => ({ ...f, saleType: v }))
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SaleType.accessories} className="text-xs">
                    Accessories
                  </SelectItem>
                  <SelectItem
                    value={SaleType.extendedWarranty}
                    className="text-xs"
                  >
                    Extended Warranty
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">
                Date
              </Label>
              <Input
                type="date"
                value={salesForm.date}
                onChange={(e) =>
                  setSalesForm((f) => ({ ...f, date: e.target.value }))
                }
                className="text-sm"
              />
            </div>
            {/* Quantity */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">
                Quantity
              </Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 2"
                value={salesForm.quantity}
                onChange={(e) =>
                  setSalesForm((f) => ({ ...f, quantity: e.target.value }))
                }
                className="text-sm"
              />
            </div>
            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">
                Amount (₹)
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 15000"
                value={salesForm.amount}
                onChange={(e) =>
                  setSalesForm((f) => ({ ...f, amount: e.target.value }))
                }
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddSalesOpen(false)}
              data-ocid="sales.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddSales}
              disabled={addSalesRecord.isPending}
              data-ocid="sales.submit_button"
            >
              {addSalesRecord.isPending ? (
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

      {/* Add Attendance Record Dialog */}
      <Dialog open={addAttendanceOpen} onOpenChange={setAddAttendanceOpen}>
        <DialogContent className="max-w-sm" data-ocid="attendance.dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">
              Add Attendance Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">
                Date
              </Label>
              <Input
                type="date"
                value={attendanceForm.date}
                onChange={(e) =>
                  setAttendanceForm((f) => ({ ...f, date: e.target.value }))
                }
                className="text-sm"
                data-ocid="attendance.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">
                Type
              </Label>
              <Select
                value={attendanceForm.lapseType}
                onValueChange={(v) =>
                  setAttendanceForm((f) => ({ ...f, lapseType: v }))
                }
              >
                <SelectTrigger
                  className="text-sm"
                  data-ocid="attendance.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Late Attendance" className="text-xs">
                    Late Attendance
                  </SelectItem>
                  <SelectItem value="Missing" className="text-xs">
                    Missing Attendance
                  </SelectItem>
                  <SelectItem value="Day Off" className="text-xs">
                    Day Off
                  </SelectItem>
                  <SelectItem value="Other" className="text-xs">
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">
                Reason
              </Label>
              <Textarea
                placeholder="Reason for lapse or day off..."
                value={attendanceForm.reason}
                onChange={(e) =>
                  setAttendanceForm((f) => ({ ...f, reason: e.target.value }))
                }
                className="text-sm resize-none min-h-[60px]"
                data-ocid="attendance.textarea"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">
                Days Off (0 for lapse, 1+ for absent)
              </Label>
              <Input
                type="number"
                min={0}
                value={attendanceForm.daysOff}
                onChange={(e) =>
                  setAttendanceForm((f) => ({ ...f, daysOff: e.target.value }))
                }
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddAttendanceOpen(false)}
              data-ocid="attendance.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddAttendance}
              disabled={addAttendanceRecord.isPending}
              data-ocid="attendance.submit_button"
            >
              {addAttendanceRecord.isPending ? (
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
