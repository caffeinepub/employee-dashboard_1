import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronRight, LayoutDashboard, Users } from "lucide-react";
import { Status } from "../backend";
import type { Employee } from "../backend.d.ts";

interface SidebarProps {
  employees: Employee[];
  selectedEmployee: Employee | null;
  currentView: "overview" | "employee";
  onSelectEmployee: (employee: Employee) => void;
  onOverviewClick: () => void;
}

export function Sidebar({
  employees,
  selectedEmployee,
  currentView,
  onSelectEmployee,
  onOverviewClick,
}: SidebarProps) {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <aside className="w-64 min-h-screen flex flex-col border-r border-border/50 bg-sidebar shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-primary font-mono text-xs font-bold">HR</span>
          </div>
          <div>
            <p className="font-display font-bold text-sm text-foreground leading-tight">
              PeopleOS
            </p>
            <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
              Intelligence Suite
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-1">
        <button
          type="button"
          onClick={onOverviewClick}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            currentView === "overview"
              ? "bg-primary/15 text-primary border border-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Overview</span>
          {currentView === "overview" && (
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          )}
        </button>

        <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Employees
          </span>
          <span className="ml-auto text-[10px] font-mono-data text-primary/70">
            {employees.length}
          </span>
        </div>
      </nav>

      {/* Employee List */}
      <ScrollArea className="flex-1 px-3 pb-4">
        <div className="space-y-0.5">
          {employees.map((employee) => (
            <button
              type="button"
              key={employee.id.toString()}
              onClick={() => onSelectEmployee(employee)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group",
                selectedEmployee?.id === employee.id &&
                  currentView === "employee"
                  ? "bg-primary/15 text-primary border border-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-[10px] font-bold bg-accent text-accent-foreground">
                    {getInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-sidebar",
                    employee.status === Status.active
                      ? "bg-[oklch(0.72_0.18_145)]"
                      : "bg-muted-foreground/40",
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">
                  {employee.name}
                </p>
                <p className="text-[10px] truncate opacity-70">
                  {employee.role}
                </p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border/40">
        <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
          © {new Date().getFullYear()} Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/60 hover:text-primary transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </aside>
  );
}
