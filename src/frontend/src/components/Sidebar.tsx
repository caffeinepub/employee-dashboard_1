import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MessageSquare,
  Pencil,
  Settings,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
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
  onFeedbackClick: () => void;
}

function SidebarComponent({
  employees,
  selectedEmployee,
  currentView,
  onSelectEmployee,
  onOverviewClick,
  onSettingsClick,
  onSalesTrendsClick,
  onEmployeesClick,
  onUploadsClick,
  onFeedbackClick,
}: SidebarProps) {
  const { settings } = useAppSettings();
  const { labels } = settings;
  const [collapsed, setCollapsed] = useState(false);
  const [logoUrl, setLogoUrl] = useState(
    () => localStorage.getItem("dashboardLogoUrl") || "",
  );
  const [logoEditMode, setLogoEditMode] = useState(false);
  const [logoInputVal, setLogoInputVal] = useState("");
  const [logoHover, setLogoHover] = useState(false);
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Only active employees count for the badge
  const activeEmployeeCount = useMemo(
    () => employees.filter((e) => e.status === Status.active).length,
    [employees],
  );

  // Active employees for sidebar quick-nav
  const filteredEmployees = useMemo(
    () => employees.filter((e) => e.status === Status.active),
    [employees],
  );

  const navItems = [
    {
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
      label: labels.sidebarOverviewLabel,
      view: "overview" as View,
      onClick: onOverviewClick,
      ocid: "nav.link",
    },
    {
      icon: <TrendingUp className="w-4 h-4 shrink-0" />,
      label: "Sales Trends",
      view: "sales" as View,
      onClick: onSalesTrendsClick,
      ocid: "nav.link",
    },
    {
      icon: <MessageSquare className="w-4 h-4 shrink-0" />,
      label: "Feedback",
      view: "feedback" as View,
      onClick: onFeedbackClick,
      ocid: "nav.feedback.link",
    },
    {
      icon: <Upload className="w-4 h-4 shrink-0" />,
      label: "Uploads",
      view: "uploads" as View,
      onClick: onUploadsClick,
      ocid: "nav.link",
    },
    {
      icon: <Users className="w-4 h-4 shrink-0" />,
      label: labels.sidebarEmployeesLabel,
      view: "employees" as View,
      onClick: onEmployeesClick,
      ocid: "nav.link",
      badge: activeEmployeeCount,
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "h-screen sticky top-0 flex flex-col border-r border-border/50 bg-sidebar shrink-0 overflow-hidden transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "border-b border-border/40 relative flex items-center",
            collapsed ? "px-0 py-4 justify-center" : "px-4 py-4",
          )}
        >
          {collapsed ? (
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-border/30 shadow-sm overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs font-bold text-primary leading-none">
                  FI
                </span>
              )}
            </div>
          ) : (
            <div className="w-full">
              <div
                className="relative rounded-lg bg-white border border-border/30 px-3 py-2 flex items-center justify-center shadow-sm w-full cursor-pointer group"
                onMouseEnter={() => setLogoHover(true)}
                onMouseLeave={() => setLogoHover(false)}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Company Logo"
                    className="h-10 w-auto object-contain"
                    style={{ maxWidth: "160px" }}
                  />
                ) : (
                  <span className="text-sm font-bold text-foreground py-1">
                    Frootle India Pvt.Ltd
                  </span>
                )}
                {logoHover && !logoEditMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLogoInputVal(logoUrl);
                      setLogoEditMode(true);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded bg-primary/90 text-white flex items-center justify-center shadow hover:bg-primary transition-colors"
                    title="Edit logo"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
              {logoEditMode && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={logoInputVal}
                    onChange={(e) => setLogoInputVal(e.target.value)}
                    placeholder="Paste image URL..."
                    className="w-full text-xs rounded-md border border-border/50 bg-background px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("dashboardLogoUrl", logoInputVal);
                        setLogoUrl(logoInputVal);
                        setLogoEditMode(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 text-xs rounded-md bg-primary text-primary-foreground py-1 hover:bg-primary/90 transition-colors"
                    >
                      <Check className="w-3 h-3" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("dashboardLogoUrl");
                        setLogoUrl("");
                        setLogoEditMode(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 text-xs rounded-md bg-muted text-muted-foreground py-1 hover:bg-muted/70 transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>
              )}
              <p className="text-muted-foreground text-[10px] tracking-wider uppercase mt-2 ml-0.5">
                {labels.sidebarTagline}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("py-4 space-y-1", collapsed ? "px-2" : "px-3")}>
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            const btn = (
              <button
                key={item.view}
                type="button"
                onClick={item.onClick}
                className={cn(
                  "w-full flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                  collapsed
                    ? "justify-center px-0 py-2.5"
                    : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
                data-ocid={item.ocid}
              >
                {item.icon}
                {!collapsed && (
                  <>
                    {item.badge !== undefined ? (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <span className="text-[10px] font-mono text-primary/70">
                          {item.badge}
                        </span>
                      </>
                    ) : (
                      <span>{item.label}</span>
                    )}
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />
                    )}
                  </>
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.view}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">
                    <span>{item.label}</span>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return btn;
          })}
        </nav>

        {/* Employee List (quick nav) — active employees only */}
        {!collapsed && (
          <div className="flex-1 min-h-0 flex flex-col px-3 pb-4">
            <ScrollArea className="flex-1">
              <div className="space-y-0.5">
                {filteredEmployees.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 text-center py-3">
                    No employees found
                  </p>
                ) : (
                  filteredEmployees.map((employee) => (
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
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-sidebar bg-[oklch(0.52_0.18_145)]" />
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
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Collapsed spacer to push settings to bottom */}
        {collapsed && <div className="flex-1" />}

        {/* Settings Nav */}
        <div
          className={cn(
            "border-t border-border/40 pt-2",
            collapsed ? "px-2 pb-2" : "px-3 pb-2",
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onSettingsClick}
                  className={cn(
                    "w-full flex items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-all duration-150",
                    currentView === "settings"
                      ? "bg-primary/15 text-primary border border-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                  data-ocid="nav.link"
                >
                  <Settings className="w-4 h-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>Settings</span>
              </TooltipContent>
            </Tooltip>
          ) : (
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
          )}
        </div>

        {/* Toggle Button */}
        <div
          className={cn(
            "border-t border-border/40",
            collapsed
              ? "px-2 py-2 flex justify-center"
              : "px-3 py-2 flex justify-end",
          )}
        >
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
            data-ocid="sidebar.toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Footer */}
        {!collapsed && (
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
        )}
      </aside>
    </TooltipProvider>
  );
}

export const Sidebar = memo(SidebarComponent);
