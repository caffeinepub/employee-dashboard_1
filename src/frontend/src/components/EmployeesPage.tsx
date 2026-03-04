import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import { type Variants, motion } from "motion/react";
import { useState } from "react";
import type { Employee } from "../backend.d.ts";
import { useAllEmployees } from "../hooks/useQueries";
import { EmployeeCard } from "./EmployeeCard";

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
    "bg-[oklch(0.93_0.05_165_/_0.5)] text-[oklch(0.35_0.15_165)] border-[oklch(0.65_0.12_165_/_0.3)]",
  Star: "bg-[oklch(0.95_0.05_85_/_0.5)] text-[oklch(0.38_0.14_85)] border-[oklch(0.65_0.12_85_/_0.3)]",
  "Question Mark":
    "bg-[oklch(0.93_0.04_240_/_0.5)] text-[oklch(0.38_0.14_240)] border-[oklch(0.65_0.12_240_/_0.3)]",
  Dog: "bg-[oklch(0.95_0.04_25_/_0.5)] text-[oklch(0.42_0.18_25)] border-[oklch(0.65_0.14_25_/_0.3)]",
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

interface EmployeesPageProps {
  onSelectEmployee: (employee: Employee) => void;
}

export function EmployeesPage({ onSelectEmployee }: EmployeesPageProps) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("All");
  const { data: employees = [], isLoading } = useAllEmployees();

  const filtered =
    activeFilter === "All"
      ? employees
      : employees.filter((e) => e.fseCategory === activeFilter);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className="p-8 max-w-7xl mx-auto" data-ocid="employees_page.page">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
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

      {/* Category Filter Pills */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(cat)}
              className={cn(
                "text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-150",
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
                    isActive ? "opacity-80" : "opacity-60",
                  )}
                >
                  {employees.filter((e) => e.fseCategory === cat).length}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Employee Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"].map((k) => (
            <div
              key={k}
              className="h-40 rounded-xl bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-20 text-muted-foreground/50"
          data-ocid="employees_page.empty_state"
        >
          <Users className="w-10 h-10 mb-3 opacity-25" />
          <p className="text-sm font-semibold">
            {employees.length === 0
              ? "No employees yet"
              : `No employees in "${activeFilter}" category`}
          </p>
          <p className="text-xs mt-1 opacity-70">
            {employees.length === 0
              ? "Add employees to get started"
              : "Try a different category filter"}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Category summary chips */}
          {activeFilter !== "All" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2"
            >
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold px-2.5 py-1 border",
                  CATEGORY_BADGE_STYLES[activeFilter] ?? "bg-muted/30",
                )}
              >
                {activeFilter}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
              </span>
            </motion.div>
          )}

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filtered.map((employee, i) => (
              <motion.div
                key={employee.id.toString()}
                variants={itemVariants}
                data-ocid={`employees_page.item.${i + 1}`}
              >
                <EmployeeCard
                  employee={employee}
                  onClick={() => onSelectEmployee(employee)}
                />
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
