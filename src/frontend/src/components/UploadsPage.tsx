import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  UploadCloud,
  UserCheck,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Status } from "../backend";
import type { Employee } from "../backend.d.ts";
import { useActor } from "../hooks/useActor";
import {
  useAddAttendanceRecord,
  useAddSalesRecord,
  useAllEmployees,
  useBulkAddEmployees,
  useUpdateEmployee,
} from "../hooks/useQueries";

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedEmployeeRow {
  fiplCode: string;
  name: string;
  role: string;
  department: string;
  fseCategory: string;
  status: Status;
  joinDate: string;
  avatar: string;
  region: string;
  familyDetails: string;
  pastExperience: string[];
  error?: string;
}

interface ParsedParamsRow {
  fiplCode: string;
  salesInfluenceIndex: number;
  reviewCount: number;
  operationalDiscipline: number;
  productKnowledgeScore: number;
  softSkillsScore: number;
  accessories: number;
  extendedWarranty: number;
  totalSalesAmount: number;
  totalDemoVisits: number;
  totalComplaintVisits: number;
  totalVideoCallDemos: number;
  error?: string;
}

interface ParsedAttendanceRow {
  fiplCode: string;
  date: string;
  lapseType: string;
  lapseReason: string;
  daysOff: number;
  daysOffReason: string;
  error?: string;
}

interface ParsedSwotRow {
  fiplCode: string;
  swotStrengths: string[];
  swotWeaknesses: string[];
  swotOpportunities: string[];
  swotThreats: string[];
  traits: string[];
  problems: string[];
  feedbacks: Array<{ category: string; severity: string; description: string }>;
  error?: string;
}

interface ParsedSalesRow {
  fiplCode: string;
  name: string;
  region: string;
  date: string;
  amountOfSale: number;
  error?: string;
}

// ── Utility parse helpers ────────────────────────────────────────────────────

function parseSemicolon(raw: string): string[] {
  return raw
    ? raw
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

function parseFeedbacks(
  raw: string,
): Array<{ category: string; severity: string; description: string }> {
  if (!raw) return [];
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split("|");
      return {
        category: parts[0]?.trim() ?? "",
        severity: parts[1]?.trim() ?? "low",
        description: parts[2]?.trim() ?? "",
      };
    });
}

function parseXlsxDate(raw: string): string {
  if (!raw) return raw;
  const serial = Number(raw);
  if (!Number.isNaN(serial) && serial > 1000) {
    const jsDate = XLSX.SSF.parse_date_code(serial);
    if (jsDate) {
      return `${jsDate.y}-${String(jsDate.m).padStart(2, "0")}-${String(jsDate.d).padStart(2, "0")}`;
    }
  }
  return raw;
}

function normaliseKeys(r: Record<string, unknown>): Record<string, string> {
  const norm: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) {
    // Strip ALL non-alphanumeric characters from keys so headers like
    // "FIPL Code (Primary Key)*" → "fiplcodeprimarykey" and also
    // simple "FIPL Code" → "fiplcode" both resolve correctly.
    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    norm[cleanKey] = String(v ?? "").trim();
  }
  return norm;
}

/** Resolve a normalised key by trying multiple possible column name variants. */
function pick(norm: Record<string, string>, ...candidates: string[]): string {
  for (const c of candidates) {
    const key = c.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (norm[key] !== undefined) return norm[key];
  }
  return "";
}

/** Fuzzy sheet-name match -- strips spaces and lowercases both sides. */
function findSheet(
  wb: XLSX.WorkBook,
  ...targets: string[]
): string | undefined {
  return wb.SheetNames.find((n) => {
    const key = n.toLowerCase().replace(/[^a-z0-9]/g, "");
    return targets.some(
      (t) => key === t.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );
  });
}

// ── Sheet parsers ────────────────────────────────────────────────────────────

function parseEmployeeSheetStandalone(
  wb: XLSX.WorkBook,
): ParsedEmployeeRow[] | null {
  const sheetName = findSheet(
    wb,
    "Employee Details",
    "Employee Data",
    "EmployeeDetails",
    "EmployeeData",
    "Employees",
    "Sheet1",
  );
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });
  return raw.map((r) => {
    const norm = normaliseKeys(r);
    const pastExpRaw = pick(
      norm,
      "Past Experience",
      "pastExperience",
      "Past Work Experience",
    );
    const statusRaw = pick(norm, "Status", "status");
    const row: ParsedEmployeeRow = {
      fiplCode: pick(
        norm,
        "FIPL Code",
        "FIPL Code (Primary Key)*",
        "fiplCode",
        "FIPLCode",
        "FIPL",
      ),
      name: pick(norm, "Name", "Employee Name", "name"),
      role: pick(norm, "Role", "Designation", "role"),
      department: pick(norm, "Department", "Dept", "department"),
      fseCategory: pick(
        norm,
        "FSE Category",
        "fsecategory",
        "Category",
        "FSECategory",
        "FSE Category (Cash Cow / Star / Question Mark / Dog)",
      ),
      status:
        statusRaw.toLowerCase() === "inactive"
          ? Status.inactive
          : statusRaw.toLowerCase() === "onhold" ||
              statusRaw.toLowerCase() === "on hold"
            ? Status.onHold
            : Status.active,
      joinDate: pick(
        norm,
        "Joining Date",
        "Join Date",
        "joinDate",
        "joiningdate",
        "Joining Date (YYYY-MM-DD)",
      ),
      avatar: pick(
        norm,
        "Avatar",
        "Initials",
        "avatar",
        "Avatar (initials, e.g. PS)",
      ),
      region: pick(norm, "Region", "region"),
      familyDetails: pick(
        norm,
        "Family Details",
        "familyDetails",
        "Family",
        "familydetails",
      ),
      pastExperience: parseSemicolon(pastExpRaw),
    };
    if (!row.fiplCode) row.error = "FIPL Code is required";
    else if (!row.name) row.error = "Name is required";
    else if (!row.role) row.error = "Role is required";
    else if (!row.department) row.error = "Department is required";
    return row;
  });
}

