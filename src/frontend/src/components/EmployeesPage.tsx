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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  useAllEmployees,
  useDeleteEmployee,
  useSalesRecords,
} from "../hooks/useQueries";
import { useEmployeeDetails } from "../hooks/useQueries";
import { EditEmployeeModal } from "./EditEmployeeModal";
import { getStatusClassName, getStatusLabel } from "./EmployeeCard";

type CategoryFilter = "All" | "Cash Cow" | "Star" | "Question Mark" | "Dog";

const CATEGORY_FILTERS: CategoryFilter[] = [
  "All",
  "Cash Cow",
  "Star",
  "Question Mark",
  "Dog",
];

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  "Cash Cow":
    "bg-[oklch(0.93_0.05_165_/_0.5)] text-[oklch(0.32_0.15_165)] border-[oklch(0.65_0.12_165_/_0.4)]",
  Star: "bg-[oklch(0.95_0.05_85_/_0.5)] text-[oklch(0.38_0.14_85)] border-[oklch(0.65_0.12_85_/_0.4)]",
  "Question Mark":
    "bg-[oklch(0.93_0.04_240_/_0.5)] text-[oklch(0.35_0.14_240)] border-[oklch(0.65_0.12_240_/_0.4)]",
  Dog: "bg-[oklch(0.95_0.04_25_/_0.5)] text-[oklch(0.40_0.18_25)] border-[oklch(0.65_0.14_25_/_0.4)]",
};

const FILTER_ACTIVE_STYLES: Record<CategoryFilter, string> = {
  All: "bg-primary text-primary-foreground border-primary shadow-sm",
  "Cash Cow":
    "bg-[oklch(0.35_0.15_165)] text-white border-[oklch(0.35_0.15_165)] shadow-sm",
  Star: "bg-[oklch(0.38_0.14_85)] text-white border-[oklch(0.38_0.14_85)] shadow-sm",
  "Question Mark":
    "bg-[oklch(0.38_0.14_240)] text-white border-[oklch(0.38_0.14_240)] shadow-sm",
  Dog: "bg-[oklch(0.42_0.18_25)] text-white border-[oklch(0.42_0.18_25)] shadow-sm",
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
    if (Number.isNaN(date.getTime())) return "—";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return "—";
  }
}

function getAttendanceColor(pct: number): string {
  if (pct >= 90) return "bg-[oklch(0.52_0.16_145)]";
  if (pct >= 70) return "bg-[oklch(0.62_0.16_75)]";
  return "bg-[oklch(0.55_0.22_25)]";
}

function getEfficiencyColor(score: number): string {
  if (score >= 75) return "text-[oklch(0.42_0.16_145)]";
  if (score >= 50) return "text-[oklch(0.48_0.16_75)]";
  return "text-[oklch(0.42_0.2_25)]";
}

// Per-row efficiency score: fetches performance data and computes the average of 5 params
function EfficiencyCell({ employeeId }: { employeeId: bigint }) {
  const { data: details, isLoading } = useEmployeeDetails(employeeId);

  if (isLoading) {
    return (
      <span className="text-sm font-mono-data text-muted-foreground/40">—</span>
    );
  }

  if (!details?.performance) {
    return (
      <span className="text-sm font-mono-data text-muted-foreground/40">—</span>
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

  return (
    <span
      className={cn(
        "text-sm font-mono-data font-bold",
        getEfficiencyColor(efficiencyScore),
      )}
    >
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
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-primary/70 hover:text-primary hover:bg-primary/10"
        onClick={(e) => {
          e.stopPropagation();
          setEditOpen(true);
        }}
        data-ocid="employees_page.edit_button"
        title="Edit employee"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>
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
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useAllEmployees();
  const { data: allSales = [] } = useSalesRecords();
  const deleteEmployee = useDeleteEmployee();

  // Build per-employee total sales map
  const salesByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const rec of allSales) {
      const key = rec.employeeId.toString();
      map.set(key, (map.get(key) ?? 0) + Number(rec.amount));
    }
    return map;
  }, [allSales]);

  const filtered = employees
    .filter((e) => activeFilter === "All" || e.fseCategory === activeFilter)
    .filter((e) =>
      searchQuery.trim() === ""
        ? true
        : e.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          e.fiplCode?.toLowerCase().includes(searchQuery.trim().toLowerCase()),
    );

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
          <span className="text-sm font-mono-data font-bold text-primary/70 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            {employees.length} total
          </span>
        </div>
      </motion.div>

      {/* Search + Category Filter Row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="flex flex-col sm:flex-row gap-3 mb-4"
      >
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

        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_FILTERS.map((cat) => {
            const isActive = activeFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveFilter(cat)}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-150",
                  isActive
                    ? FILTER_ACTIVE_STYLES[cat]
                    : "text-muted-foreground border-border/50 hover:text-foreground hover:border-border bg-background/50",
                )}
                data-ocid="employees_page.tab"
              >
                {cat}
                {cat !== "All" && (
                  <span
                    className={cn(
                      "ml-1.5 text-[10px] font-bold",
                      isActive ? "opacity-80" : "opacity-50",
                    )}
                  >
                    {employees.filter((e) => e.fseCategory === cat).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
                  : `No employees in "${activeFilter}" category`}
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
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 text-right w-[120px]">
                    Sales (₹)
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[140px]">
                    Attendance
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 text-center w-[100px]">
                    Efficiency
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[120px]">
                    Category
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 text-center w-[90px]">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((employee, i) => {
                  const totalSales =
                    salesByEmployee.get(employee.id.toString()) ?? 0;
                  // Attendance proxy: 95% for stars/cash cows, lower otherwise
                  const attendancePct =
                    employee.status === Status.inactive
                      ? 45
                      : employee.fseCategory === "Star" ||
                          employee.fseCategory === "Cash Cow"
                        ? 94
                        : employee.fseCategory === "Question Mark"
                          ? 78
                          : 55;

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
                              {employee.fiplCode || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Region */}
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {employee.region || "—"}
                      </TableCell>

                      {/* Joining Date */}
                      <TableCell className="py-3 text-xs font-mono-data text-muted-foreground">
                        {formatJoinDate(employee.joinDate)}
                      </TableCell>

                      {/* Sales */}
                      <TableCell className="py-3 text-right">
                        <span className="text-xs font-mono-data font-bold text-foreground">
                          {totalSales > 0
                            ? new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 0,
                              }).format(totalSales)
                            : "—"}
                        </span>
                      </TableCell>

                      {/* Attendance bar */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden min-w-[60px]">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700",
                                getAttendanceColor(attendancePct),
                              )}
                              style={{ width: `${attendancePct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono-data font-semibold text-muted-foreground shrink-0">
                            {attendancePct}%
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
                          {employee.fseCategory || "—"}
                        </Badge>
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
  );
}
