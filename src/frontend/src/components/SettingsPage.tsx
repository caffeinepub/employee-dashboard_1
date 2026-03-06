import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  Building2,
  Check,
  DatabaseBackup,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type AppSettingsLabels,
  DEFAULT_SETTINGS,
  useAppSettings,
} from "../context/AppSettingsContext";
import { useActor } from "../hooks/useActor";

// ─── Label group config ────────────────────────────────────────────────────

interface LabelRow {
  key: keyof AppSettingsLabels;
  humanName: string;
  group: "sidebar" | "overview" | "detail";
  maxLength?: number;
}

const LABEL_ROWS: LabelRow[] = [
  // Sidebar
  {
    key: "sidebarAppName",
    humanName: "App Name",
    group: "sidebar",
    maxLength: 24,
  },
  {
    key: "sidebarTagline",
    humanName: "Tagline",
    group: "sidebar",
    maxLength: 40,
  },
  {
    key: "sidebarLogoText",
    humanName: "Logo Text (max 2 chars)",
    group: "sidebar",
    maxLength: 2,
  },
  {
    key: "sidebarOverviewLabel",
    humanName: "Overview Nav Label",
    group: "sidebar",
    maxLength: 24,
  },
  {
    key: "sidebarEmployeesLabel",
    humanName: "Employees Section Label",
    group: "sidebar",
    maxLength: 24,
  },

  // Overview
  {
    key: "overviewBadgeLabel",
    humanName: "Badge Label",
    group: "overview",
    maxLength: 32,
  },
  {
    key: "overviewPageTitle",
    humanName: "Page Title",
    group: "overview",
    maxLength: 48,
  },
  {
    key: "overviewPageSubtitle",
    humanName: "Page Subtitle",
    group: "overview",
    maxLength: 80,
  },
  {
    key: "overviewActiveEmployeesLabel",
    humanName: "Active Employees Label",
    group: "overview",
    maxLength: 40,
  },
  {
    key: "overviewOnHoldLabel",
    humanName: "On Hold Employees Label",
    group: "overview",
    maxLength: 40,
  },
  {
    key: "overviewTotalEmployeesLabel",
    humanName: "Total Employees Label",
    group: "overview",
    maxLength: 40,
  },
  {
    key: "overviewFeedbackPanelTitle",
    humanName: "Feedback Panel Title",
    group: "overview",
    maxLength: 48,
  },
  {
    key: "overviewFeedbackPanelSubtitle",
    humanName: "Feedback Panel Subtitle",
    group: "overview",
    maxLength: 80,
  },
  {
    key: "overviewDirectoryTitle",
    humanName: "Directory Panel Title",
    group: "overview",
    maxLength: 48,
  },
  {
    key: "overviewDirectorySubtitle",
    humanName: "Directory Panel Subtitle",
    group: "overview",
    maxLength: 80,
  },

  // Employee Detail
  {
    key: "detailPersonalSectionTitle",
    humanName: "Personal Section Title",
    group: "detail",
    maxLength: 48,
  },
  {
    key: "detailPerformanceSectionTitle",
    humanName: "Performance Section Title",
    group: "detail",
    maxLength: 48,
  },
  {
    key: "detailSwotSectionTitle",
    humanName: "SWOT Section Title",
    group: "detail",
    maxLength: 48,
  },
  {
    key: "detailTraitsSectionTitle",
    humanName: "Traits Section Title",
    group: "detail",
    maxLength: 48,
  },
  {
    key: "detailProblemsSectionTitle",
    humanName: "Problems Section Title",
    group: "detail",
    maxLength: 48,
  },
  {
    key: "detailFeedbackSectionTitle",
    humanName: "Feedback Section Title",
    group: "detail",
    maxLength: 48,
  },
  {
    key: "detailSalesInfluenceLabel",
    humanName: "Sales Influence Index Label",
    group: "detail",
    maxLength: 40,
  },
  {
    key: "detailOperationalDisciplineLabel",
    humanName: "Operational Discipline Label",
    group: "detail",
    maxLength: 40,
  },
  {
    key: "detailProductKnowledgeLabel",
    humanName: "Product Knowledge Label",
    group: "detail",
    maxLength: 40,
  },
  {
    key: "detailSoftSkillsLabel",
    humanName: "Soft Skills Label",
    group: "detail",
    maxLength: 40,
  },
  {
    key: "detailReviewsLabel",
    humanName: "Total Reviews Label",
    group: "detail",
    maxLength: 32,
  },
];