function parseParamsSheetStandalone(
  wb: XLSX.WorkBook,
): ParsedParamsRow[] | null {
  const sheetName = findSheet(
    wb,
    "FSE Parameters",
    "FSEParameters",
    "Parameters",
    "Params",
    "FSE Params",
    "Sheet2",
  );
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });
  return raw.map((r) => {
    const norm = normaliseKeys(r);
    const row: ParsedParamsRow = {
      fiplCode: pick(
        norm,
        "FIPL Code",
        "FIPL Code (Primary Key)*",
        "fiplCode",
        "FIPLCode",
      ),
      salesInfluenceIndex:
        Number(
          pick(
            norm,
            "Sales Influence Index (0-100)",
            "Sales Influence Index",
            "salesInfluenceIndex",
            "SalesInfluenceIndex",
          ),
        ) || 0,
      reviewCount:
        Number(pick(norm, "Review Count", "reviewCount", "Reviews")) || 0,
      operationalDiscipline:
        Number(
          pick(
            norm,
            "Operational Discipline (0-100)",
            "Operational Discipline",
            "operationalDiscipline",
            "OperationalDiscipline",
          ),
        ) || 0,
      productKnowledgeScore:
        Number(
          pick(
            norm,
            "Product Knowledge Score (0-100)",
            "Product Knowledge Score",
            "productKnowledgeScore",
            "ProductKnowledgeScore",
          ),
        ) || 0,
      softSkillsScore:
        Number(
          pick(
            norm,
            "Soft Skill Score (0-100)",
            "Soft Skills Score",
            "Soft Skill Score",
            "softSkillsScore",
            "SoftSkillScore",
          ),
        ) || 0,
      accessories:
        Number(
          pick(
            norm,
            "Accessory Count",
            "accessoryCount",
            "Accessories",
            "accessories",
          ),
        ) || 0,
      extendedWarranty:
        Number(
          pick(
            norm,
            "Extended Warranty Count",
            "extendedWarrantyCount",
            "Extended Warranty",
            "extendedWarranty",
          ),
        ) || 0,
      totalSalesAmount:
        Number(
          pick(
            norm,
            "Total Sales Amount (₹)",
            "Total Sales Amount",
            "totalSalesAmount",
            "TotalSalesAmount",
          ),
        ) || 0,
      totalDemoVisits:
        Number(
          pick(norm, "Total Demo Visits", "totalDemoVisits", "TotalDemoVisits"),
        ) || 0,
      totalComplaintVisits:
        Number(
          pick(
            norm,
            "Total Complaint Visits",
            "totalComplaintVisits",
            "TotalComplaintVisits",
          ),
        ) || 0,
      totalVideoCallDemos:
        Number(
          pick(
            norm,
            "Total Video Call Demos",
            "totalVideoCallDemos",
            "TotalVideoCallDemos",
          ),
        ) || 0,
    };
    if (!row.fiplCode) row.error = "FIPL Code is required";
    return row;
  });
}

function parseAttendanceSheetStandalone(
  wb: XLSX.WorkBook,
): ParsedAttendanceRow[] | null {
  const sheetName = findSheet(
    wb,
    "Attendance",
    "AttendanceRecords",
    "Attendance Records",
    "Sheet3",
  );
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });
  return raw.map((r) => {
    const norm = normaliseKeys(r);
    const row: ParsedAttendanceRow = {
      fiplCode: pick(
        norm,
        "FIPL Code",
        "FIPL Code (Primary Key)*",
        "fiplCode",
        "FIPLCode",
      ),
      date: parseXlsxDate(
        pick(norm, "Date (YYYY-MM-DD)*", "Date (YYYY-MM-DD)", "Date", "date"),
      ),
      lapseType: pick(
        norm,
        "Attendance Lapse Type (Late Attendance / Missing / Other)",
        "Attendance Lapse Type",
        "Lapse Type",
        "lapseType",
        "AttendanceLapseType",
      ),
      lapseReason: pick(
        norm,
        "Lapse Reason",
        "lapseReason",
        "Reason",
        "reason",
      ),
      daysOff:
        Number(
          pick(
            norm,
            "Days Taken Off (0 or 1)",
            "Days Taken Off",
            "Days Off",
            "daysOff",
            "daysoff",
          ),
        ) || 0,
      daysOffReason: pick(
        norm,
        "Days Off Reason",
        "daysOffReason",
        "DaysOffReason",
      ),
    };
    if (!row.fiplCode) row.error = "FIPL Code is required";
    else if (!row.date) row.error = "Date is required";
    return row;
  });
}

function parseSwotSheetStandalone(wb: XLSX.WorkBook): ParsedSwotRow[] | null {
  const sheetName = findSheet(
    wb,
    "SWOT Analysis",
    "SWOTAnalysis",
    "SWOT",
    "Sheet4",
  );
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });
  return raw.map((r) => {
    const norm = normaliseKeys(r);
    const row: ParsedSwotRow = {
      fiplCode: pick(
        norm,
        "FIPL Code",
        "FIPL Code (Primary Key)*",
        "fiplCode",
        "FIPLCode",
      ),
      swotStrengths: parseSemicolon(
        pick(norm, "Strengths (semicolon-separated)", "Strengths", "strengths"),
      ),
      swotWeaknesses: parseSemicolon(
        pick(
          norm,
          "Weaknesses (semicolon-separated)",
          "Weaknesses",
          "weaknesses",
        ),
      ),
      swotOpportunities: parseSemicolon(
        pick(
          norm,
          "Opportunities (semicolon-separated)",
          "Opportunities",
          "opportunities",
        ),
      ),
      swotThreats: parseSemicolon(
        pick(norm, "Threats (semicolon-separated)", "Threats", "threats"),
      ),
      traits: parseSemicolon(
        pick(norm, "Traits (semicolon-separated)", "Traits", "traits"),
      ),
      problems: parseSemicolon(
        pick(norm, "Problems (semicolon-separated)", "Problems", "problems"),
      ),
      feedbacks: parseFeedbacks(
        pick(
          norm,
          "Feedbacks (category|severity|description; separated)",
          "Feedbacks",
          "feedbacks",
        ),
      ),
    };
    if (!row.fiplCode) row.error = "FIPL Code is required";
    return row;
  });
}

