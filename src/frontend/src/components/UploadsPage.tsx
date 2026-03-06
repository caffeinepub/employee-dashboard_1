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
import { loadXlsx } from "@/lib/xlsxLoader";
import { useQueryClient } from "@tanstack/react-query";
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
import { SaleType, SalesBrand, Status } from "../backend";
import type {
  AttendanceRecordInput,
  Employee,
  EmployeeFullInput,
  PerformanceInput,
  SalesRecordInput as SalesRecordInputType,
  SwotBatchInput,
} from "../backend.d.ts";
import { useActor } from "../hooks/useActor";
import { useAllEmployees } from "../hooks/useQueries";

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
  brand: string;
  product: string;
  saleType: string;
  date: string;
  quantity: number;
  amount: number;
  error?: string;
}

// ── XLSX types (resolved at runtime via xlsxLoader) ──────────────────────────
import type { XlsxLib, XlsxWorkBook } from "@/lib/xlsxLoader";

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

function parseXlsxDate(raw: string, xlsx?: XlsxLib): string {
  if (!raw) return raw;
  const serial = Number(raw);
  if (!Number.isNaN(serial) && serial > 1000 && xlsx?.SSF?.parse_date_code) {
    const jsDate = xlsx.SSF.parse_date_code(serial);
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
function findSheet(wb: XlsxWorkBook, ...targets: string[]): string | undefined {
  return wb.SheetNames.find((n: string) => {
    const key = n.toLowerCase().replace(/[^a-z0-9]/g, "");
    return targets.some(
      (t) => key === t.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );
  });
}

// ── Sheet parsers ────────────────────────────────────────────────────────────

function parseEmployeeSheetStandalone(
  wb: XlsxWorkBook,
  xlsx: XlsxLib,
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
  const raw = xlsx.utils.sheet_to_json(ws, {
    defval: "",
  }) as Record<string, unknown>[];
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
  wb: XlsxWorkBook,
  xlsx: XlsxLib,
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
  const raw = xlsx.utils.sheet_to_json(ws, {
    defval: "",
  }) as Record<string, unknown>[];
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
  wb: XlsxWorkBook,
  xlsx: XlsxLib,
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
  const raw = xlsx.utils.sheet_to_json(ws, {
    defval: "",
  }) as Record<string, unknown>[];
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
        xlsx,
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

function parseSwotSheetStandalone(
  wb: XlsxWorkBook,
  xlsx: XlsxLib,
): ParsedSwotRow[] | null {
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
  const raw = xlsx.utils.sheet_to_json(ws, {
    defval: "",
  }) as Record<string, unknown>[];
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

function parseSalesSheetStandalone(
  wb: XlsxWorkBook,
  xlsx: XlsxLib,
): ParsedSalesRow[] | null {
  const sheetName = findSheet(wb, "Sales Data", "SalesData", "Sales", "Sheet5");
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const raw = xlsx.utils.sheet_to_json(ws, {
    defval: "",
  }) as Record<string, unknown>[];
  return raw.map((r) => {
    const norm = normaliseKeys(r);
    // Strip currency symbols and commas from numeric strings
    const cleanNumber = (raw: string) =>
      Number(raw.replace(/[₹,\s]/g, "")) || 0;
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
        "Name (auto-filled)",
        "Name (auto-filled from FIPL Code)",
        "Name",
        "Employee Name",
        "name",
      ),
      region: pick(
        norm,
        "Region (auto-filled)",
        "Region (auto-filled from FIPL Code)",
        "Region",
        "region",
      ),
      brand: pick(
        norm,
        "Brand (Ecovacs / Kuvings / Coway / Tineco / Instant)*",
        "Brand",
        "brand",
      ),
      product: pick(norm, "Product*", "Product", "product"),
      saleType: pick(
        norm,
        "Type (Accessories / Extended Warranty)*",
        "Type",
        "saleType",
        "SaleType",
        "saletype",
      ),
      date: parseXlsxDate(
        pick(norm, "Date (YYYY-MM-DD)*", "Date (YYYY-MM-DD)", "Date", "date"),
        xlsx,
      ),
      quantity: Number(pick(norm, "Quantity*", "Quantity", "quantity")) || 0,
      amount: cleanNumber(
        pick(norm, "Amount (₹)*", "Amount", "amount", "AmountRs", "amountrs"),
      ),
    };
    if (!row.fiplCode) row.error = "FIPL Code is required";
    else if (!row.date) row.error = "Date is required";
    else if (row.amount <= 0) row.error = "Amount must be > 0";
    return row;
  });
}

// ── Template downloaders ─────────────────────────────────────────────────────

async function downloadEmployeeTemplate() {
  const XLSX = await loadXlsx();
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

async function downloadParamsTemplate() {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  const headers = [
    "FIPL Code (Primary Key)*",
    "Sales Influence Index (0-100)",
    "Review Count",
    "Operational Discipline (0-100)",
    "Product Knowledge Score (0-100)",
    "Soft Skill Score (0-100)",
    "Total Demo Visits",
    "Total Complaint Visits",
    "Total Video Call Demos",
  ];
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    ["FIPL-001", 88, 24, 91, 85, 78, 15, 4, 8],
    ["FIPL-002", 95, 31, 78, 72, 88, 22, 6, 11],
  ]);
  ws["!cols"] = [
    { wch: 22 },
    { wch: 30 },
    { wch: 18 },
    { wch: 30 },
    { wch: 30 },
    { wch: 24 },
    { wch: 22 },
    { wch: 26 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "FSE Parameters");
  XLSX.writeFile(wb, "FSE-parameters-template.xlsx");
}

async function downloadAttendanceTemplate() {
  const XLSX = await loadXlsx();
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

async function downloadSwotTemplate() {
  const XLSX = await loadXlsx();
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

async function downloadSalesTemplate() {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  const headers = [
    "FIPL Code (Primary Key)*",
    "Name (auto-filled)",
    "Region (auto-filled)",
    "Brand (Ecovacs / Kuvings / Coway / Tineco / Instant)*",
    "Product*",
    "Type (Accessories / Extended Warranty)*",
    "Date (YYYY-MM-DD)*",
    "Quantity*",
    "Amount (₹)*",
  ];
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    [
      "FIPL-001",
      "Priya Sharma",
      "North India",
      "Ecovacs",
      "Ecovacs X2 PRO",
      "Accessories",
      "2026-03-01",
      2,
      15000,
    ],
    [
      "FIPL-001",
      "Priya Sharma",
      "North India",
      "Kuvings",
      "Kuvings REVO830",
      "Extended Warranty",
      "2026-03-05",
      1,
      8000,
    ],
  ]);
  ws["!cols"] = [
    { wch: 24 },
    { wch: 22 },
    { wch: 18 },
    { wch: 38 },
    { wch: 26 },
    { wch: 34 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
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
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { data: existingEmployees = [] } = useAllEmployees();

  // FIPL Code -> Employee lookup
  const fiplMap = new Map<string, Employee>(
    existingEmployees.map((e) => [e.fiplCode.toUpperCase(), e]),
  );

  // ── File handlers ────────────────────────────────────────────────────────

  function readWorkbook(
    file: File,
    onParsed: (wb: XlsxWorkBook, xlsx: XlsxLib) => void,
  ) {
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

    loadXlsx()
      .then((XLSX) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (!result) return;
          const data = isXlsx
            ? new Uint8Array(result as ArrayBuffer)
            : new TextEncoder().encode(result as string);
          const wb = XLSX.read(data, { type: "array" });
          onParsed(wb, XLSX);
        };
        if (isXlsx) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file);
        }
      })
      .catch((err) => {
        toast.error(`Failed to load Excel library: ${err.message}`);
      });
  }

  const handleEmpFile = (file: File) => {
    readWorkbook(file, (wb, xlsx) => {
      const rows = parseEmployeeSheetStandalone(wb, xlsx);
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
    readWorkbook(file, (wb, xlsx) => {
      const rows = parseParamsSheetStandalone(wb, xlsx);
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
      // Validate FIPL Codes against existing employees
      const enriched = rows.map((r) => {
        if (r.error) return r;
        if (!fiplMap.has(r.fiplCode.toUpperCase())) {
          return {
            ...r,
            error: `FIPL Code "${r.fiplCode}" not found in system -- upload Employee Data first`,
          };
        }
        return r;
      });
      setParamsRows(enriched);
      setParamsStep("preview");
    });
  };

  const handleAttFile = (file: File) => {
    readWorkbook(file, (wb, xlsx) => {
      const rows = parseAttendanceSheetStandalone(wb, xlsx);
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
      // Validate FIPL Codes against existing employees
      const enriched = rows.map((r) => {
        if (r.error) return r;
        if (!fiplMap.has(r.fiplCode.toUpperCase())) {
          return {
            ...r,
            error: `FIPL Code "${r.fiplCode}" not found in system -- upload Employee Data first`,
          };
        }
        return r;
      });
      setAttRows(enriched);
      setAttStep("preview");
    });
  };

  const handleSwotFile = (file: File) => {
    readWorkbook(file, (wb, xlsx) => {
      const rows = parseSwotSheetStandalone(wb, xlsx);
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
      // Validate FIPL Codes against existing employees
      const enriched = rows.map((r) => {
        if (r.error) return r;
        if (!fiplMap.has(r.fiplCode.toUpperCase())) {
          return {
            ...r,
            error: `FIPL Code "${r.fiplCode}" not found in system -- upload Employee Data first`,
          };
        }
        return r;
      });
      setSwotRows(enriched);
      setSwotStep("preview");
    });
  };

  const handleSalesFile = (file: File) => {
    readWorkbook(file, (wb, xlsx) => {
      const rows = parseSalesSheetStandalone(wb, xlsx);
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
      // Auto-fill name/region from FIPL lookup; flag rows with unknown FIPL Codes
      const enriched = rows.map((r) => {
        if (r.error) return r; // already has a parse error, keep it
        const emp = fiplMap.get(r.fiplCode.toUpperCase());
        if (!emp) {
          return {
            ...r,
            error: `FIPL Code "${r.fiplCode}" not found in system -- upload Employee Data first`,
          };
        }
        return {
          ...r,
          name: emp.name,
          region: emp.region,
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
    if (!actor) {
      toast.error("Backend not ready. Please wait a moment and try again.");
      return;
    }
    setEmpImporting(true);
    const toastId = toast.loading(`Importing employees: 0/${valid.length}...`);
    try {
      // Always fetch fresh list so we have the latest FIPL codes
      const freshEmployees = await actor.getAllEmployees();
      const freshFiplMap = new Set<string>(
        freshEmployees.map((e) => e.fiplCode.toUpperCase()),
      );

      const emptyPerf: PerformanceInput = {
        salesInfluenceIndex: 0n,
        reviewCount: 0n,
        operationalDiscipline: 0n,
        productKnowledgeScore: 0n,
        softSkillsScore: 0n,
      };
      const emptySwot = {
        strengths: [] as string[],
        weaknesses: [] as string[],
        opportunities: [] as string[],
        threats: [] as string[],
      };

      // Build full batch payload
      const batchInputs: EmployeeFullInput[] = valid.map((row) => {
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
          employeeInfo: {
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
          },
          performance: emptyPerf,
          swotAnalysis: emptySwot,
          traits: [],
          problems: [],
        };
      });

      // Send in chunks of 25 to stay within IC message size limits
      const CHUNK_SIZE = 25;
      let totalAdded = 0;
      let totalUpdated = 0;

      for (let i = 0; i < batchInputs.length; i += CHUNK_SIZE) {
        const chunk = batchInputs.slice(i, i + CHUNK_SIZE);
        const processed = Math.min(i + CHUNK_SIZE, batchInputs.length);
        toast.loading(`Importing employees: ${processed}/${valid.length}...`, {
          id: toastId,
        });
        const results = await actor.upsertEmployeesBatch(chunk);
        for (const [fiplCode] of results) {
          if (freshFiplMap.has(fiplCode.toUpperCase())) {
            totalUpdated++;
          } else {
            totalAdded++;
          }
        }
        if (i + CHUNK_SIZE < batchInputs.length)
          await new Promise((r) => setTimeout(r, 200));
      }

      await queryClient.invalidateQueries();
      const msg = [
        totalAdded > 0 ? `${totalAdded} added` : "",
        totalUpdated > 0 ? `${totalUpdated} updated` : "",
      ]
        .filter(Boolean)
        .join(", ");
      toast.success(`Employee import complete: ${msg || "0 processed"}`, {
        id: toastId,
      });
      setEmpStep("done");
    } catch (err) {
      console.error("Employee import error:", err);
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
        { id: toastId },
      );
    } finally {
      setEmpImporting(false);
    }
  };

  const handleParamsImport = async () => {
    const valid = paramsRows.filter((r) => !r.error);
    if (valid.length === 0) return;
    if (!actor) {
      toast.error("Backend not ready. Please wait a moment and try again.");
      return;
    }
    setParamsImporting(true);
    const toastId = toast.loading(`Importing parameters: 0/${valid.length}...`);
    try {
      const freshEmployees = await actor.getAllEmployees();
      const freshFiplMap = new Set<string>(
        freshEmployees.map((e) => e.fiplCode.toUpperCase()),
      );

      // Build batch payload — skip rows whose FIPL code isn't in the system
      let skipped = 0;
      const batchInputs: Array<[string, PerformanceInput]> = [];
      for (const row of valid) {
        if (!freshFiplMap.has(row.fiplCode.toUpperCase())) {
          skipped++;
          continue;
        }
        batchInputs.push([
          row.fiplCode,
          {
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
        ]);
      }

      if (batchInputs.length === 0) {
        toast.error(
          "No matching FIPL Codes found. Upload Employee Data first.",
          { id: toastId },
        );
        setParamsImporting(false);
        return;
      }

      // Send in chunks of 50
      const CHUNK_SIZE = 50;
      let totalUpdated = 0;
      for (let i = 0; i < batchInputs.length; i += CHUNK_SIZE) {
        const chunk = batchInputs.slice(i, i + CHUNK_SIZE);
        const processed = Math.min(i + CHUNK_SIZE, batchInputs.length);
        toast.loading(
          `Importing parameters: ${processed}/${batchInputs.length}...`,
          {
            id: toastId,
          },
        );
        const count = await actor.updatePerformanceBatch(chunk);
        totalUpdated += Number(count);
        if (i + CHUNK_SIZE < batchInputs.length)
          await new Promise((r) => setTimeout(r, 200));
      }

      await queryClient.invalidateQueries();
      toast.success(
        skipped > 0
          ? `${totalUpdated} updated, ${skipped} skipped (FIPL Code not found in system)`
          : `${totalUpdated} employee${totalUpdated === 1 ? "" : "s"} parameters updated`,
        { id: toastId },
      );
      setParamsStep("done");
    } catch (err) {
      console.error("Params import error:", err);
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
        { id: toastId },
      );
    } finally {
      setParamsImporting(false);
    }
  };

  const handleAttImport = async () => {
    const valid = attRows.filter((r) => !r.error);
    if (valid.length === 0) return;
    if (!actor) {
      toast.error("Backend not ready. Please wait a moment and try again.");
      return;
    }
    setAttImporting(true);
    const toastId = toast.loading(`Importing attendance: 0/${valid.length}...`);
    try {
      const freshEmployees = await actor.getAllEmployees();
      const freshFiplMap = new Map<string, Employee>(
        freshEmployees.map((e) => [e.fiplCode.toUpperCase(), e]),
      );

      // Build full batch payload — one or two records per row depending on lapse + daysOff
      let skipped = 0;
      const batchInputs: AttendanceRecordInput[] = [];
      for (const row of valid) {
        const emp = freshFiplMap.get(row.fiplCode.toUpperCase());
        if (!emp) {
          skipped++;
          continue;
        }
        const dateMs = row.date ? new Date(row.date).getTime() : Date.now();
        const dateNs =
          BigInt(Number.isNaN(dateMs) ? Date.now() : dateMs) * 1_000_000n;

        if (row.lapseType) {
          batchInputs.push({
            employeeId: emp.id,
            lapseType: row.lapseType,
            date: dateNs,
            reason: row.lapseReason,
            daysOff: 0n,
          });
        }
        if (row.daysOff > 0) {
          batchInputs.push({
            employeeId: emp.id,
            lapseType: "Day Off",
            date: dateNs,
            reason: row.daysOffReason,
            daysOff: BigInt(row.daysOff),
          });
        }
      }

      if (batchInputs.length === 0) {
        toast.error(
          skipped > 0
            ? "All rows skipped: FIPL Codes not found. Upload Employee Data first."
            : "No attendance records to import.",
          { id: toastId },
        );
        setAttImporting(false);
        return;
      }

      // Send in chunks of 50
      const CHUNK_SIZE = 50;
      let totalAdded = 0;
      for (let i = 0; i < batchInputs.length; i += CHUNK_SIZE) {
        const chunk = batchInputs.slice(i, i + CHUNK_SIZE);
        const processed = Math.min(i + CHUNK_SIZE, batchInputs.length);
        toast.loading(
          `Importing attendance: ${processed}/${batchInputs.length}...`,
          {
            id: toastId,
          },
        );
        const ids = await actor.addAttendanceRecordsBatch(chunk);
        totalAdded += ids.length;
        if (i + CHUNK_SIZE < batchInputs.length)
          await new Promise((r) => setTimeout(r, 200));
      }

      await queryClient.invalidateQueries();
      toast.success(
        skipped > 0
          ? `${totalAdded} records imported, ${skipped} rows skipped (FIPL Code not found -- upload Employee Data first)`
          : `${totalAdded} attendance record${totalAdded === 1 ? "" : "s"} imported`,
        { id: toastId },
      );
      setAttStep("done");
    } catch (err) {
      console.error("Attendance import error:", err);
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
        { id: toastId },
      );
    } finally {
      setAttImporting(false);
    }
  };

  const handleSwotImport = async () => {
    const valid = swotRows.filter((r) => !r.error);
    if (valid.length === 0) return;
    if (!actor) {
      toast.error("Backend not ready. Please wait a moment and try again.");
      return;
    }
    setSwotImporting(true);
    const toastId = toast.loading(`Importing SWOT: 0/${valid.length}...`);
    try {
      const freshEmployees = await actor.getAllEmployees();
      const freshFiplMap = new Set<string>(
        freshEmployees.map((e) => e.fiplCode.toUpperCase()),
      );

      // Build batch payload — skip rows whose FIPL code isn't in the system
      let skipped = 0;
      const batchInputs: SwotBatchInput[] = [];
      for (const row of valid) {
        if (!freshFiplMap.has(row.fiplCode.toUpperCase())) {
          skipped++;
          continue;
        }
        batchInputs.push({
          fiplCode: row.fiplCode,
          swot: {
            strengths: row.swotStrengths,
            weaknesses: row.swotWeaknesses,
            opportunities: row.swotOpportunities,
            threats: row.swotThreats,
          },
          traits: row.traits,
          problems: row.problems,
        });
      }

      if (batchInputs.length === 0) {
        toast.error(
          "No matching FIPL Codes found. Upload Employee Data first.",
          { id: toastId },
        );
        setSwotImporting(false);
        return;
      }

      // Send in chunks of 25
      const CHUNK_SIZE = 25;
      let totalUpdated = 0;
      for (let i = 0; i < batchInputs.length; i += CHUNK_SIZE) {
        const chunk = batchInputs.slice(i, i + CHUNK_SIZE);
        const processed = Math.min(i + CHUNK_SIZE, batchInputs.length);
        toast.loading(`Importing SWOT: ${processed}/${batchInputs.length}...`, {
          id: toastId,
        });
        const count = await actor.updateSwotBatch(chunk);
        totalUpdated += Number(count);
        if (i + CHUNK_SIZE < batchInputs.length)
          await new Promise((r) => setTimeout(r, 200));
      }

      await queryClient.invalidateQueries();
      toast.success(
        skipped > 0
          ? `${totalUpdated} updated, ${skipped} skipped (FIPL Code not found in system)`
          : `${totalUpdated} employee${totalUpdated === 1 ? "" : "s"} SWOT data updated`,
        { id: toastId },
      );
      setSwotStep("done");
    } catch (err) {
      console.error("SWOT import error:", err);
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
        { id: toastId },
      );
    } finally {
      setSwotImporting(false);
    }
  };

  const handleSalesImport = async () => {
    const valid = salesRows.filter((r) => !r.error);
    if (valid.length === 0) return;
    if (!actor) {
      toast.error("Backend not ready. Please wait a moment and try again.");
      return;
    }

    function mapBrand(raw: string): SalesBrand {
      const s = raw.toLowerCase().trim();
      if (s === "ecovacs") return SalesBrand.ecovacs;
      if (s === "kuvings") return SalesBrand.kuvings;
      if (s === "coway") return SalesBrand.coway;
      if (s === "tineco") return SalesBrand.tineco;
      if (s === "instant") return SalesBrand.instant;
      return SalesBrand.ecovacs;
    }

    function mapSaleType(raw: string): SaleType {
      const s = raw.toLowerCase().replace(/\s+/g, "");
      if (s === "extendedwarranty" || s === "warranty")
        return SaleType.extendedWarranty;
      return SaleType.accessories;
    }

    setSalesImporting(true);
    let skipped = 0;
    const toastId = toast.loading("Preparing sales data...");
    try {
      const freshEmployees = await actor.getAllEmployees();
      const freshFiplMap = new Map<string, Employee>(
        freshEmployees.map((e) => [e.fiplCode.toUpperCase(), e]),
      );

      // Build batch payload — skip rows whose FIPL code isn't in the system
      const batchInputs: SalesRecordInputType[] = [];
      for (const row of valid) {
        const emp = freshFiplMap.get(row.fiplCode.toUpperCase());
        if (!emp) {
          skipped++;
          continue;
        }
        const dateMs = row.date ? new Date(row.date).getTime() : Date.now();
        const saleDateNs =
          BigInt(Number.isNaN(dateMs) ? Date.now() : dateMs) * 1_000_000n;
        batchInputs.push({
          employeeId: emp.id,
          fiplCode: row.fiplCode,
          brand: mapBrand(row.brand),
          product: row.product,
          saleType: mapSaleType(row.saleType),
          quantity: BigInt(Math.round(row.quantity)),
          amount: BigInt(Math.round(row.amount)),
          saleDate: saleDateNs,
        });
      }

      if (batchInputs.length === 0) {
        toast.error(
          "No valid rows to import. Make sure FIPL Codes exist in the system first.",
          { id: toastId },
        );
        setSalesImporting(false);
        return;
      }

      toast.loading(
        `Uploading ${batchInputs.length} sales records in one batch...`,
        { id: toastId },
      );

      // Single canister call for all rows — much faster than one-by-one
      const CHUNK_SIZE = 50; // Stay well within IC message size limits
      let totalAdded = 0;
      for (let i = 0; i < batchInputs.length; i += CHUNK_SIZE) {
        const chunk = batchInputs.slice(i, i + CHUNK_SIZE);
        toast.loading(
          `Uploading sales: ${Math.min(i + CHUNK_SIZE, batchInputs.length)}/${batchInputs.length}...`,
          { id: toastId },
        );
        const ids = await actor.addSalesRecordsBatch(chunk);
        totalAdded += ids.length;
        // Small pause between chunks only if there are multiple chunks
        if (i + CHUNK_SIZE < batchInputs.length)
          await new Promise((r) => setTimeout(r, 200));
      }

      await queryClient.invalidateQueries();
      toast.success(
        skipped > 0
          ? `${totalAdded} records imported, ${skipped} skipped (FIPL Code not found -- upload Employee Data first)`
          : `${totalAdded} sales record${totalAdded === 1 ? "" : "s"} imported`,
        { id: toastId },
      );
      setSalesStep("done");
    } catch (err) {
      console.error("Sales import error:", err);
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
        { id: toastId },
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
      <TableCell className="text-muted-foreground capitalize">
        {row.brand || "—"}
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[120px] truncate">
        {row.product || "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {row.saleType === "extendedwarranty" ||
        row.saleType.toLowerCase().replace(/\s+/g, "") === "extendedwarranty"
          ? "Ext. Warranty"
          : "Accessories"}
      </TableCell>
      <TableCell className="text-muted-foreground">{row.date}</TableCell>
      <TableCell className="font-mono text-xs">{row.quantity}</TableCell>
      <TableCell className="font-mono-data">
        ₹{row.amount.toLocaleString()}
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
            {empStep === "done" && (
              <div className="mt-5 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-semibold text-blue-700 mb-1">
                  Next steps
                </p>
                <p className="text-[11px] text-blue-600">
                  Give the system a few seconds to sync, then upload Parameters,
                  Attendance, SWOT, and Sales data using the FIPL Codes you just
                  imported.
                </p>
              </div>
            )}
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
              description="Upload individual sales records linked by FIPL Code. Each row is one sale transaction with Brand, Product, Type (Accessories / Extended Warranty), Date, Quantity, and Amount."
              columns={[
                "FIPL Code",
                "Name",
                "Brand",
                "Product",
                "Type",
                "Date",
                "Qty",
                "Amount (₹)",
              ]}
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
                  One row = one sale transaction
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Name and Region are auto-resolved from the FIPL Code. Brand
                  must be one of: Ecovacs, Kuvings, Coway, Tineco, Instant. Type
                  must be "Accessories" or "Extended Warranty". The FIPL Code
                  can appear multiple times (one row per sale).
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