const GROUP_META = {
  sidebar: {
    label: "Sidebar",
    icon: LayoutDashboard,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  overview: {
    label: "Overview Page",
    icon: BarChart2,
    color: "text-[oklch(0.42_0.16_240)]",
    bg: "bg-[oklch(0.93_0.03_240_/_0.4)]",
    border: "border-[oklch(0.65_0.12_240_/_0.3)]",
  },
  detail: {
    label: "Employee Detail",
    icon: Users,
    color: "text-[oklch(0.42_0.16_145)]",
    bg: "bg-[oklch(0.93_0.04_145_/_0.4)]",
    border: "border-[oklch(0.65_0.14_145_/_0.3)]",
  },
} as const;

// ─── Inline edit row ────────────────────────────────────────────────────────

interface EditRowProps {
  row: LabelRow;
  currentValue: string;
  onSave: (key: keyof AppSettingsLabels, value: string) => void;
}

function EditRow({ row, currentValue, onSave }: EditRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = GROUP_META[row.group];
  const Icon = meta.icon;

  useEffect(() => {
    if (editing) {
      setDraft(currentValue);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing, currentValue]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Value cannot be empty");
      return;
    }
    onSave(row.key, row.maxLength ? trimmed.slice(0, row.maxLength) : trimmed);
    toast.success(`"${row.humanName}" updated`);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(currentValue);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
        editing ? "bg-accent/40 border border-border/60" : "hover:bg-accent/20",
      )}
    >
      {/* Group icon */}
      <div
        className={cn(
          "shrink-0 w-7 h-7 rounded-md flex items-center justify-center border",
          meta.bg,
          meta.border,
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", meta.color)} />
      </div>

      {/* Label name */}
      <div className="w-52 shrink-0">
        <p className="text-xs font-semibold text-foreground/80">
          {row.humanName}
        </p>
      </div>

      {/* Value / Input */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) =>
              setDraft(
                row.maxLength
                  ? e.target.value.slice(0, row.maxLength)
                  : e.target.value,
              )
            }
            onKeyDown={handleKeyDown}
            className="h-8 text-sm font-medium"
            maxLength={row.maxLength}
          />
        ) : (
          <p className="text-sm text-foreground truncate font-medium">
            {currentValue}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {editing ? (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-primary hover:bg-primary/10"
              onClick={handleSave}
              aria-label="Save"
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:bg-accent"
              onClick={handleCancel}
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${row.humanName}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Logo Preview ────────────────────────────────────────────────────────────

interface LogoPreviewProps {
  appName: string;
  tagline: string;
  logoText: string;
}

function LogoPreview({ appName, tagline, logoText }: LogoPreviewProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-sidebar border border-border/60 shadow-sm w-fit">
      <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
        <span className="text-primary font-mono text-xs font-bold">
          {logoText.slice(0, 2) || "?"}
        </span>
      </div>
      <div>
        <p className="font-display font-bold text-sm text-foreground leading-tight">
          {appName || "App Name"}
        </p>
        <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
          {tagline || "Tagline"}
        </p>
      </div>
    </div>
  );
}

// ─── Feedback Categories Section ─────────────────────────────────────────────

interface FeedbackCategoriesSectionProps {
  categories: string[];
  onChange: (cats: string[]) => void;
}

function FeedbackCategoriesSection({
  categories,
  onChange,
}: FeedbackCategoriesSectionProps) {
  const [newCat, setNewCat] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }
    onChange([...categories, trimmed]);
    toast.success(`Category "${trimmed}" added`);
    setNewCat("");
    inputRef.current?.focus();
  };

  const handleRemove = (cat: string) => {
    onChange(categories.filter((c) => c !== cat));
    toast.success(`Category "${cat}" removed`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
          >
            <Tag className="w-3 h-3" />
            {cat}
            <button
              type="button"
              onClick={() => handleRemove(cat)}
              className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
              aria-label={`Remove ${cat}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {categories.length === 0 && (
          <p className="text-xs text-muted-foreground/60 italic">
            No categories yet
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Input
          ref={inputRef}
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New category name..."
          className="h-8 text-sm"
          maxLength={32}
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!newCat.trim()}
          className="gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
        <MessageSquare className="w-3 h-3" />
        These categories appear in the feedback form dropdown and quick-pick
        buttons.
      </p>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}

function SectionHeader({ icon: Icon, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4.5 h-4.5 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-display font-bold text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─── Data Management Section ──────────────────────────────────────────────────

interface DataCollection {
  key: string;
  label: string;
  description: string;
}

const DATA_COLLECTIONS: DataCollection[] = [
  {
    key: "employees",
    label: "Employees",
    description:
      "All employee records, including performance, SWOT, traits, problems, and linked feedback",
  },
  {
    key: "sales",
    label: "Sales Records",
    description: "All sales transactions linked to FSE FIPL codes",
  },
  {
    key: "attendance",
    label: "Attendance Records",
    description: "All attendance lapses and days-off entries",
  },
  {
    key: "feedback",
    label: "Feedback",
    description: "All employee feedback entries",
  },
  {
    key: "issues",
    label: "Issues & Suggestions",
    description: "All issues and suggestions submitted via the overview panel",
  },
  {
    key: "topPerformers",
    label: "Top Performers",
    description: "The monthly top-10 performers leaderboard",
  },
];

function DataManagementSection() {
  const queryClient = useQueryClient();
  const { actor } = useActor();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const allSelected =
    DATA_COLLECTIONS.length > 0 &&
    DATA_COLLECTIONS.every((c) => selected[c.key]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      setSelected(
        Object.fromEntries(DATA_COLLECTIONS.map((c) => [c.key, true])),
      );
    }
  };

  const toggleOne = (key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Arm/disarm Delete Selected
  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = setTimeout(() => setDeleteArmed(false), 3000);
      return;
    }
    // Confirmed
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setDeleteArmed(false);
    if (!actor) {
      toast.error("Not connected to backend — please wait and try again");
      return;
    }
    setIsDeleting(true);
    try {
      const ops: Promise<boolean>[] = [];
      if (selected.employees) ops.push(actor.clearAllEmployees());
      if (selected.sales) ops.push(actor.clearAllSalesRecords());
      if (selected.attendance) ops.push(actor.clearAllAttendance());
      if (selected.feedback) ops.push(actor.clearAllFeedback());
      if (selected.issues) ops.push(actor.clearAllIssues());
      if (selected.topPerformers) ops.push(actor.clearAllTopPerformers());
      await Promise.all(ops);
      await queryClient.invalidateQueries();
      const deletedLabels = DATA_COLLECTIONS.filter((c) => selected[c.key])
        .map((c) => c.label)
        .join(", ");
      toast.success(`Deleted: ${deletedLabels}`);
      setSelected({});
    } catch {
      toast.error("Delete failed — please try again");
    } finally {
      setIsDeleting(false);
    }
  };

  // Arm/disarm Reset All
  const handleResetAll = async () => {
    if (!resetArmed) {
      setResetArmed(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setResetArmed(false), 3000);
      return;
    }
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setResetArmed(false);
    if (!actor) {
      toast.error("Not connected to backend — please wait and try again");
      return;
    }
    setIsResetting(true);
    try {
      await actor.clearAllData();
      await queryClient.invalidateQueries();
      toast.success("All data has been reset");
      setSelected({});
    } catch {
      toast.error("Reset failed — please try again");
    } finally {
      setIsResetting(false);
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Header + Select All */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Select collections to delete, then confirm below.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-3 text-muted-foreground hover:text-foreground"
          onClick={toggleSelectAll}
          data-ocid="settings.data_management.select_all_button"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </Button>
      </div>

      {/* Checkboxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DATA_COLLECTIONS.map((col) => (
          <label
            key={col.key}
            htmlFor={`dm-${col.key}`}
            className={cn(
              "flex items-start gap-3 rounded-lg px-4 py-3 border cursor-pointer transition-all select-none",
              selected[col.key]
                ? "bg-destructive/8 border-destructive/30"
                : "bg-muted/20 border-border/40 hover:bg-muted/40",
            )}
          >
            <Checkbox
              id={`dm-${col.key}`}
              checked={!!selected[col.key]}
              onCheckedChange={() => toggleOne(col.key)}
              className="mt-0.5 shrink-0 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
              data-ocid={`settings.data_management.${col.key === "topPerformers" ? "top_performers" : col.key}.checkbox`}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold leading-tight",
                  selected[col.key] ? "text-destructive" : "text-foreground",
                )}
              >
                {col.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                {col.description}
              </p>
            </div>
          </label>
        ))}
      </div>

      <Separator className="opacity-40" />

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="destructive"
          size="sm"
          disabled={selectedCount === 0 || isDeleting}
          onClick={handleDeleteSelected}
          className={cn(
            "gap-2 transition-all",
            deleteArmed && "ring-2 ring-destructive ring-offset-2",
          )}
          data-ocid="settings.data_management.delete_selected_button"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          {deleteArmed
            ? "Click again to confirm"
            : `Delete ${selectedCount > 0 ? selectedCount : ""} Selected`.trim()}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          disabled={isResetting}
          onClick={handleResetAll}
          className={cn(
            "gap-2 transition-all bg-destructive/80 hover:bg-destructive",
            resetArmed && "ring-2 ring-destructive ring-offset-2",
          )}
          data-ocid="settings.data_management.reset_all_button"
        >
          {isResetting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <DatabaseBackup className="w-3.5 h-3.5" />
          )}
          {resetArmed ? "Click again to confirm reset" : "Reset All Data"}
        </Button>

        {(deleteArmed || resetArmed) && (
          <p className="text-[11px] text-destructive/80 flex items-center gap-1">
            ⚠ This action is irreversible
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main SettingsPage ────────────────────────────────────────────────────────

export function SettingsPage() {
  const { settings, updateLabel, updateFeedbackCategories, resetToDefaults } =
    useAppSettings();
  const { labels } = settings;

  const [resetConfirm, setResetConfirm] = useState(false);

  const handleReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
      return;
    }
    resetToDefaults();
    setResetConfirm(false);
    toast.success("All settings reset to defaults");
  };

  const sidebarRows = LABEL_ROWS.filter((r) => r.group === "sidebar");
  const overviewRows = LABEL_ROWS.filter((r) => r.group === "overview");
  const detailRows = LABEL_ROWS.filter((r) => r.group === "detail");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-8 max-w-5xl mx-auto"
    >
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold">
              Configuration
            </p>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Customize your dashboard labels, branding, and feedback categories
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className={cn(
            "gap-2 text-xs transition-all",
            resetConfirm
              ? "border-destructive/40 text-destructive hover:bg-destructive/10"
              : "text-muted-foreground",
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {resetConfirm ? "Click again to confirm reset" : "Reset to Defaults"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* ── Section 1: Branding ──────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="glass-card rounded-xl p-6"
        >
          <SectionHeader
            icon={Building2}
            title="Branding"
            subtitle="Customize the app name, tagline, and logo text shown in the sidebar"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Edit fields */}
            <div className="space-y-1">
              {sidebarRows.slice(0, 3).map((row) => (
                <EditRow
                  key={row.key}
                  row={row}
                  currentValue={labels[row.key]}
                  onSave={updateLabel}
                />
              ))}
            </div>

            {/* Live preview */}
            <div className="flex flex-col gap-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Live Preview
              </Label>
              <LogoPreview
                appName={labels.sidebarAppName}
                tagline={labels.sidebarTagline}
                logoText={labels.sidebarLogoText}
              />
              <p className="text-[10px] text-muted-foreground/50">
                Updates as you save changes
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── Section 2: UI Text Labels ────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card rounded-xl p-6"
        >
          <SectionHeader
            icon={Pencil}
            title="UI Text Labels"
            subtitle="Edit every piece of text displayed across the dashboard"
          />

          <div className="space-y-6">
            {/* Sidebar nav labels */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                    GROUP_META.sidebar.bg,
                    GROUP_META.sidebar.border,
                    GROUP_META.sidebar.color,
                  )}
                >
                  <LayoutDashboard className="w-3 h-3" />
                  {GROUP_META.sidebar.label}
                </div>
              </div>
              <div className="space-y-1">
                {sidebarRows.slice(3).map((row) => (
                  <EditRow
                    key={row.key}
                    row={row}
                    currentValue={labels[row.key]}
                    onSave={updateLabel}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Overview labels */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                    GROUP_META.overview.bg,
                    GROUP_META.overview.border,
                    GROUP_META.overview.color,
                  )}
                >
                  <BarChart2 className="w-3 h-3" />
                  {GROUP_META.overview.label}
                </div>
              </div>
              <div className="space-y-1">
                {overviewRows.map((row) => (
                  <EditRow
                    key={row.key}
                    row={row}
                    currentValue={labels[row.key]}
                    onSave={updateLabel}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Detail labels */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                    GROUP_META.detail.bg,
                    GROUP_META.detail.border,
                    GROUP_META.detail.color,
                  )}
                >
                  <Users className="w-3 h-3" />
                  {GROUP_META.detail.label}
                </div>
              </div>
              <div className="space-y-1">
                {detailRows.map((row) => (
                  <EditRow
                    key={row.key}
                    row={row}
                    currentValue={labels[row.key]}
                    onSave={updateLabel}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Section 3: Feedback Categories ──────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="glass-card rounded-xl p-6"
        >
          <SectionHeader
            icon={MessageSquare}
            title="Feedback Categories"
            subtitle="Manage categories used in the feedback form dropdown and quick-pick buttons"
          />

          <FeedbackCategoriesSection
            categories={settings.feedbackCategories}
            onChange={updateFeedbackCategories}
          />
        </motion.section>

        {/* ── Default values reference ─────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-card rounded-xl p-6"
        >
          <SectionHeader
            icon={RefreshCw}
            title="Default Values Reference"
            subtitle="The original default values for all labels, for reference"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {LABEL_ROWS.map((row) => {
              const defaultVal = DEFAULT_SETTINGS.labels[row.key];
              const current = labels[row.key];
              const isDifferent = current !== defaultVal;
              return (
                <div
                  key={row.key}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs border",
                    isDifferent
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/20 border-border/40",
                  )}
                >
                  <p className="font-semibold text-foreground/70 truncate">
                    {row.humanName}
                  </p>
                  <p className="text-muted-foreground/60 truncate mt-0.5">
                    {defaultVal}
                  </p>
                  {isDifferent && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 mt-1 bg-primary/10 text-primary border-primary/20"
                    >
                      modified
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* ── Section 5: Data Management ───────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="rounded-xl p-6 border border-destructive/30 bg-destructive/5"
        >
          {/* Section header */}
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-center shrink-0 mt-0.5">
              <Trash2 className="w-4.5 h-4.5 text-destructive" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-display font-bold text-foreground">
                  Data Management
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/25">
                  Danger Zone
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete individual data collections or reset
                everything. These actions cannot be undone.
              </p>
            </div>
          </div>

          <DataManagementSection />
        </motion.section>
      </div>
    </motion.div>
  );
}
