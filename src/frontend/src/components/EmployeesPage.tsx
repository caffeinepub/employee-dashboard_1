import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Loader2, Pencil, Search, Trash2, Users } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Status } from "../backend";
import type { Employee } from "../backend.d.ts";
import {
  useGoogleSheetAttendance,
  useGoogleSheetEmployees,
  useGoogleSheetSales,
} from "../hooks/useGoogleSheetData";
import { useDeleteEmployee, useEmployeeDetails } from "../hooks/useQueries";
import { EditEmployeeModal } from "./EditEmployeeModal";
import { getStatusClassName, getStatusLabel } from "./EmployeeCard";
import { PasswordGateDialog } from "./PasswordGateDialog";

type CategoryFilter = "All" | "Cash Cow" | "Star" | "Question Mark" | "Dog";
type JoinDateSort = "All" | "Newest First" | "Oldest First";
type StatusFilter = "All" | "Active" | "Inactive" | "Hold" | "Others";

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  "Cash Cow":
    "bg-[oklch(0.93_0.05_165_/_0.5)] text-[oklch(0.32_0.15_165)] border-[oklch(0.65_0.12_165_/_0.4)]",
  Star: "bg-[oklch(0.95_0.05_85_/_0.5)] text-[oklch(0.38_0.14_85)] border-[oklch(0.65_0.12_85_/_0.4)]",
  "Question Mark":
    "bg-[oklch(0.93_0.04_240_/_0.5)] text-[oklch(0.35_0.14_240)] border-[oklch(0.65_0.12_240_/_0.4)]",
  Dog: "bg-[oklch(0.95_0.04_25_/_0.5)] text-[oklch(0.40_0.18_25)] border-[oklch(0.65_0.14_25_/_0.4)]",
};