function parseSalesSheetStandalone(wb: XLSX.WorkBook): ParsedSalesRow[] | null {
  const sheetName = findSheet(wb, "Sales Data", "SalesData", "Sales", "Sheet5");
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });
  return raw.map((r) => {
    const norm = normaliseKeys(r);
    const row: ParsedSalesRow = {
      fiplCode: pick(
        norm,
        "FIPL Code",
        "FIPL Code (Primary Key)*",
        "fiplCode",
        "FIPLCode",
      ),
      name: pick(
        norm,
        "Name (auto-filled from FIPL Code)",
        "Name",
        "Employee Name",
        "name",
      ),
      region: pick(
        norm,
        "Region (auto-filled from FIPL Code)",
        "Region",
        "region",
      ),
      date: parseXlsxDate(
        pick(norm, "Date (YYYY-MM-DD)*", "Date (YYYY-MM-DD)", "Date", "date"),
      ),
      amountOfSale:
        Number(
          pick(
            norm,
            "Amount of Sale (₹)*",
            "Amount of Sale",
            "Amount",
            "amountOfSale",
            "AmountofSale",
            "amountofsale",
          ),
        ) || 0,
    };
    if (!row.fiplCode) row.error = "FIPL Code is required";
    else if (!row.date) row.error = "Date is required";
    else if (row.amountOfSale <= 0) row.error = "Amount must be > 0";
    return row;
  });
}

// ── Template downloaders ─────────────────────────────────────────────────────

function downloadEmployeeTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = [
    "FIPL Code (Primary Key)*",
    "Name*",
    "Role*",
    "Department*",
    "FSE Category (Cash Cow / Star / Question Mark / Dog)",
    "Status (active / inactive / onhold)",
    "Joining Date (YYYY-MM-DD)",
    "Avatar (initials, e.g. PS)",
    "Region",
    "Family Details",
    "Past Experience (semicolon-separated: Company - Role - Duration)",
  ];
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    [
      "FIPL-001",
      "Priya Sharma",
      "Senior FSE",
      "Sales",
      "Star",
      "active",
      "2023-03-15",
      "PS",
      "North India",
      "Married, 2 children",
      "Infosys - Software Engineer - 3 years;TCS - Senior Engineer - 2 years",
    ],
    [
      "FIPL-002",
      "Raj Mehta",
      "Sales Manager",
      "Sales",
      "Cash Cow",
      "active",
      "2022-07-01",
      "RM",
      "West Coast",
      "Single",
      "StartupXYZ - Sales Exec - 2 years",
    ],
  ]);
  ws["!cols"] = [
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 42 },
    { wch: 30 },
    { wch: 26 },
    { wch: 22 },
    { wch: 20 },
    { wch: 28 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Employee Details");
  XLSX.writeFile(wb, "FSE-employee-data-template.xlsx");
}

function downloadParamsTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = [
    "FIPL Code (Primary Key)*",
    "Sales Influence Index (0-100)",
    "Review Count",
    "Operational Discipline (0-100)",
    "Product Knowledge Score (0-100)",
    "Soft Skill Score (0-100)",
    "Accessory Count",
    "Extended Warranty Count",
    "Total Sales Amount (₹)",
    "Total Demo Visits",
    "Total Complaint Visits",
    "Total Video Call Demos",
  ];
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    ["FIPL-001", 88, 24, 91, 85, 78, 12, 3, 280000, 15, 4, 8],
    ["FIPL-002", 95, 31, 78, 72, 88, 28, 8, 420000, 22, 6, 11],
  ]);
  ws["!cols"] = [
    { wch: 22 },
    { wch: 30 },
    { wch: 18 },
    { wch: 30 },
    { wch: 30 },
    { wch: 24 },
    { wch: 20 },
    { wch: 26 },
    { wch: 26 },
    { wch: 22 },
    { wch: 26 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "FSE Parameters");
  XLSX.writeFile(wb, "FSE-parameters-template.xlsx");
}

function downloadAttendanceTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = [
    "FIPL Code (Primary Key)*",
    "Date (YYYY-MM-DD)*",
    "Attendance Lapse Type (Late Attendance / Missing / Other)",
    "Lapse Reason",
    "Days Taken Off (0 or 1)",
    "Days Off Reason",
  ];
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    [
      "FIPL-001",
      "2026-01-10",
      "Late Attendance",
      "Forgot to mark on app",
      0,
      "",
    ],
    ["FIPL-001", "2026-02-05", "Missing", "No reason provided", 0, ""],
    ["FIPL-001", "2026-03-01", "", "", 1, "Sick Leave"],
    [
      "FIPL-002",
      "2026-01-15",
      "Late Attendance",
      "Client meeting ran late",
      0,
      "",
    ],
  ]);
  ws["!cols"] = [
    { wch: 22 },
    { wch: 22 },
    { wch: 42 },
    { wch: 36 },
    { wch: 22 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, "FSE-attendance-template.xlsx");
}

function downloadSwotTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = [
    "FIPL Code (Primary Key)*",
    "Strengths (semicolon-separated)",
    "Weaknesses (semicolon-separated)",
    "Opportunities (semicolon-separated)",
    "Threats (semicolon-separated)",
    "Traits (semicolon-separated)",
    "Problems (semicolon-separated)",
    "Feedbacks (category|severity|description; separated)",
  ];
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    [
      "FIPL-001",
      "Strong technical skills;Fast learner",
      "Occasionally over-commits;Public speaking",
      "Cross-team leadership;Architecture ownership",
      "Rapid tech change;Burnout risk",
      "Analytical;Collaborative;Detail-oriented",
      "Work-life balance;Documentation backlog",
      "Performance|low|Consistently exceeds sprint goals;Culture|low|Great team collaborator",
    ],
    [
      "FIPL-002",
      "Top closer;Persuasive communicator",
      "Poor CRM hygiene;Misses follow-ups",
      "Enterprise accounts;Team lead track",
      "Market downturn;Quota pressure",
      "Goal-driven;Charismatic;Competitive",
      "CRM adoption;Pipeline forecasting",
      "Performance|high|Missed Q3 targets by 12%;Management|low|Excellent team motivator",
    ],
  ]);
  ws["!cols"] = [
    { wch: 22 },
    { wch: 38 },
    { wch: 38 },
    { wch: 38 },
    { wch: 38 },
    { wch: 38 },
    { wch: 38 },
    { wch: 55 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "SWOT Analysis");
  XLSX.writeFile(wb, "FSE-swot-template.xlsx");
}

function downloadSalesTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = [
    "FIPL Code (Primary Key)*",
    "Name (auto-filled from FIPL Code)",
    "Region (auto-filled from FIPL Code)",
    "Date (YYYY-MM-DD)*",
    "Amount of Sale (₹)*",
  ];
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    ["FIPL-001", "Priya Sharma", "North India", "2026-03-01", 45000],
    ["FIPL-001", "Priya Sharma", "North India", "2026-03-05", 52000],
    ["FIPL-001", "Priya Sharma", "North India", "2026-03-12", 38000],
    ["FIPL-002", "Raj Mehta", "West Coast", "2026-03-01", 72000],
    ["FIPL-002", "Raj Mehta", "West Coast", "2026-03-08", 68000],
    ["FIPL-002", "Raj Mehta", "West Coast", "2026-03-15", 91000],
  ]);
  ws["!cols"] = [
    { wch: 28 },
    { wch: 28 },
    { wch: 22 },
    { wch: 20 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Sales Data");
  XLSX.writeFile(wb, "FSE-sales-data-template.xlsx");
}

// ── Sub-tab component ────────────────────────────────────────────────────────

type UploadStep = "idle" | "preview" | "done";

interface UploadTabProps<T extends { error?: string }> {
  tabId: string;
  title: string;
  description: string;
  columns: string[];
  rows: T[];
  renderRow: (row: T, index: number) => React.ReactNode;
  step: UploadStep;
  isImporting: boolean;
  onFileSelect: (file: File) => void;
  onConfirm: () => void;
  onReset: () => void;
  onDownloadTemplate: () => void;
  accentClass?: string;
}

function UploadTabPanel<T extends { error?: string }>({
  tabId,
  title,
  description,
  columns,
  rows,
  renderRow,
  step,
  isImporting,
  onFileSelect,
  onConfirm,
  onReset,
  onDownloadTemplate,
  accentClass = "bg-primary/10 text-primary border-primary/20",
}: UploadTabProps<T>) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter((r) => !r.error);
  const errorRows = rows.filter((r) => r.error);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-display font-bold text-foreground">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownloadTemplate}
          className="gap-2 shrink-0 text-xs"
          data-ocid={`uploads.${tabId}.upload_button`}
        >
          <Download className="w-3.5 h-3.5" />
          Download Template
        </Button>
      </div>

      {/* Step: idle / upload */}
      {step === "idle" && (
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative w-full rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 hover:bg-accent/20",
          )}
          data-ocid={`uploads.${tabId}.dropzone`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
              e.target.value = "";
            }}
          />
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-full border flex items-center justify-center transition-all",
                isDragging
                  ? "border-primary/40 bg-primary/20"
                  : "border-border bg-muted/30",
              )}
            >
              <UploadCloud
                className={cn(
                  "w-5 h-5 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground",
                )}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isDragging ? "Drop file here" : "Click or drag file here"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                .xlsx (recommended) or .csv files accepted
              </p>
            </div>
          </div>
        </button>
      )}

      {/* Step: preview */}
      {step === "preview" && (
        <div className="space-y-4">
          {/* Summary badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <CheckCircle2 className="w-3 h-3" />
                {validRows.length} valid
              </span>
            </span>
            {errorRows.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertCircle className="w-3 h-3" />
                  {errorRows.length} error{errorRows.length > 1 ? "s" : ""}
                </span>
              </span>
            )}
          </div>

          {/* Preview table */}
          <ScrollArea className="max-h-64 rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] uppercase tracking-wider w-8">
                    #
                  </TableHead>
                  {columns.map((col) => (
                    <TableHead
                      key={col}
                      className="text-[10px] uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </TableHead>
                  ))}
                  <TableHead className="text-[10px] uppercase tracking-wider">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow
                    // biome-ignore lint/suspicious/noArrayIndexKey: parse preview rows have no stable ID
                    key={i}
                    className={cn(
                      "text-xs",
                      row.error
                        ? "bg-destructive/5 text-destructive"
                        : "hover:bg-accent/20",
                    )}
                    data-ocid={`uploads.${tabId}.item.${i + 1}`}
                  >
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    {renderRow(row, i)}
                    <TableCell>
                      {row.error ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 px-1.5 py-0"
                        >
                          {row.error}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] px-1.5 py-0", accentClass)}
                        >
                          OK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-muted-foreground"
              onClick={onReset}
            >
              ← Upload different file
            </Button>
            <Button
              size="sm"
              className="gap-2 text-xs"
              onClick={onConfirm}
              disabled={isImporting || validRows.length === 0}
              data-ocid={`uploads.${tabId}.submit_button`}
            >
              {isImporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {isImporting
                ? "Importing..."
                : `Confirm Import (${validRows.length} rows)`}
            </Button>
          </div>
        </div>
      )}

      {/* Step: done */}
      {step === "done" && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-display font-bold text-foreground">
              Import Complete!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {validRows.length} record{validRows.length === 1 ? "" : "s"}{" "}
              successfully imported
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs mt-2"
            onClick={onReset}
            data-ocid={`uploads.${tabId}.secondary_button`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Another File
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main UploadsPage ─────────────────────────────────────────────────────────

export function UploadsPage() {
  // ── Employee Data Tab ────────────────────────────────────────────────────
  const [empStep, setEmpStep] = useState<UploadStep>("idle");
  const [empRows, setEmpRows] = useState<ParsedEmployeeRow[]>([]);
  const [empImporting, setEmpImporting] = useState(false);

  // ── Parameters Tab ───────────────────────────────────────────────────────
  const [paramsStep, setParamsStep] = useState<UploadStep>("idle");
  const [paramsRows, setParamsRows] = useState<ParsedParamsRow[]>([]);
  const [paramsImporting, setParamsImporting] = useState(false);

  // ── Attendance Tab ───────────────────────────────────────────────────────
  const [attStep, setAttStep] = useState<UploadStep>("idle");
  const [attRows, setAttRows] = useState<ParsedAttendanceRow[]>([]);
  const [attImporting, setAttImporting] = useState(false);

  // ── SWOT Tab ─────────────────────────────────────────────────────────────
  const [swotStep, setSwotStep] = useState<UploadStep>("idle");
  const [swotRows, setSwotRows] = useState<ParsedSwotRow[]>([]);
  const [swotImporting, setSwotImporting] = useState(false);

  // ── Sales Tab ────────────────────────────────────────────────────────────
  const [salesStep, setSalesStep] = useState<UploadStep>("idle");
  const [salesRows, setSalesRows] = useState<ParsedSalesRow[]>([]);
  const [salesImporting, setSalesImporting] = useState(false);

  // ── Hooks ────────────────────────────────────────────────────────────────
  const bulkAdd = useBulkAddEmployees();
  const updateEmployee = useUpdateEmployee();
  const addAttendanceRecord = useAddAttendanceRecord();
  const addSalesRecord = useAddSalesRecord();
  const { data: existingEmployees = [] } = useAllEmployees();
  const { actor } = useActor();

  // FIPL Code -> Employee lookup
  const fiplMap = new Map<string, Employee>(
    existingEmployees.map((e) => [e.fiplCode.toUpperCase(), e]),
  );

  // ── File handlers ────────────────────────────────────────────────────────

  function readWorkbook(file: File, onParsed: (wb: XLSX.WorkBook) => void) {
    const isXlsx =
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.type.includes("spreadsheetml") ||
      file.type.includes("excel");
    const isCsv = file.name.endsWith(".csv") || file.type === "text/csv";

    if (!isXlsx && !isCsv) {
      toast.error("Please upload a CSV or Excel (.xlsx) file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) return;
      const data = isXlsx
        ? new Uint8Array(result as ArrayBuffer)
        : new TextEncoder().encode(result as string);
      const wb = XLSX.read(data, { type: "array" });
      onParsed(wb);
    };
    if (isXlsx) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }

  const handleEmpFile = (file: File) => {
    readWorkbook(file, (wb) => {
      const rows = parseEmployeeSheetStandalone(wb);
      if (!rows) {
        toast.error(
          `Sheet not found. Expected "Employee Details" or "Employee Data". Found: ${wb.SheetNames.join(", ")}`,
        );
        return;
      }
      if (rows.length === 0) {
        toast.error(
          "Sheet is empty -- add at least one data row below the header.",
        );
        return;
      }
      setEmpRows(rows);
      setEmpStep("preview");
    });
  };

  const handleParamsFile = (file: File) => {
    readWorkbook(file, (wb) => {
      const rows = parseParamsSheetStandalone(wb);
      if (!rows) {
        toast.error(
          `Sheet not found. Expected "FSE Parameters". Found: ${wb.SheetNames.join(", ")}`,
        );
        return;
      }
      if (rows.length === 0) {
        toast.error(
          "Sheet is empty -- add at least one data row below the header.",
        );
        return;
      }
      setParamsRows(rows);
      setParamsStep("preview");
    });
  };

  const handleAttFile = (file: File) => {
    readWorkbook(file, (wb) => {
      const rows = parseAttendanceSheetStandalone(wb);
      if (!rows) {
        toast.error(
          `Sheet not found. Expected "Attendance". Found: ${wb.SheetNames.join(", ")}`,
        );
        return;
      }
      if (rows.length === 0) {
        toast.error(
          "Sheet is empty -- add at least one data row below the header.",
        );
        return;
      }
      setAttRows(rows);
      setAttStep("preview");
    });
  };

  const handleSwotFile = (file: File) => {
    readWorkbook(file, (wb) => {
      const rows = parseSwotSheetStandalone(wb);
      if (!rows) {
        toast.error(
          `Sheet not found. Expected "SWOT Analysis". Found: ${wb.SheetNames.join(", ")}`,
        );
        return;
      }
      if (rows.length === 0) {
        toast.error(
          "Sheet is empty -- add at least one data row below the header.",
        );
        return;
      }
      setSwotRows(rows);
      setSwotStep("preview");
    });
  };

  const handleSalesFile = (file: File) => {
    readWorkbook(file, (wb) => {
      const rows = parseSalesSheetStandalone(wb);
      if (!rows) {
        toast.error(
          `Sheet not found. Expected "Sales Data". Found: ${wb.SheetNames.join(", ")}`,
        );
        return;
      }
      if (rows.length === 0) {
        toast.error(
          "Sheet is empty -- add at least one data row below the header.",
        );
        return;
      }
      // Auto-fill name/region from FIPL lookup
      const enriched = rows.map((r) => {
        const emp = fiplMap.get(r.fiplCode.toUpperCase());
        return {
          ...r,
          name: emp ? emp.name : r.name,
          region: emp ? emp.region : r.region,
        };
      });
      setSalesRows(enriched);
      setSalesStep("preview");
    });
  };

  // ── Import handlers ──────────────────────────────────────────────────────

  const handleEmpImport = async () => {
    const valid = empRows.filter((r) => !r.error);
    if (valid.length === 0) return;
    setEmpImporting(true);
    try {
      const inputs = valid.map((row) => {
        const joinDateMs = row.joinDate
          ? new Date(row.joinDate).getTime()
          : Date.now();
        const joinDateNs =
          BigInt(Number.isNaN(joinDateMs) ? Date.now() : joinDateMs) *
          1_000_000n;
        const avatar =
          row.avatar ||
          row.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        return {
          fiplCode: row.fiplCode,
          fseCategory: row.fseCategory,
          name: row.name,
          role: row.role,
          department: row.department,
          status: row.status,
          joinDate: joinDateNs,
          avatar,
          region: row.region,
          familyDetails: row.familyDetails,
          pastExperience: row.pastExperience,
        };
      });
      const ids = await bulkAdd.mutateAsync(inputs);
      toast.success(
        `${ids.length} employee${ids.length === 1 ? "" : "s"} imported`,
      );
      setEmpStep("done");
    } catch (err) {
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setEmpImporting(false);
    }
  };

  const handleParamsImport = async () => {
    const valid = paramsRows.filter((r) => !r.error);
    if (valid.length === 0) return;
    setParamsImporting(true);
    let updated = 0;
    let skipped = 0;
    try {
      // Process sequentially to avoid overwhelming the backend
      for (const row of valid) {
        const emp = fiplMap.get(row.fiplCode.toUpperCase());
        if (!emp) {
          skipped++;
          continue;
        }
        // Fetch existing employee details to preserve SWOT / traits / problems
        let existingSwot = {
          strengths: [] as string[],
          weaknesses: [] as string[],
          opportunities: [] as string[],
          threats: [] as string[],
        };
        let existingTraits: string[] = [];
        let existingProblems: string[] = [];
        try {
          if (actor) {
            const details = await actor.getEmployeeDetails(emp.id);
            existingSwot = {
              strengths: details.swot.strengths,
              weaknesses: details.swot.weaknesses,
              opportunities: details.swot.opportunities,
              threats: details.swot.threats,
            };
            existingTraits = details.traits;
            existingProblems = details.problems;
          }
        } catch {
          /* use empty fallback if fetch fails */
        }

        await updateEmployee.mutateAsync({
          id: emp.id,
          input: {
            employeeInfo: {
              fiplCode: emp.fiplCode,
              fseCategory: emp.fseCategory,
              name: emp.name,
              role: emp.role,
              department: emp.department,
              status: emp.status,
              joinDate: emp.joinDate,
              avatar: emp.avatar,
              region: emp.region,
              familyDetails: emp.familyDetails,
              pastExperience: emp.pastExperience,
            },
            performance: {
              salesInfluenceIndex: BigInt(Math.round(row.salesInfluenceIndex)),
              reviewCount: BigInt(Math.round(row.reviewCount)),
              operationalDiscipline: BigInt(
                Math.round(row.operationalDiscipline),
              ),
              productKnowledgeScore: BigInt(
                Math.round(row.productKnowledgeScore),
              ),
              softSkillsScore: BigInt(Math.round(row.softSkillsScore)),
            },
            swotAnalysis: existingSwot,
            traits: existingTraits,
            problems: existingProblems,
          },
        });
        updated++;
      }
      const msg =
        skipped > 0
          ? `${updated} updated, ${skipped} skipped (FIPL Code not found in system)`
          : `${updated} employee${updated === 1 ? "" : "s"} parameters updated`;
      toast.success(msg);
      setParamsStep("done");
    } catch (err) {
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setParamsImporting(false);
    }
  };

  const handleAttImport = async () => {
    const valid = attRows.filter((r) => !r.error);
    if (valid.length === 0) return;
    setAttImporting(true);
    let added = 0;
    let skipped = 0;
    try {
      // Sequential processing to avoid overwhelming the IC canister
      for (const row of valid) {
        const emp = fiplMap.get(row.fiplCode.toUpperCase());
        if (!emp) {
          skipped++;
          continue;
        }
        const dateMs = row.date ? new Date(row.date).getTime() : Date.now();
        const dateNs =
          BigInt(Number.isNaN(dateMs) ? Date.now() : dateMs) * 1_000_000n;

        if (row.lapseType) {
          await addAttendanceRecord.mutateAsync({
            employeeId: emp.id,
            lapseType: row.lapseType,
            date: dateNs,
            reason: row.lapseReason,
            daysOff: 0n,
          });
          added++;
        }
        if (row.daysOff > 0) {
          await addAttendanceRecord.mutateAsync({
            employeeId: emp.id,
            lapseType: "Day Off",
            date: dateNs,
            reason: row.daysOffReason,
            daysOff: BigInt(row.daysOff),
          });
          added++;
        }
      }
      const attMsg =
        skipped > 0
          ? `${added} records imported, ${skipped} skipped (FIPL Code not found)`
          : `${added} attendance record${added === 1 ? "" : "s"} imported`;
      toast.success(attMsg);
      setAttStep("done");
    } catch (err) {
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setAttImporting(false);
    }
  };

  const handleSwotImport = async () => {
    const valid = swotRows.filter((r) => !r.error);
    if (valid.length === 0) return;
    setSwotImporting(true);
    let updated = 0;
    let skipped = 0;
    try {
      for (const row of valid) {
        const emp = fiplMap.get(row.fiplCode.toUpperCase());
        if (!emp) {
          skipped++;
          continue;
        }
        // Fetch existing performance so we don't overwrite it
        let existingPerf = {
          salesInfluenceIndex: 0n,
          reviewCount: 0n,
          operationalDiscipline: 0n,
          productKnowledgeScore: 0n,
          softSkillsScore: 0n,
        };
        try {
          if (actor) {
            const details = await actor.getEmployeeDetails(emp.id);
            existingPerf = {
              salesInfluenceIndex: details.performance.salesInfluenceIndex,
              reviewCount: details.performance.reviewCount,
              operationalDiscipline: details.performance.operationalDiscipline,
              productKnowledgeScore: details.performance.productKnowledgeScore,
              softSkillsScore: details.performance.softSkillsScore,
            };
          }
        } catch {
          /* use zero fallback if fetch fails */
        }

        await updateEmployee.mutateAsync({
          id: emp.id,
          input: {
            employeeInfo: {
              fiplCode: emp.fiplCode,
              fseCategory: emp.fseCategory,
              name: emp.name,
              role: emp.role,
              department: emp.department,
              status: emp.status,
              joinDate: emp.joinDate,
              avatar: emp.avatar,
              region: emp.region,
              familyDetails: emp.familyDetails,
              pastExperience: emp.pastExperience,
            },
            performance: existingPerf,
            swotAnalysis: {
              strengths: row.swotStrengths,
              weaknesses: row.swotWeaknesses,
              opportunities: row.swotOpportunities,
              threats: row.swotThreats,
            },
            traits: row.traits,
            problems: row.problems,
          },
        });
        updated++;
      }
      const msg =
        skipped > 0
          ? `${updated} updated, ${skipped} skipped (FIPL Code not found in system)`
          : `${updated} employee${updated === 1 ? "" : "s"} SWOT data updated`;
      toast.success(msg);
      setSwotStep("done");
    } catch (err) {
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setSwotImporting(false);
    }
  };

  const handleSalesImport = async () => {
    const valid = salesRows.filter((r) => !r.error);
    if (valid.length === 0) return;
    setSalesImporting(true);
    let added = 0;
    let skipped = 0;
    try {
      // Sequential processing to avoid overwhelming the IC canister
      for (const row of valid) {
        const emp = fiplMap.get(row.fiplCode.toUpperCase());
        if (!emp) {
          skipped++;
          continue;
        }
        await addSalesRecord.mutateAsync({
          employeeId: emp.id,
          fiplCode: row.fiplCode,
          accessories: 0n,
          extendedWarranty: 0n,
          totalSalesAmount: BigInt(Math.round(row.amountOfSale)),
        });
        added++;
      }
      const salesMsg =
        skipped > 0
          ? `${added} records imported, ${skipped} skipped (FIPL Code not found in system -- upload Employee Data first)`
          : `${added} sales record${added === 1 ? "" : "s"} imported`;
      toast.success(salesMsg);
      setSalesStep("done");
    } catch (err) {
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setSalesImporting(false);
    }
  };

  // ── Row renderers ────────────────────────────────────────────────────────

  const renderEmpRow = (row: ParsedEmployeeRow) => (
    <>
      <TableCell className="font-mono text-[10px]">{row.fiplCode}</TableCell>
      <TableCell>{row.name}</TableCell>
      <TableCell className="text-muted-foreground">{row.role}</TableCell>
      <TableCell className="text-muted-foreground">{row.department}</TableCell>
      <TableCell className="text-muted-foreground">{row.region}</TableCell>
    </>
  );

  const renderParamsRow = (row: ParsedParamsRow) => (
    <>
      <TableCell className="font-mono text-[10px]">{row.fiplCode}</TableCell>
      <TableCell>{row.salesInfluenceIndex}</TableCell>
      <TableCell>{row.reviewCount}</TableCell>
      <TableCell>{row.operationalDiscipline}</TableCell>
      <TableCell>{row.productKnowledgeScore}</TableCell>
      <TableCell>{row.softSkillsScore}</TableCell>
    </>
  );

  const renderAttRow = (row: ParsedAttendanceRow) => (
    <>
      <TableCell className="font-mono text-[10px]">{row.fiplCode}</TableCell>
      <TableCell>{row.date}</TableCell>
      <TableCell className="text-muted-foreground">
        {row.lapseType || "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {row.daysOff > 0 ? `${row.daysOff} day(s)` : "—"}
      </TableCell>
    </>
  );

  const renderSwotRow = (row: ParsedSwotRow) => (
    <>
      <TableCell className="font-mono text-[10px]">{row.fiplCode}</TableCell>
      <TableCell className="text-muted-foreground max-w-[120px] truncate">
        {row.swotStrengths.slice(0, 2).join(", ") || "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {row.traits.length} traits
      </TableCell>
      <TableCell className="text-muted-foreground">
        {row.problems.length} problems
      </TableCell>
    </>
  );

  const renderSalesRow = (row: ParsedSalesRow) => (
    <>
      <TableCell className="font-mono text-[10px]">{row.fiplCode}</TableCell>
      <TableCell>{row.name || "—"}</TableCell>
      <TableCell className="text-muted-foreground">
        {row.region || "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">{row.date}</TableCell>
      <TableCell className="font-mono-data">
        ₹{row.amountOfSale.toLocaleString()}
      </TableCell>
    </>
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold mb-1">
          Data Management
        </p>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Uploads
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload data for each section separately — Employee Data, Parameters,
          Attendance, SWOT Analysis, and Sales.
        </p>
      </div>

      <Tabs defaultValue="employee" className="space-y-6">
        <TabsList
          className="grid grid-cols-5 w-full h-auto p-1 bg-muted/40 border border-border/50 rounded-xl gap-1"
          data-ocid="uploads.tab"
        >
          <TabsTrigger
            value="employee"
            className="flex flex-col items-center gap-1 py-2.5 px-2 text-[11px] font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary"
            data-ocid="uploads.tab"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:block">Employee Data</span>
            <span className="sm:hidden">Emp.</span>
          </TabsTrigger>
          <TabsTrigger
            value="parameters"
            className="flex flex-col items-center gap-1 py-2.5 px-2 text-[11px] font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary"
            data-ocid="uploads.tab"
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:block">Parameters</span>
            <span className="sm:hidden">Params</span>
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="flex flex-col items-center gap-1 py-2.5 px-2 text-[11px] font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary"
            data-ocid="uploads.tab"
          >
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:block">Attendance</span>
            <span className="sm:hidden">Att.</span>
          </TabsTrigger>
          <TabsTrigger
            value="swot"
            className="flex flex-col items-center gap-1 py-2.5 px-2 text-[11px] font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary"
            data-ocid="uploads.tab"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:block">SWOT Analysis</span>
            <span className="sm:hidden">SWOT</span>
          </TabsTrigger>
          <TabsTrigger
            value="sales"
            className="flex flex-col items-center gap-1 py-2.5 px-2 text-[11px] font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary"
            data-ocid="uploads.tab"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:block">Sales Data</span>
            <span className="sm:hidden">Sales</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Employee Data Tab ─────────────────────────────────────────── */}
        <TabsContent value="employee">
          <div className="glass-card rounded-xl p-6">
            <UploadTabPanel
              tabId="employee"
              title="Employee Data"
              description="Upload core employee identity: FIPL Code (Primary Key), Name, Role, Department, FSE Category, Status, Joining Date, Avatar, Region, Family Details, and Past Experience."
              columns={["FIPL Code", "Name", "Role", "Department", "Region"]}
              rows={empRows}
              renderRow={renderEmpRow}
              step={empStep}
              isImporting={empImporting}
              onFileSelect={handleEmpFile}
              onConfirm={handleEmpImport}
              onReset={() => {
                setEmpStep("idle");
                setEmpRows([]);
              }}
              onDownloadTemplate={downloadEmployeeTemplate}
              accentClass="bg-primary/10 text-primary border-primary/20"
            />
          </div>
        </TabsContent>

        {/* ── Parameters Tab ────────────────────────────────────────────── */}
        <TabsContent value="parameters">
          <div className="glass-card rounded-xl p-6">
            <UploadTabPanel
              tabId="parameters"
              title="FSE Parameters"
              description="Upload performance scores and metrics linked by FIPL Code: Sales Influence Index, Review Count, Operational Discipline, Product Knowledge Score, Soft Skills Score, and visit metrics."
              columns={[
                "FIPL Code",
                "Sales Index",
                "Review Count",
                "Op. Discipline",
                "Product Know.",
                "Soft Skills",
              ]}
              rows={paramsRows}
              renderRow={renderParamsRow}
              step={paramsStep}
              isImporting={paramsImporting}
              onFileSelect={handleParamsFile}
              onConfirm={handleParamsImport}
              onReset={() => {
                setParamsStep("idle");
                setParamsRows([]);
              }}
              onDownloadTemplate={downloadParamsTemplate}
              accentClass="bg-[oklch(0.93_0.04_145_/_0.5)] text-[oklch(0.35_0.14_145)] border-[oklch(0.65_0.12_145_/_0.3)]"
            />
            {paramsStep === "idle" && (
              <div className="mt-5 p-4 rounded-lg bg-[oklch(0.97_0.02_145_/_0.4)] border border-[oklch(0.75_0.1_145_/_0.3)]">
                <p className="text-xs font-semibold text-[oklch(0.35_0.14_145)] mb-1">
                  Important
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Employees must already exist in the system before uploading
                  parameters. FIPL Code is used to match and update the correct
                  employee record.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Attendance Tab ────────────────────────────────────────────── */}
        <TabsContent value="attendance">
          <div className="glass-card rounded-xl p-6">
            <UploadTabPanel
              tabId="attendance"
              title="Attendance Records"
              description="Upload attendance data linked by FIPL Code: Date, Lapse Type (Late Attendance / Missing / Other), Lapse Reason, Days Taken Off, and Days Off Reason."
              columns={["FIPL Code", "Date", "Lapse Type", "Days Off"]}
              rows={attRows}
              renderRow={renderAttRow}
              step={attStep}
              isImporting={attImporting}
              onFileSelect={handleAttFile}
              onConfirm={handleAttImport}
              onReset={() => {
                setAttStep("idle");
                setAttRows([]);
              }}
              onDownloadTemplate={downloadAttendanceTemplate}
              accentClass="bg-[oklch(0.93_0.04_240_/_0.5)] text-[oklch(0.35_0.14_240)] border-[oklch(0.65_0.12_240_/_0.3)]"
            />
            {attStep === "idle" && (
              <div className="mt-5 p-4 rounded-lg bg-[oklch(0.97_0.02_240_/_0.4)] border border-[oklch(0.75_0.1_240_/_0.3)]">
                <p className="text-xs font-semibold text-[oklch(0.35_0.14_240)] mb-1">
                  One row per event
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Each row represents one attendance event (a lapse or a day
                  off). Multiple rows can reference the same FIPL Code and date.
                  Employees must exist before uploading attendance.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── SWOT Analysis Tab ─────────────────────────────────────────── */}
        <TabsContent value="swot">
          <div className="glass-card rounded-xl p-6">
            <UploadTabPanel
              tabId="swot"
              title="SWOT Analysis"
              description="Upload SWOT data, traits, problems, and feedback linked by FIPL Code. Values in each SWOT column are semicolon-separated."
              columns={[
                "FIPL Code",
                "Strengths (preview)",
                "Traits",
                "Problems",
              ]}
              rows={swotRows}
              renderRow={renderSwotRow}
              step={swotStep}
              isImporting={swotImporting}
              onFileSelect={handleSwotFile}
              onConfirm={handleSwotImport}
              onReset={() => {
                setSwotStep("idle");
                setSwotRows([]);
              }}
              onDownloadTemplate={downloadSwotTemplate}
              accentClass="bg-[oklch(0.95_0.04_25_/_0.5)] text-[oklch(0.42_0.18_25)] border-[oklch(0.65_0.14_25_/_0.3)]"
            />
            {swotStep === "idle" && (
              <div className="mt-5 p-4 rounded-lg bg-[oklch(0.97_0.02_25_/_0.3)] border border-[oklch(0.75_0.1_25_/_0.2)]">
                <p className="text-xs font-semibold text-[oklch(0.40_0.18_25)] mb-1">
                  Note on SWOT import
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Uploading SWOT data will overwrite existing SWOT, traits, and
                  problems for matched employees. Separate multiple values with
                  semicolons (;) in each column.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Sales Data Tab ────────────────────────────────────────────── */}
        <TabsContent value="sales">
          <div className="glass-card rounded-xl p-6">
            <UploadTabPanel
              tabId="sales"
              title="Sales Data"
              description="Upload individual sales records linked by FIPL Code. Name and Region are auto-filled from the FIPL Code. Each row is one sale event."
              columns={["FIPL Code", "Name", "Region", "Date", "Amount (₹)"]}
              rows={salesRows}
              renderRow={renderSalesRow}
              step={salesStep}
              isImporting={salesImporting}
              onFileSelect={handleSalesFile}
              onConfirm={handleSalesImport}
              onReset={() => {
                setSalesStep("idle");
                setSalesRows([]);
              }}
              onDownloadTemplate={downloadSalesTemplate}
              accentClass="bg-[oklch(0.93_0.04_85_/_0.5)] text-[oklch(0.38_0.14_85)] border-[oklch(0.65_0.12_85_/_0.3)]"
            />
            {salesStep === "idle" && (
              <div className="mt-5 p-4 rounded-lg bg-[oklch(0.97_0.03_85_/_0.3)] border border-[oklch(0.75_0.1_85_/_0.3)]">
                <p className="text-xs font-semibold text-[oklch(0.35_0.14_85)] mb-1">
                  Auto-fill from FIPL Code
                </p>
                <p className="text-[11px] text-muted-foreground">
                  The Name and Region columns in the template are for reference
                  only — they will be automatically resolved from the FIPL Code
                  when importing. Each row represents one sale event on a
                  specific date.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
