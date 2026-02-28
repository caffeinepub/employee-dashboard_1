import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Building2, ChevronRight } from "lucide-react";
import { Status } from "../backend";
import type { Employee } from "../backend.d.ts";

interface EmployeeCardProps {
  employee: Employee;
  onClick: () => void;
}

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const isActive = employee.status === Status.active;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg p-4 border transition-all duration-200 group",
        "bg-accent/30 border-border/40 hover:bg-accent/60 hover:border-primary/30 hover:teal-glow",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="font-display font-bold text-sm bg-primary/15 text-primary border border-primary/20">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-accent",
              isActive ? "bg-[oklch(0.72_0.18_145)]" : "bg-muted-foreground/40",
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-display font-bold text-sm text-foreground truncate">
              {employee.name}
            </p>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {employee.role}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Building2 className="w-3 h-3 text-muted-foreground/60 shrink-0" />
            <span className="text-[10px] text-muted-foreground/70 truncate">
              {employee.department}
            </span>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              isActive ? "status-active" : "status-inactive",
            )}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  );
}