const STATUS_BADGE_STYLES: Record<StatusFilter, string> = {
  All: "bg-muted/30 text-muted-foreground border-border/40",
  Active:
    "bg-[oklch(0.93_0.05_165_/_0.5)] text-[oklch(0.32_0.15_165)] border-[oklch(0.65_0.12_165_/_0.4)]",
  Inactive:
    "bg-[oklch(0.95_0.04_25_/_0.5)] text-[oklch(0.40_0.18_25)] border-[oklch(0.65_0.14_25_/_0.4)]",
  Hold: "bg-[oklch(0.95_0.05_85_/_0.5)] text-[oklch(0.38_0.14_85)] border-[oklch(0.65_0.12_85_/_0.4)]",
  Others:
    "bg-[oklch(0.93_0.04_240_/_0.5)] text-[oklch(0.35_0.14_240)] border-[oklch(0.65_0.12_240_/_0.4)]",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatJoinDate(ts: bigint): string {
  try {
    const ms = Number(ts) / 1_000_000;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return "\u2014";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return "\u2014";
  }
}

function formatINR(amount: number): string {
  if (amount <= 0) return "\u2014";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Determine the last month present in a set of nanosecond timestamps */
function getLastMonthKey(
  timestamps: bigint[],
): { year: number; month: number } | null {
  if (timestamps.length === 0) return null;
  let maxMs = 0;
  for (const ts of timestamps) {
    const ms = Number(ts) / 1_000_000;
    if (ms > maxMs) maxMs = ms;
  }
  if (maxMs <= 0) return null;
  const d = new Date(maxMs);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// Per-row efficiency score: fetches performance data and computes the average of 5 params
function EfficiencyCell({ employeeId }: { employeeId: bigint }) {
  const { data: details, isLoading } = useEmployeeDetails(employeeId);

  if (isLoading) {
    return (
      <span className="text-sm font-mono-data text-muted-foreground/40">
        \u2014
      </span>
    );
  }

  if (!details?.performance) {
    return (
      <span className="text-sm font-mono-data text-muted-foreground/40">
        \u2014
      </span>
    );
  }

  const p = details.performance;
  const efficiencyScore = Math.round(
    (Number(p.salesInfluenceIndex) +
      Number(p.reviewCount) +
      Number(p.operationalDiscipline) +
      Number(p.productKnowledgeScore) +
      Number(p.softSkillsScore)) /
      5,
  );

  const color =
    efficiencyScore >= 75
      ? "text-[oklch(0.42_0.16_145)]"
      : efficiencyScore >= 50
        ? "text-[oklch(0.48_0.16_75)]"
        : "text-[oklch(0.42_0.2_25)]";

  return (
    <span className={cn("text-sm font-mono-data font-bold", color)}>
      {efficiencyScore}
    </span>
  );
}

// Inline edit row: fetches details for the edit modal
function EditRowButton({ employee }: { employee: Employee }) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: details } = useEmployeeDetails(editOpen ? employee.id : null);

  return (
    <>
      <PasswordGateDialog onSuccess={() => setEditOpen(true)}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-primary/70 hover:text-primary hover:bg-primary/10"
          data-ocid="employees_page.edit_button"
          title="Edit employee"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </PasswordGateDialog>
      {details && (
        <EditEmployeeModal
          open={editOpen}
          onOpenChange={setEditOpen}
          employeeId={employee.id}
          details={details}
        />
      )}
    </>
  );
}

interface EmployeesPageProps {
  onSelectEmployee: (employee: Employee) => void;
}

export function EmployeesPage({ onSelectEmployee }: EmployeesPageProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Active");
  const [joinDateSort, setJoinDateSort] = useState<JoinDateSort>("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useGoogleSheetEmployees();
  const regions = useMemo(
    () =>
      Array.from(
        new Set(employees.map((e) => e.region).filter(Boolean)),
      ).sort() as string[],
    [employees],
  );
  const { data: allSales = [] } = useGoogleSheetSales();
  const { data: allAttendance = [] } = useGoogleSheetAttendance();
  const deleteEmployee = useDeleteEmployee();

  // Find the last month present across all sales records
  const lastSalesMonthKey = useMemo(() => {
    return getLastMonthKey(allSales.map((r) => r.saleDate));
  }, [allSales]);

  // Find the last month present across all attendance records
  const lastAttendanceMonthKey = useMemo(() => {
    return getLastMonthKey(allAttendance.map((r) => r.date));
  }, [allAttendance]);

  // Build per-employee last-month sales amount map
  const salesByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const rec of allSales) {
      if (!lastSalesMonthKey) break;
      const ms = Number(rec.saleDate) / 1_000_000;
      const d = new Date(ms);
      if (
        d.getFullYear() === lastSalesMonthKey.year &&
        d.getMonth() === lastSalesMonthKey.month
      ) {
        const key = rec.fiplCode.toUpperCase();
        map.set(key, (map.get(key) ?? 0) + Number(rec.amount));
      }
    }
    return map;
  }, [allSales, lastSalesMonthKey]);

  // Build per-employee last-month attendance lapses count
  const lapsesByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const rec of allAttendance) {
      if (!lastAttendanceMonthKey) break;
      const ms = Number(rec.date) / 1_000_000;
      const d = new Date(ms);
      if (
        d.getFullYear() === lastAttendanceMonthKey.year &&
        d.getMonth() === lastAttendanceMonthKey.month
      ) {
        const key = rec.fiplCode.toUpperCase();
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return map;
  }, [allAttendance, lastAttendanceMonthKey]);

  const filtered = useMemo(() => {
    let list = employees
      .filter((e) => {
        if (statusFilter === "All") return true;
        if (statusFilter === "Active") return e.status === Status.active;
        if (statusFilter === "Inactive") return e.status === Status.inactive;
        if (statusFilter === "Hold") return e.status === Status.onHold;
        // "Others" = any status not Active/Inactive/OnHold
        return (
          e.status !== Status.active &&
          e.status !== Status.inactive &&
          e.status !== Status.onHold
        );
      })
      .filter(
        (e) => categoryFilter === "All" || e.fseCategory === categoryFilter,
      )
      .filter((e) => regionFilter === "All" || e.region === regionFilter)
      .filter((e) =>
        searchQuery.trim() === ""
          ? true
          : e.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
            e.fiplCode
              ?.toLowerCase()
              .includes(searchQuery.trim().toLowerCase()),
      );

    if (joinDateSort === "Newest First") {
      list = [...list].sort((a, b) => Number(b.joinDate) - Number(a.joinDate));
    } else if (joinDateSort === "Oldest First") {
      list = [...list].sort((a, b) => Number(a.joinDate) - Number(b.joinDate));
    }

    return list;
  }, [
    employees,
    categoryFilter,
    statusFilter,
    joinDateSort,
    searchQuery,
    regionFilter,
  ]);

  // Count per status for badge display
  const statusCounts = useMemo(() => {
    const counts = { Active: 0, Inactive: 0, Hold: 0, Others: 0 };
    for (const e of employees) {
      if (e.status === Status.active) counts.Active++;
      else if (e.status === Status.inactive) counts.Inactive++;
      else if (e.status === Status.onHold) counts.Hold++;
      else counts.Others++;
    }
    return counts;
  }, [employees]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteEmployee.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`${deleteTarget.name} has been removed`);
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error("Failed to delete employee");
        setDeleteTarget(null);
      },
    });
  };

  const lastSalesLabel = lastSalesMonthKey
    ? new Date(
        lastSalesMonthKey.year,
        lastSalesMonthKey.month,
        1,
      ).toLocaleString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : null;

  const lastAttendanceLabel = lastAttendanceMonthKey
    ? new Date(
        lastAttendanceMonthKey.year,
        lastAttendanceMonthKey.month,
        1,
      ).toLocaleString("en-IN", { month: "short", year: "numeric" })
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto" data-ocid="employees_page.page">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-5"
      >
        <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold mb-1">
          Organization
        </p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Employees
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              All FSEs in the organization
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live &middot; Google Sheets
            </span>
            <span className="text-sm font-mono-data font-bold text-primary/70 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              {statusCounts.Active} active
            </span>
          </div>
        </div>
      </motion.div>

      {/* Status Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.03 }}
        className="flex gap-2 mb-3 flex-wrap"
      >
        {(
          ["All", "Active", "Inactive", "Hold", "Others"] as StatusFilter[]
        ).map((s) => {
          const count =
            s === "All"
              ? employees.length
              : statusCounts[s as keyof typeof statusCounts];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              data-ocid="employees_page.tab"
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                statusFilter === s
                  ? STATUS_BADGE_STYLES[s]
                  : "bg-transparent text-muted-foreground border-border/40 hover:bg-muted/30",
              )}
            >
              {s}
              <span
                className={cn(
                  "text-[10px] font-mono-data px-1 rounded",
                  statusFilter === s ? "opacity-80" : "opacity-50",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Search + Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="flex flex-col sm:flex-row gap-3 mb-4"
      >
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by name or FIPL ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/70 border-border/60 focus:border-primary/50 h-9 text-sm"
            data-ocid="employees_page.search_input"
          />
        </div>

        {/* Category Filter */}
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
        >
          <SelectTrigger
            className="h-9 w-[180px] text-sm bg-background/70 border-border/60"
            data-ocid="employees_page.select"
          >
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            <SelectItem value="All">All Categories</SelectItem>
            <SelectItem value="Cash Cow">Cash Cow</SelectItem>
            <SelectItem value="Star">Star</SelectItem>
            <SelectItem value="Question Mark">Question Mark</SelectItem>
            <SelectItem value="Dog">Dog</SelectItem>
          </SelectContent>
        </Select>

        {/* Join Date Sort */}
        <Select
          value={joinDateSort}
          onValueChange={(v) => setJoinDateSort(v as JoinDateSort)}
        >
          <SelectTrigger
            className="h-9 w-[180px] text-sm bg-background/70 border-border/60"
            data-ocid="employees_page.select"
          >
            <SelectValue placeholder="Sort by Join Date" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            <SelectItem value="All">All (No Sort)</SelectItem>
            <SelectItem value="Newest First">Newest First</SelectItem>
            <SelectItem value="Oldest First">Oldest First</SelectItem>
          </SelectContent>
        </Select>

        {/* Region Filter */}
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger
            className="h-9 w-[180px] text-sm bg-background/70 border-border/60"
            data-ocid="employees.region_filter.select"
          >
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            <SelectItem value="All">All Regions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        {isLoading ? (
          <div className="p-6 space-y-3">
            {["s1", "s2", "s3", "s4", "s5"].map((k) => (
              <div
                key={k}
                className="h-12 rounded-lg bg-muted/30 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-muted-foreground/50"
            data-ocid="employees_page.empty_state"
          >
            <Users className="w-10 h-10 mb-3 opacity-25" />
            <p className="text-sm font-semibold">
              {employees.length === 0
                ? "No employees yet"
                : searchQuery.trim() !== ""
                  ? `No employees match "${searchQuery}"`
                  : `No ${statusFilter === "All" ? "" : `${statusFilter} `}employees in "${categoryFilter}" category`}
            </p>
            <p className="text-xs mt-1 opacity-70">
              {employees.length === 0
                ? "Upload employees via the Uploads tab"
                : "Try a different filter or search"}
            </p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 pl-4 w-[220px]">
                    Name / FIPL ID
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[100px]">
                    Region
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[120px]">
                    Joining Date
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 text-right w-[130px]">
                    Sales{lastSalesLabel ? ` (${lastSalesLabel})` : " (\u20B9)"}
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[150px]">
                    Lapses
                    {lastAttendanceLabel ? ` (${lastAttendanceLabel})` : ""}
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 text-center w-[100px]">
                    Efficiency
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[120px]">
                    Category
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[80px]">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 text-center w-[90px]">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((employee, i) => {
                  const fiplKey = employee.fiplCode?.toUpperCase() ?? "";
                  const lastMonthSales = salesByEmployee.get(fiplKey) ?? 0;
                  const lastMonthLapses = lapsesByEmployee.get(fiplKey) ?? 0;

                  return (
                    <TableRow
                      key={employee.id.toString()}
                      className="cursor-pointer hover:bg-primary/5 transition-colors group border-border/40"
                      onClick={() => onSelectEmployee(employee)}
                      data-ocid={`employees_page.item.${i + 1}`}
                    >
                      {/* Name + FIPL */}
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="text-xs font-bold bg-primary/15 text-primary border border-primary/20">
                              {getInitials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                              {employee.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 font-mono-data mt-0.5">
                              {employee.fiplCode || "\u2014"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Region */}
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {employee.region || "\u2014"}
                      </TableCell>

                      {/* Joining Date */}
                      <TableCell className="py-3 text-xs font-mono-data text-muted-foreground">
                        {formatJoinDate(employee.joinDate)}
                      </TableCell>

                      {/* Last Month Sales */}
                      <TableCell className="py-3 text-right">
                        <span className="text-xs font-mono-data font-bold text-foreground">
                          {formatINR(lastMonthSales)}
                        </span>
                      </TableCell>

                      {/* Last Month Attendance Lapses */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-xs font-mono-data font-bold px-2 py-0.5 rounded",
                              lastMonthLapses === 0
                                ? "bg-emerald-50 text-emerald-700"
                                : lastMonthLapses <= 2
                                  ? "bg-yellow-50 text-yellow-700"
                                  : "bg-red-50 text-red-700",
                            )}
                          >
                            {lastMonthLapses === 0
                              ? "0 lapses"
                              : `${lastMonthLapses} lapse${lastMonthLapses > 1 ? "s" : ""}`}
                          </span>
                        </div>
                      </TableCell>

                      {/* Efficiency Score */}
                      <TableCell className="py-3 text-center">
                        <EfficiencyCell employeeId={employee.id} />
                      </TableCell>

                      {/* Category badge */}
                      <TableCell className="py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 border",
                            CATEGORY_BADGE_STYLES[employee.fseCategory] ??
                              "bg-muted/30 text-muted-foreground border-border/40",
                          )}
                        >
                          {employee.fseCategory || "\u2014"}
                        </Badge>
                      </TableCell>

                      {/* Status badge */}
                      <TableCell className="py-3">
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded border",
                            getStatusClassName(employee.status),
                          )}
                        >
                          {getStatusLabel(employee.status)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3">
                        <div
                          className="flex items-center justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <EditRowButton employee={employee} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(employee);
                            }}
                            data-ocid="employees_page.delete_button"
                            title="Delete employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </motion.div>

      {/* Row count footer */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground/60 mt-3 text-right">
          Showing {filtered.length} of {employees.length} employees
        </p>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget?.name} and all their
              associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="employees_page.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEmployee.isPending}
              data-ocid="employees_page.delete_button"
            >
              {deleteEmployee.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting\u2026
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
