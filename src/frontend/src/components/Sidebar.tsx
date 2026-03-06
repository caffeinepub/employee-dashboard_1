import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import { Status } from "../backend";
import type { Employee } from "../backend.d.ts";
import { useAppSettings } from "../context/AppSettingsContext";
import type { View } from "./Dashboard";

interface SidebarProps {
  employees: Employee[];
  selectedEmployee: Employee | null;
  currentView: View;
  onSelectEmployee: (employee: Employee) => void;
  onOverviewClick: () => void;
  onSettingsClick: () => void;
  onSalesTrendsClick: () => void;
  onEmployeesClick: () => void;
  onUploadsClick: () => void;
}

export function Sidebar({
  employees,
  selectedEmployee,
  currentView,
  onSelectEmployee,
  onOverviewClick,
  onSettingsClick,
  onSalesTrendsClick,
  onEmployeesClick,
  onUploadsClick,
}: SidebarProps) {
  const { settings } = useAppSettings();
  const { labels } = settings;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col border-r border-border/50 bg-sidebar shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border/40">
        <div className="flex items-center">
          <div className="rounded-lg bg-white border border-border/30 px-3 py-2 flex items-center justify-center shadow-sm w-full">
            <img
              src="/assets/uploads/image-1-1.png"
              alt="Frootle India"
              className="h-10 w-auto object-contain"
              style={{ maxWidth: "160px" }}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-[10px] tracking-wider uppercase mt-2 ml-0.5">
          {labels.sidebarTagline}
        </p>
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
          data-ocid="nav.link"
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>{labels.sidebarOverviewLabel}</span>
          {currentView === "overview" && (
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          )}
        </button>

        {/* Sales Trends nav */}
        <button
          type="button"
          onClick={onSalesTrendsClick}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            currentView === "sales"
              ? "bg-primary/15 text-primary border border-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
          data-ocid="nav.link"
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Sales Trends</span>
          {currentView === "sales" && (
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          )}
        </button>

        {/* Uploads nav */}
        <button
          type="button"
          onClick={onUploadsClick}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            currentView === "uploads"
              ? "bg-primary/15 text-primary border border-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
          data-ocid="nav.link"
        >
          <Upload className="w-4 h-4 shrink-0" />
          <span>Uploads</span>
          {currentView === "uploads" && (
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          )}
        </button>

        {/* Employees section — clickable nav button */}
        <button
          type="button"
          onClick={onEmployeesClick}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            currentView === "employees"
              ? "bg-primary/15 text-primary border border-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
          data-ocid="nav.link"
        >
          <Users className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">
            {labels.sidebarEmployeesLabel}
          </span>
          <span className="text-[10px] font-mono-data text-primary/70">
            {employees.length}
          </span>
          {currentView === "employees" && (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
      </nav>

      {/* Employee List (quick nav to individual profiles) */}
      <ScrollArea className="flex-1 min-h-0 px-3 pb-4">
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
              data-ocid="nav.link"
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
                      ? "bg-[oklch(0.52_0.18_145)]"
                      : employee.status === Status.onHold
                        ? "bg-[oklch(0.62_0.16_75)]"
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

      {/* Settings Nav */}
      <div className="px-3 pb-2 border-t border-border/40 pt-2">
        <button
          type="button"
          onClick={onSettingsClick}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            currentView === "settings"
              ? "bg-primary/15 text-primary border border-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
          data-ocid="nav.link"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
          {currentView === "settings" && (
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          )}
        </button>
      </div>

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
