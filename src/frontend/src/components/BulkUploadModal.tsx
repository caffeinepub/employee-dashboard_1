import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { loadXlsx } from "@/lib/xlsxLoader";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Upload,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Status } from "../backend";
import type { Employee, EmployeeInput } from "../backend.d.ts";
import {
  useAddAttendanceRecord,
  useAddSalesRecord,
  useAllEmployees,
  useBulkAddEmployees,
} from "../hooks/useQueries";

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AttendanceLapse {
  date: string;
  lapseType: string;
  reason: string;
}

interface DayOff {
  date: string;
  reason: string;
}

interface ParsedRow {
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
  // 5 performance parameters
  salesInfluenceIndex: number;
  reviewCount: number;
  operationalDiscipline: number;
  productKnowledgeScore: number;
  softSkillsScore: number;
  // Sales fields
  accessories: number;
  extendedWarranty: number;
  totalSalesAmount: number;
  // Attendance fields
  attendanceLapses: AttendanceLapse[];
  daysOff: DayOff[];
  // Advanced fields (informational — set via Edit Employee after import)
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
  // resolved at import time
  employeeId?: bigint;
  error?: string;
}

/** Parse a date value from Excel: handles serial numbers, DD-MM-YYYY, and ISO formats. */
function parseXlsxDate(raw: string): string {
  if (!raw) return raw;
  // Excel serial number (e.g. 45413)
  const serial = Number(raw);
  if (!Number.isNaN(serial) && serial > 1000 && serial < 200000) {
    const excelEpoch = new Date(1899, 11, 30);
    excelEpoch.setDate(excelEpoch.getDate() + serial);
    const y = excelEpoch.getFullYear();
    const m = String(excelEpoch.getMonth() + 1).padStart(2, "0");
    const d = String(excelEpoch.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // DD-MM-YYYY or DD/MM/YYYY → YYYY-MM-DD
  const ddmmyyyy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return raw;
}

function joinDateToMs(dateStr: string): number {
  if (!dateStr) return Date.now();
  const ms = new Date(parseXlsxDate(dateStr)).getTime();
  return Number.isNaN(ms) ? Date.now() : ms;
}

async function downloadTemplate() {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Employee Details ───────────────────────────────────────────
  const empHeaders = [
    "FIPL Code (Primary Key)*",
    "Name*",
    "Role*",
    "Department*",
    "FSE Category (Cash Cow / Star / Question Mark / Dog)",
    "Status (active / inactive / onhold)",
    "Joining Date (DD-MM-YYYY)",
    "Avatar (initials, e.g. PS)",
    "Region",
    "Family Details",
    "Past Experience (semicolon-separated: Company - Role - Duration)",
  ];

  const empRows = [
    empHeaders,
    [
      "FIPL-001",
      "Priya Sharma",
      "Senior FSE",
      "Sales",
      "Star",
      "active",
      "15-03-2023",
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
      "01-07-2022",
      "RM",
      "West Coast",
      "Single",
      "StartupXYZ - Sales Exec - 2 years",
    ],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(empRows);
  ws1["!cols"] = [
    { wch: 22 }, // FIPL Code
    { wch: 22 }, // Name
    { wch: 22 }, // Role
    { wch: 20 }, // Department
    { wch: 42 }, // FSE Category
    { wch: 30 }, // Status
    { wch: 26 }, // Joining Date
    { wch: 22 }, // Avatar
    { wch: 20 }, // Region
    { wch: 28 }, // Family Details
    { wch: 50 }, // Past Experience
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Employee Details");

  // ── Sheet 2: FSE Parameters ─────────────────────────────────────────────
  const paramsHeaders = [
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

  const paramsRows = [
    paramsHeaders,
    ["FIPL-001", 88, 24, 91, 85, 78, 12, 3, 280000, 15, 4, 8],
    ["FIPL-002", 95, 31, 78, 72, 88, 28, 8, 420000, 22, 6, 11],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(paramsRows);
  ws2["!cols"] = [
    { wch: 22 }, // FIPL Code
    { wch: 30 }, // Sales Influence Index
    { wch: 18 }, // Review Count
    { wch: 30 }, // Operational Discipline
    { wch: 30 }, // Product Knowledge Score
    { wch: 24 }, // Soft Skill Score
    { wch: 20 }, // Accessory Count
    { wch: 26 }, // Extended Warranty Count
    { wch: 26 }, // Total Sales Amount
    { wch: 22 }, // Total Demo Visits
    { wch: 26 }, // Total Complaint Visits
    { wch: 26 }, // Total Video Call Demos
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "FSE Parameters");

  // ── Sheet 3: Attendance ─────────────────────────────────────────────────
  const attendanceHeaders = [
    "FIPL Code (Primary Key)*",
    "Date (YYYY-MM-DD)*",
    "Attendance Lapse Type (Late Attendance / Missing / Other)",
    "Lapse Reason",
    "Days Taken Off (0 or 1)",
    "Days Off Reason",
  ];

  const attendanceRows = [
    attendanceHeaders,
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
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(attendanceRows);
  ws3["!cols"] = [
    { wch: 22 }, // FIPL Code
    { wch: 22 }, // Date
    { wch: 42 }, // Lapse Type
    { wch: 36 }, // Lapse Reason
    { wch: 22 }, // Days Taken Off
    { wch: 30 }, // Days Off Reason
  ];
  XLSX.utils.book_append_sheet(wb, ws3, "Attendance");

  // ── Sheet 4: SWOT Analysis ──────────────────────────────────────────────
  const swotHeaders = [
    "FIPL Code (Primary Key)*",
    "Strengths (semicolon-separated)",
    "Weaknesses (semicolon-separated)",
    "Opportunities (semicolon-separated)",
    "Threats (semicolon-separated)",
    "Traits (semicolon-separated)",
    "Problems (semicolon-separated)",
    "Feedbacks (category|severity|description; separated)",
  ];

  const swotRows = [
    swotHeaders,
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
  ];

  const ws4 = XLSX.utils.aoa_to_sheet(swotRows);
  ws4["!cols"] = [
    { wch: 22 }, // FIPL Code
    { wch: 38 }, // Strengths
    { wch: 38 }, // Weaknesses
    { wch: 38 }, // Opportunities
    { wch: 38 }, // Threats
    { wch: 38 }, // Traits
    { wch: 38 }, // Problems
    { wch: 55 }, // Feedbacks
  ];
  XLSX.utils.book_append_sheet(wb, ws4, "SWOT Analysis");

  // ── Sheet 5: Sales Data ─────────────────────────────────────────────────
  const salesDisplayHeaders = [
    "FIPL Code (Primary Key)*",
    "Name (auto-filled from FIPL Code)",
    "Region (auto-filled from FIPL Code)",
    "Date (YYYY-MM-DD)*",
    "Amount of Sale (₹)*",
  ];

  const salesRows = [
    salesDisplayHeaders,
    ["FIPL-001", "Priya Sharma", "North India", "2026-03-01", 45000],
    ["FIPL-001", "Priya Sharma", "North India", "2026-03-05", 52000],
    ["FIPL-001", "Priya Sharma", "North India", "2026-03-12", 38000],
    ["FIPL-002", "Raj Mehta", "West Coast", "2026-03-01", 72000],
    ["FIPL-002", "Raj Mehta", "West Coast", "2026-03-08", 68000],
    ["FIPL-002", "Raj Mehta", "West Coast", "2026-03-15", 91000],
  ];

  const ws5 = XLSX.utils.aoa_to_sheet(salesRows);
  ws5["!cols"] = [
    { wch: 28 }, // FIPL Code
    { wch: 28 }, // Name
    { wch: 22 }, // Region
    { wch: 20 }, // Date
    { wch: 24 }, // Amount of Sale
  ];
  XLSX.utils.book_append_sheet(wb, ws5, "Sales Data");

  XLSX.writeFile(wb, "FSE-bulk-upload-template.xlsx");
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

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

function parseAttendanceLapses(raw: string): AttendanceLapse[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split("|");
      return {
        date: parts[0]?.trim() ?? "",
        lapseType: parts[1]?.trim() ?? "Late Attendance",
        reason: parts[2]?.trim() ?? "",
      };
    });
}

function parseDaysOff(raw: string): DayOff[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split("|");
      return {
        date: parts[0]?.trim() ?? "",
        reason: parts[1]?.trim() ?? "",
      };
    });
}

function parseCSV(content: string): ParsedRow[] {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0].toLowerCase());

  const fiplCodeIdx = headers.indexOf("fiplcode");
  const nameIdx = headers.indexOf("name");
  const roleIdx = headers.indexOf("role");
  const deptIdx = headers.indexOf("department");
  const fseCategoryIdx = headers.indexOf("fsecategory");
  const statusIdx = headers.indexOf("status");
  const joinIdx = headers.indexOf("joindate");
  const avatarIdx = headers.indexOf("avatar");
  const regionIdx = headers.indexOf("region");
  const familyDetailsIdx = headers.indexOf("familydetails");
  const pastExperienceIdx = headers.indexOf("pastexperience");
  const salesInfluenceIdx = headers.indexOf("salesinfluenceindex");
  const reviewCountIdx = headers.indexOf("reviewcount");
  const operationalDisciplineIdx = headers.indexOf("operationaldiscipline");
  const productKnowledgeIdx = headers.indexOf("productknowledgescore");
  const softSkillsIdx = headers.indexOf("softskillsscore");
  const accessoriesIdx = headers.indexOf("accessories");
  const extendedWarrantyIdx = headers.indexOf("extendedwarranty");
  const totalSalesAmountIdx = headers.indexOf("totalsalesamount");
  const attendanceLapsesIdx = headers.indexOf("attendancelapses");
  const daysOffIdx = headers.indexOf("daysoff");
  const swotStrengthsIdx = headers.indexOf("swotstrengths");
  const swotWeaknessesIdx = headers.indexOf("swotweaknesses");
  const swotOpportunitiesIdx = headers.indexOf("swotopportunities");
  const swotThreatsIdx = headers.indexOf("swotthreats");
  const traitsIdx = headers.indexOf("traits");
  const problemsIdx = headers.indexOf("problems");
  const feedbacksIdx = headers.indexOf("feedbacks");

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const rawPastExp =
      pastExperienceIdx >= 0 ? (cells[pastExperienceIdx] ?? "") : "";
    const row: ParsedRow = {
      fiplCode: fiplCodeIdx >= 0 ? (cells[fiplCodeIdx] ?? "") : "",
      name: nameIdx >= 0 ? (cells[nameIdx] ?? "") : "",
      role: roleIdx >= 0 ? (cells[roleIdx] ?? "") : "",
      department: deptIdx >= 0 ? (cells[deptIdx] ?? "") : "",
      fseCategory: fseCategoryIdx >= 0 ? (cells[fseCategoryIdx] ?? "") : "",
      status:
        statusIdx >= 0 && cells[statusIdx]?.toLowerCase() === "inactive"
          ? Status.inactive
          : statusIdx >= 0 && cells[statusIdx]?.toLowerCase() === "onhold"
            ? Status.onHold
            : Status.active,
      joinDate: parseXlsxDate(joinIdx >= 0 ? (cells[joinIdx] ?? "") : ""),
      avatar: avatarIdx >= 0 ? (cells[avatarIdx] ?? "") : "",
      region: regionIdx >= 0 ? (cells[regionIdx] ?? "") : "",
      familyDetails:
        familyDetailsIdx >= 0 ? (cells[familyDetailsIdx] ?? "") : "",
      pastExperience: parseSemicolon(rawPastExp),
      salesInfluenceIndex:
        salesInfluenceIdx >= 0 ? Number(cells[salesInfluenceIdx] ?? 0) || 0 : 0,
      reviewCount:
        reviewCountIdx >= 0 ? Number(cells[reviewCountIdx] ?? 0) || 0 : 0,
      operationalDiscipline:
        operationalDisciplineIdx >= 0
          ? Number(cells[operationalDisciplineIdx] ?? 0) || 0
          : 0,
      productKnowledgeScore:
        productKnowledgeIdx >= 0
          ? Number(cells[productKnowledgeIdx] ?? 0) || 0
          : 0,
      softSkillsScore:
        softSkillsIdx >= 0 ? Number(cells[softSkillsIdx] ?? 0) || 0 : 0,
      accessories:
        accessoriesIdx >= 0 ? Number(cells[accessoriesIdx] ?? 0) || 0 : 0,
      extendedWarranty:
        extendedWarrantyIdx >= 0
          ? Number(cells[extendedWarrantyIdx] ?? 0) || 0
          : 0,
      totalSalesAmount:
        totalSalesAmountIdx >= 0
          ? Number(cells[totalSalesAmountIdx] ?? 0) || 0
          : 0,
      attendanceLapses: parseAttendanceLapses(
        attendanceLapsesIdx >= 0 ? (cells[attendanceLapsesIdx] ?? "") : "",
      ),
      daysOff: parseDaysOff(daysOffIdx >= 0 ? (cells[daysOffIdx] ?? "") : ""),
      swotStrengths: parseSemicolon(
        swotStrengthsIdx >= 0 ? (cells[swotStrengthsIdx] ?? "") : "",
      ),
      swotWeaknesses: parseSemicolon(
        swotWeaknessesIdx >= 0 ? (cells[swotWeaknessesIdx] ?? "") : "",
      ),
      swotOpportunities: parseSemicolon(
        swotOpportunitiesIdx >= 0 ? (cells[swotOpportunitiesIdx] ?? "") : "",
      ),
      swotThreats: parseSemicolon(
        swotThreatsIdx >= 0 ? (cells[swotThreatsIdx] ?? "") : "",
      ),
      traits: parseSemicolon(traitsIdx >= 0 ? (cells[traitsIdx] ?? "") : ""),
      problems: parseSemicolon(
        problemsIdx >= 0 ? (cells[problemsIdx] ?? "") : "",
      ),
      feedbacks: parseFeedbacks(
        feedbacksIdx >= 0 ? (cells[feedbacksIdx] ?? "") : "",
      ),
    };

    if (!row.fiplCode) {
      row.error = "FIPL Code is required";
    } else if (!row.name) {
      row.error = "Name is required";
    } else if (!row.role) {
      row.error = "Role is required";
    } else if (!row.department) {
      row.error = "Department is required";
    }

    rows.push(row);
  }

  return rows;
}

// Type aliases for xlsx loaded at runtime from CDN (no local package).
// Cast at call sites; ReturnType<typeof Object> is used in the loader.
type XlsxLib = ReturnType<typeof Object>;
type XlsxWorkBook = ReturnType<typeof Object>;

/** Parse the Sales Data sheet from an xlsx workbook */
function parseSalesSheet(
  wb: XlsxWorkBook,
  xlsx: XlsxLib,
): ParsedSalesRow[] | null {
  const sheetName = wb.SheetNames.find(
    (n: string) => n.toLowerCase().replace(/\s+/g, "") === "salesdata",
  );
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const raw = xlsx.utils.sheet_to_json(ws, { defval: "" }) as Record<
    string,
    unknown
  >[];

  return raw.map((r) => {
    // Normalise header names
    const normalised: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      normalised[k.toLowerCase().replace(/\s+/g, "")] = String(v ?? "").trim();
    }
    const fiplCode = normalised.fiplcode ?? "";
    const name = normalised.name ?? "";
    const region = normalised.region ?? "";
    const dateRaw = normalised.date ?? "";
    const amountRaw = normalised.amountofsale ?? normalised.amount ?? "0";

    // Parse date — xlsx may give a serial number or a string
    let dateStr = dateRaw;
    const serial = Number(dateRaw);
    if (!Number.isNaN(serial) && serial > 1000 && xlsx?.SSF?.parse_date_code) {
      // Excel serial date
      const jsDate = xlsx.SSF.parse_date_code(serial);
      if (jsDate) {
        dateStr = `${jsDate.y}-${String(jsDate.m).padStart(2, "0")}-${String(jsDate.d).padStart(2, "0")}`;
      }
    }

    const row: ParsedSalesRow = {
      fiplCode,
      name,
      region,
      date: dateStr,
      amountOfSale: Number(amountRaw) || 0,
    };
    if (!fiplCode) row.error = "FIPL Code required";
    else if (!dateStr) row.error = "Date required";
    else if (row.amountOfSale <= 0) row.error = "Amount must be > 0";
    return row;
  });
}

/** Parse employee data sheet from xlsx workbook (supports old "Employee Data" and new "Employee Details") */
function parseEmployeeSheet(
  wb: XlsxWorkBook,
  xlsx: XlsxLib,
): ParsedRow[] | null {
  const sheetName = wb.SheetNames.find((n: string) => {
    const key = n.toLowerCase().replace(/\s+/g, "");
    return key === "employeedata" || key === "employeedetails";
  });
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const csv = xlsx.utils.sheet_to_csv(ws);
  return parseCSV(csv);
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
}

/** Parse FSE Parameters sheet */
function parseParamsSheet(
  wb: XlsxWorkBook,
  xlsx: XlsxLib,
): ParsedParamsRow[] | null {
  const sheetName = wb.SheetNames.find(
    (n: string) => n.toLowerCase().replace(/\s+/g, "") === "fseparameters",
  );
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const raw = xlsx.utils.sheet_to_json(ws, { defval: "" }) as Record<
    string,
    unknown
  >[];
  return raw.map((r) => {
    const norm: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      norm[k.toLowerCase().replace(/[\s().*]/g, "")] = String(v ?? "").trim();
    }
    return {
      fiplCode: norm.fiplcode ?? "",
      salesInfluenceIndex: Number(norm.salesinfluenceindex) || 0,
      reviewCount: Number(norm.reviewcount) || 0,
      operationalDiscipline: Number(norm.operationaldiscipline) || 0,
      productKnowledgeScore: Number(norm.productknowledgescore) || 0,
      softSkillsScore: Number(norm.softskillscore ?? norm.softskillsscore) || 0,
      accessories: Number(norm.accessorycount ?? norm.accessories) || 0,
      extendedWarranty:
        Number(norm.extendedwarrantycount ?? norm.extendedwarranty) || 0,
      totalSalesAmount: Number(norm.totalsalesamount) || 0,
      totalDemoVisits: Number(norm.totaldemovists ?? norm.totaldemovisits) || 0,
      totalComplaintVisits: Number(norm.totalcomplaintvisits) || 0,
      totalVideoCallDemos: Number(norm.totalvideocalldemos) || 0,
    };
  });
}

interface ParsedAttendanceRow {
  fiplCode: string;
  date: string;
  lapseType: string;
  lapseReason: string;
  daysOff: number;
  daysOffReason: string;
}

/** Parse Attendance sheet */
function parseAttendanceSheet(
  wb: XlsxWorkBook,
  xlsx: XlsxLib,
): ParsedAttendanceRow[] | null {
  const sheetName = wb.SheetNames.find(
    (n: string) => n.toLowerCase().replace(/\s+/g, "") === "attendance",
  );
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const raw = xlsx.utils.sheet_to_json(ws, { defval: "" }) as Record<
    string,
    unknown
  >[];
  return raw.map((r) => {
    const norm: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      norm[k.toLowerCase().replace(/[\s().*]/g, "")] = String(v ?? "").trim();
    }
    let dateStr = norm.date ?? "";
    const serial = Number(dateStr);
    if (!Number.isNaN(serial) && serial > 1000 && xlsx?.SSF?.parse_date_code) {
      const jsDate = xlsx.SSF.parse_date_code(serial);
      if (jsDate) {
        dateStr = `${jsDate.y}-${String(jsDate.m).padStart(2, "0")}-${String(jsDate.d).padStart(2, "0")}`;
      }
    }
    return {
      fiplCode: norm.fiplcode ?? "",
      date: dateStr,
      lapseType: norm.attendancelapsetype ?? norm.lapsetype ?? "",
      lapseReason: norm.lapsereason ?? norm.reason ?? "",
      daysOff: Number(norm.daystakenoff ?? norm.daysoff) || 0,
      daysOffReason: norm.daysoffreason ?? "",
    };
  });
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
}

/** Parse SWOT Analysis sheet */
function parseSwotSheet(
  wb: XlsxWorkBook,
  xlsx: XlsxLib,
): ParsedSwotRow[] | null {
  const sheetName = wb.SheetNames.find(
    (n: string) => n.toLowerCase().replace(/\s+/g, "") === "swotanalysis",
  );
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const raw = xlsx.utils.sheet_to_json(ws, { defval: "" }) as Record<
    string,
    unknown
  >[];
  return raw.map((r) => {
    const norm: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      norm[k.toLowerCase().replace(/[\s().*]/g, "")] = String(v ?? "").trim();
    }
    return {
      fiplCode: norm.fiplcode ?? "",
      swotStrengths: parseSemicolon(norm.strengths ?? ""),
      swotWeaknesses: parseSemicolon(norm.weaknesses ?? ""),
      swotOpportunities: parseSemicolon(norm.opportunities ?? ""),
      swotThreats: parseSemicolon(norm.threats ?? ""),
      traits: parseSemicolon(norm.traits ?? ""),
      problems: parseSemicolon(norm.problems ?? ""),
      feedbacks: parseFeedbacks(norm.feedbacks ?? ""),
    };
  });
}

function rowToEmployeeInput(row: ParsedRow): EmployeeInput {
  const joinDateMs = joinDateToMs(row.joinDate);
  const joinDateNs = BigInt(joinDateMs) * 1_000_000n;

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
  } as EmployeeInput;
}

export type { ParsedRow };
type Step = "upload" | "preview" | "done";
type UploadMode = "employees" | "sales" | "both";

const FSE_CATEGORY_COLORS: Record<string, string> = {
  "Cash Cow":
    "bg-[oklch(0.93_0.05_165_/_0.6)] text-[oklch(0.35_0.15_165)] border-[oklch(0.65_0.12_165_/_0.3)]",
  Star: "bg-[oklch(0.95_0.05_85_/_0.6)] text-[oklch(0.40_0.14_85)] border-[oklch(0.65_0.12_85_/_0.3)]",
  "Question Mark":
    "bg-[oklch(0.93_0.04_240_/_0.6)] text-[oklch(0.38_0.14_240)] border-[oklch(0.65_0.12_240_/_0.3)]",
  Dog: "bg-[oklch(0.95_0.04_25_/_0.6)] text-[oklch(0.42_0.18_25)] border-[oklch(0.65_0.14_25_/_0.3)]",
};

export function BulkUploadModal({ open, onOpenChange }: BulkUploadModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [uploadMode, setUploadMode] = useState<UploadMode>("employees");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parsedSalesRows, setParsedSalesRows] = useState<ParsedSalesRow[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [addedSalesCount, setAddedSalesCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkAdd = useBulkAddEmployees();
  const addSalesRecord = useAddSalesRecord();
  const addAttendanceRecord = useAddAttendanceRecord();
  const { data: existingEmployees = [] } = useAllEmployees();

  // Build FIPL -> employee lookup from existing employees
  const fiplToEmployee: Map<string, Employee> = new Map(
    existingEmployees.map((e) => [e.fiplCode.toUpperCase(), e]),
  );

  const validRows = parsedRows.filter((r) => !r.error);
  const errorRows = parsedRows.filter((r) => r.error);
  const validSalesRows = parsedSalesRows.filter((r) => !r.error);
  const errorSalesRows = parsedSalesRows.filter((r) => r.error);

  const handleFile = (file: File) => {
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

      if (isXlsx) {
        loadXlsx()
          .then((XLSX) => {
            const data = new Uint8Array(result as ArrayBuffer);
            const wb = XLSX.read(data, { type: "array" });
            processXlsxWorkbook(wb, XLSX);
          })
          .catch((err) => {
            toast.error(`Failed to load Excel library: ${err.message}`);
          });
        return;
      }

      // Legacy CSV — employee data only
      const content = result as string;
      const rows = parseCSV(content);
      if (rows.length === 0) {
        toast.error("No data rows found in CSV");
        return;
      }
      setUploadMode("employees");
      setParsedRows(rows);
      setParsedSalesRows([]);
      setStep("preview");
    };

    if (isXlsx) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Separated so it can be called from the async xlsx loader
  const processXlsxWorkbook = (wb: XlsxWorkBook, XLSX: XlsxLib) => {
    const empRows = parseEmployeeSheet(wb, XLSX);
    const salesRows = parseSalesSheet(wb, XLSX);
    const paramsRows = parseParamsSheet(wb, XLSX);
    const attendanceRows = parseAttendanceSheet(wb, XLSX);
    const swotRows = parseSwotSheet(wb, XLSX);

    // Merge params, attendance, and SWOT data into employee rows
    let mergedEmpRows = empRows ?? [];
    if (mergedEmpRows.length > 0) {
      // Build lookup maps by FIPL code
      const paramsMap = new Map(
        (paramsRows ?? []).map((p) => [p.fiplCode.toUpperCase(), p]),
      );
      const swotMap = new Map(
        (swotRows ?? []).map((s) => [s.fiplCode.toUpperCase(), s]),
      );
      // Group attendance rows by FIPL code
      const attendanceMap = new Map<string, ParsedAttendanceRow[]>();
      for (const att of attendanceRows ?? []) {
        const key = att.fiplCode.toUpperCase();
        if (!attendanceMap.has(key)) attendanceMap.set(key, []);
        attendanceMap.get(key)!.push(att);
      }

      mergedEmpRows = mergedEmpRows.map((row) => {
        const key = row.fiplCode.toUpperCase();
        const params = paramsMap.get(key);
        const swot = swotMap.get(key);
        const attRows = attendanceMap.get(key) ?? [];

        const lapses: AttendanceLapse[] = attRows
          .filter((a) => a.lapseType)
          .map((a) => ({
            date: a.date,
            lapseType: a.lapseType,
            reason: a.lapseReason,
          }));
        const daysOff: DayOff[] = attRows
          .filter((a) => a.daysOff > 0)
          .map((a) => ({ date: a.date, reason: a.daysOffReason }));

        return {
          ...row,
          salesInfluenceIndex:
            params?.salesInfluenceIndex ?? row.salesInfluenceIndex,
          reviewCount: params?.reviewCount ?? row.reviewCount,
          operationalDiscipline:
            params?.operationalDiscipline ?? row.operationalDiscipline,
          productKnowledgeScore:
            params?.productKnowledgeScore ?? row.productKnowledgeScore,
          softSkillsScore: params?.softSkillsScore ?? row.softSkillsScore,
          accessories: params?.accessories ?? row.accessories,
          extendedWarranty: params?.extendedWarranty ?? row.extendedWarranty,
          totalSalesAmount: params?.totalSalesAmount ?? row.totalSalesAmount,
          attendanceLapses: lapses.length > 0 ? lapses : row.attendanceLapses,
          daysOff: daysOff.length > 0 ? daysOff : row.daysOff,
          swotStrengths: swot?.swotStrengths ?? row.swotStrengths,
          swotWeaknesses: swot?.swotWeaknesses ?? row.swotWeaknesses,
          swotOpportunities: swot?.swotOpportunities ?? row.swotOpportunities,
          swotThreats: swot?.swotThreats ?? row.swotThreats,
          traits: swot?.traits ?? row.traits,
          problems: swot?.problems ?? row.problems,
          feedbacks: swot?.feedbacks ?? row.feedbacks,
        };
      });
    }

    if (mergedEmpRows.length > 0 && salesRows && salesRows.length > 0) {
      setUploadMode("both");
      setParsedRows(mergedEmpRows);
      // Enrich sales rows with auto-detected name/region from employee sheet
      const empFiplMap = new Map(
        mergedEmpRows.map((r) => [r.fiplCode.toUpperCase(), r]),
      );
      const enriched = salesRows.map((sr) => {
        const key = sr.fiplCode.toUpperCase();
        const emp = empFiplMap.get(key) ?? fiplToEmployee.get(key);
        return {
          ...sr,
          name: emp ? emp.name : sr.name,
          region: emp ? emp.region : sr.region,
        };
      });
      setParsedSalesRows(enriched);
    } else if (mergedEmpRows.length > 0) {
      setUploadMode("employees");
      setParsedRows(mergedEmpRows);
      setParsedSalesRows([]);
    } else if (salesRows && salesRows.length > 0) {
      setUploadMode("sales");
      setParsedRows([]);
      // Enrich from existing employees
      const enriched = salesRows.map((sr) => {
        const emp = fiplToEmployee.get(sr.fiplCode.toUpperCase());
        return {
          ...sr,
          name: emp ? emp.name : sr.name,
          region: emp ? emp.region : sr.region,
        };
      });
      setParsedSalesRows(enriched);
    } else {
      toast.error("No recognisable data sheets found in this file");
      return;
    }
    setStep("preview");
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = async () => {
    let importedEmployeeIds: bigint[] = [];

    // Step 1: Import employees if needed
    if (
      (uploadMode === "employees" || uploadMode === "both") &&
      validRows.length > 0
    ) {
      try {
        const inputs = validRows.map(rowToEmployeeInput);
        importedEmployeeIds = await bulkAdd.mutateAsync(inputs);
        setAddedCount(importedEmployeeIds.length);
        toast.success(
          `${importedEmployeeIds.length} employee${importedEmployeeIds.length === 1 ? "" : "s"} added`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Employee import failed: ${msg}`);
        return;
      }
    }

    // Step 2: Process employee-linked sales + attendance records
    if (
      (uploadMode === "employees" || uploadMode === "both") &&
      importedEmployeeIds.length > 0
    ) {
      const salesPromises: Promise<unknown>[] = [];
      const attendancePromises: Promise<unknown>[] = [];

      for (let idx = 0; idx < importedEmployeeIds.length; idx++) {
        const employeeId = importedEmployeeIds[idx];
        const row = validRows[idx];
        if (!employeeId || !row) continue;

        // Sales records are now managed via the dedicated Sales upload tab (UploadsPage)
        // and use the new per-transaction schema (brand, product, saleType, quantity, amount).
        // Legacy bulk upload does not create sales records.
        void salesPromises; // keep reference to avoid unused-variable lint error

        for (const lapse of row.attendanceLapses) {
          const dateMs = lapse.date
            ? new Date(lapse.date).getTime()
            : Date.now();
          const dateNs =
            BigInt(Number.isNaN(dateMs) ? Date.now() : dateMs) * 1_000_000n;
          attendancePromises.push(
            addAttendanceRecord
              .mutateAsync({
                employeeId,
                lapseType: lapse.lapseType,
                date: dateNs,
                reason: lapse.reason,
                daysOff: 0n,
              })
              .catch(() => null),
          );
        }

        for (const dayOff of row.daysOff) {
          const dateMs = dayOff.date
            ? new Date(dayOff.date).getTime()
            : Date.now();
          const dateNs =
            BigInt(Number.isNaN(dateMs) ? Date.now() : dateMs) * 1_000_000n;
          attendancePromises.push(
            addAttendanceRecord
              .mutateAsync({
                employeeId,
                lapseType: "Day Off",
                date: dateNs,
                reason: dayOff.reason,
                daysOff: 1n,
              })
              .catch(() => null),
          );
        }
      }

      await Promise.all([...salesPromises, ...attendancePromises]);
    }

    // Step 3: Import Sales Data sheet rows — resolve employee IDs via FIPL Code
    if (
      (uploadMode === "sales" || uploadMode === "both") &&
      validSalesRows.length > 0
    ) {
      // Build a fresh lookup that includes newly imported employees
      const freshLookup = new Map<string, bigint>(
        existingEmployees.map((e) => [e.fiplCode.toUpperCase(), e.id]),
      );
      // Also add newly imported IDs from this session
      for (let i = 0; i < importedEmployeeIds.length; i++) {
        const row = validRows[i];
        if (row) {
          freshLookup.set(row.fiplCode.toUpperCase(), importedEmployeeIds[i]);
        }
      }

      let salesAdded = 0;
      const salesPromises = validSalesRows.map(async (sr) => {
        const employeeId = freshLookup.get(sr.fiplCode.toUpperCase());
        if (!employeeId) return; // skip if employee not found
        const dateMs = sr.date ? new Date(sr.date).getTime() : Date.now();
        const dateNs =
          BigInt(Number.isNaN(dateMs) ? Date.now() : dateMs) * 1_000_000n;
        // Use date as a proxy for recordDate — pass totalSalesAmount = amountOfSale
        try {
          const saleDateMs = sr.date ? new Date(sr.date).getTime() : Date.now();
          const saleDateNs =
            BigInt(Number.isNaN(saleDateMs) ? Date.now() : saleDateMs) *
            1_000_000n;
          // Legacy sales sheet — map to new schema with defaults
          await addSalesRecord.mutateAsync({
            employeeId,
            fiplCode: sr.fiplCode,
            brand: "ecovacs" as import("../backend").SalesBrand,
            product: "Unknown",
            saleType: "accessories" as import("../backend").SaleType,
            quantity: 1n,
            amount: BigInt(sr.amountOfSale),
            saleDate: saleDateNs,
          });
          salesAdded++;
        } catch {
          /* skip individual failure */
        }
        return dateNs; // returned but not used
      });
      await Promise.all(salesPromises);
      setAddedSalesCount(salesAdded);
      if (salesAdded > 0) {
        toast.success(
          `${salesAdded} sales record${salesAdded === 1 ? "" : "s"} imported`,
        );
      }
    }

    setStep("done");
  };

  const handleClose = () => {
    if (!bulkAdd.isPending) {
      setStep("upload");
      setParsedRows([]);
      setParsedSalesRows([]);
      setAddedCount(0);
      setAddedSalesCount(0);
      setUploadMode("employees");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0"
        data-ocid="bulk_upload.dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Bulk Upload
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload the Excel template (.xlsx) — it contains 5 sheets: Employee
            Details, FSE Parameters, Attendance, SWOT Analysis, and Sales Data.
            FIPL Code is the primary key linking all sheets.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto">
          {/* Step: Upload */}
          {step === "upload" && (
            <div className="px-6 py-6 space-y-5">
              {/* Download Template */}
              <div className="flex items-center justify-between rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Download Template
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Excel file with two sheets: <strong>Employee Data</strong>{" "}
                    &amp; <strong>Sales Data</strong> (FIPL Code, Name, Region,
                    Date, Amount of Sale)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="gap-2 shrink-0"
                  data-ocid="bulk_upload.upload_button"
                >
                  <Download className="w-3.5 h-3.5" />
                  Template
                </Button>
              </div>

              {/* Drop Zone */}
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
                data-ocid="bulk_upload.dropzone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={handleFileInput}
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
                    <Upload
                      className={cn(
                        "w-5 h-5 transition-colors",
                        isDragging ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {isDragging
                        ? "Drop file here"
                        : "Click or drag file here"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      .xlsx (recommended) or .csv files accepted
                    </p>
                  </div>
                </div>
              </button>

              {/* Sheets legend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Sheet 1: Employee Details */}
                <div className="rounded-lg bg-muted/20 border border-border px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground/70">
                    Sheet 1 — Employee Details
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Core identity fields for each FSE.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "FIPL Code*", pk: true },
                      { label: "Name*" },
                      { label: "Role*" },
                      { label: "Department*" },
                      { label: "FSE Category" },
                      { label: "Status" },
                      { label: "Joining Date" },
                      { label: "Avatar" },
                      { label: "Region" },
                      { label: "Family Details" },
                      { label: "Past Experience" },
                    ].map(({ label, pk }) => (
                      <code
                        key={label}
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                          pk
                            ? "bg-amber-50 text-amber-700 border-amber-200 font-bold"
                            : "bg-primary/10 text-primary border-primary/20",
                        )}
                      >
                        {label}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Sheet 2: FSE Parameters */}
                <div className="rounded-lg bg-[oklch(0.97_0.03_145_/_0.3)] border border-[oklch(0.75_0.1_145_/_0.4)] px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-[oklch(0.35_0.14_145)]">
                    Sheet 2 — FSE Parameters
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    5 performance scores + sales totals + visit metrics, linked
                    by FIPL Code.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "FIPL Code*", pk: true },
                      { label: "Sales Influence Index" },
                      { label: "Review Count" },
                      { label: "Operational Discipline" },
                      { label: "Product Knowledge Score" },
                      { label: "Soft Skill Score" },
                      { label: "Accessory Count" },
                      { label: "Extended Warranty Count" },
                      { label: "Total Sales Amount" },
                      { label: "Total Demo Visits" },
                      { label: "Total Complaint Visits" },
                      { label: "Total Video Call Demos" },
                    ].map(({ label, pk }) => (
                      <code
                        key={label}
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                          pk
                            ? "bg-amber-50 text-amber-700 border-amber-200 font-bold"
                            : "bg-[oklch(0.93_0.04_145_/_0.5)] text-[oklch(0.35_0.14_145)] border-[oklch(0.65_0.12_145_/_0.3)]",
                        )}
                      >
                        {label}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Sheet 3: Attendance */}
                <div className="rounded-lg bg-[oklch(0.97_0.03_240_/_0.3)] border border-[oklch(0.75_0.1_240_/_0.4)] px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-[oklch(0.35_0.14_240)]">
                    Sheet 3 — Attendance
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    One row per attendance event — lapses or days off.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "FIPL Code*", pk: true },
                      { label: "Date*" },
                      { label: "Lapse Type" },
                      { label: "Lapse Reason" },
                      { label: "Days Taken Off" },
                      { label: "Days Off Reason" },
                    ].map(({ label, pk }) => (
                      <code
                        key={label}
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                          pk
                            ? "bg-amber-50 text-amber-700 border-amber-200 font-bold"
                            : "bg-[oklch(0.93_0.04_240_/_0.5)] text-[oklch(0.35_0.14_240)] border-[oklch(0.65_0.12_240_/_0.3)]",
                        )}
                      >
                        {label}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Sheet 4: SWOT Analysis */}
                <div className="rounded-lg bg-[oklch(0.97_0.03_25_/_0.2)] border border-[oklch(0.75_0.1_25_/_0.3)] px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-[oklch(0.40_0.18_25)]">
                    Sheet 4 — SWOT Analysis
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    SWOT data, traits, problems, and feedbacks per FSE.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "FIPL Code*", pk: true },
                      { label: "Strengths" },
                      { label: "Weaknesses" },
                      { label: "Opportunities" },
                      { label: "Threats" },
                      { label: "Traits" },
                      { label: "Problems" },
                      { label: "Feedbacks" },
                    ].map(({ label, pk }) => (
                      <code
                        key={label}
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                          pk
                            ? "bg-amber-50 text-amber-700 border-amber-200 font-bold"
                            : "bg-[oklch(0.95_0.04_25_/_0.5)] text-[oklch(0.42_0.18_25)] border-[oklch(0.65_0.14_25_/_0.3)]",
                        )}
                      >
                        {label}
                      </code>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sheet 5: Sales Data note */}
              <div className="rounded-lg bg-[oklch(0.97_0.03_85_/_0.4)] border border-[oklch(0.75_0.1_85_/_0.4)] px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-[oklch(0.35_0.14_85)]">
                  Sheet 5 — Sales Data
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Each row is one sale event. FIPL Code auto-resolves the
                  employee name and region. Columns:{" "}
                  <code className="bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded font-bold">
                    FIPL Code
                  </code>{" "}
                  Name · Region · Date · Amount of Sale
                </p>
              </div>

              {/* FSE Category legend */}
              <div className="rounded-lg border border-border/50 px-4 py-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  FSE Category Reference
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries({
                    "Cash Cow": "Experienced, stable, high-trust",
                    Star: "High-growth, high-energy top performers",
                    "Question Mark": "Inconsistent but high-potential",
                    Dog: "Underperforming and at-risk",
                  }).map(([cat, desc]) => (
                    <div key={cat} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          FSE_CATEGORY_COLORS[cat] ??
                            "bg-muted/30 text-muted-foreground",
                        )}
                      >
                        {cat}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {(uploadMode === "employees" || uploadMode === "both") && (
                    <span className="text-xs font-semibold text-foreground">
                      {parsedRows.length} employee rows
                    </span>
                  )}
                  {uploadMode === "both" && (
                    <span className="text-muted-foreground/50 text-xs">·</span>
                  )}
                  {(uploadMode === "sales" || uploadMode === "both") && (
                    <span className="text-xs font-semibold text-foreground">
                      {parsedSalesRows.length} sales rows
                    </span>
                  )}
                  {validRows.length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[oklch(0.93_0.05_145_/_0.6)] border border-[oklch(0.65_0.14_145_/_0.3)] text-[oklch(0.38_0.16_145)]">
                      {validRows.length} valid employees
                    </span>
                  )}
                  {validSalesRows.length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[oklch(0.93_0.05_85_/_0.6)] border border-[oklch(0.65_0.12_85_/_0.3)] text-[oklch(0.38_0.14_85)]">
                      {validSalesRows.length} valid sales
                    </span>
                  )}
                  {(errorRows.length > 0 || errorSalesRows.length > 0) && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[oklch(0.96_0.04_25_/_0.6)] border border-[oklch(0.65_0.18_25_/_0.3)] text-[oklch(0.45_0.2_25)]">
                      {errorRows.length + errorSalesRows.length} errors
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setStep("upload")}
                >
                  Change file
                </Button>
              </div>

              {/* Employee rows preview */}
              {(uploadMode === "employees" || uploadMode === "both") &&
                parsedRows.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Employee Data
                    </p>
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="max-h-[220px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/20">
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                                FIPL Code
                              </TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                                Name
                              </TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                                Category
                              </TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                                Region
                              </TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                                Status
                              </TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 text-right">
                                Valid
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedRows.map((row, i) => (
                              <TableRow
                                key={`emp-row-${i}-${row.fiplCode || row.name}`}
                                className={cn(
                                  row.error && "bg-[oklch(0.97_0.03_25_/_0.4)]",
                                )}
                                data-ocid={`bulk_upload.item.${i + 1}`}
                              >
                                <TableCell className="text-xs py-2 font-mono font-medium text-primary">
                                  {row.fiplCode || (
                                    <span className="text-muted-foreground/50 italic">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs py-2 font-medium">
                                  {row.name || (
                                    <span className="text-muted-foreground/50 italic">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  {row.fseCategory ? (
                                    <span
                                      className={cn(
                                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                                        FSE_CATEGORY_COLORS[row.fseCategory] ??
                                          "bg-muted/30 text-muted-foreground border-border",
                                      )}
                                    >
                                      {row.fseCategory}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/50 italic text-[10px]">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs py-2 text-muted-foreground">
                                  {row.region || (
                                    <span className="text-muted-foreground/50 italic">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  <span
                                    className={cn(
                                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                      row.status === Status.active
                                        ? "bg-[oklch(0.93_0.05_145_/_0.5)] text-[oklch(0.38_0.16_145)]"
                                        : "bg-muted/30 text-muted-foreground",
                                    )}
                                  >
                                    {row.status}
                                  </span>
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  {row.error ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <AlertCircle className="w-3.5 h-3.5 text-[oklch(0.48_0.2_25)]" />
                                      <span className="text-[10px] text-[oklch(0.48_0.2_25)]">
                                        {row.error}
                                      </span>
                                    </div>
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.42_0.16_145)] ml-auto" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}

              {/* Sales rows preview */}
              {(uploadMode === "sales" || uploadMode === "both") &&
                parsedSalesRows.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Sales Data
                    </p>
                    <div className="rounded-xl border border-[oklch(0.75_0.1_85_/_0.4)] overflow-hidden">
                      <div className="max-h-[220px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[oklch(0.97_0.03_85_/_0.3)]">
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                                FIPL Code
                              </TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                                Name
                              </TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                                Region
                              </TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2">
                                Date
                              </TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 text-right">
                                Amount
                              </TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 text-right">
                                Valid
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedSalesRows.map((row, i) => (
                              <TableRow
                                key={`sales-row-${i}-${row.fiplCode}-${row.date}`}
                                className={cn(
                                  row.error && "bg-[oklch(0.97_0.03_25_/_0.4)]",
                                )}
                                data-ocid={`bulk_upload.sales.item.${i + 1}`}
                              >
                                <TableCell className="text-xs py-2 font-mono font-medium text-[oklch(0.40_0.14_85)]">
                                  {row.fiplCode || (
                                    <span className="text-muted-foreground/50 italic">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs py-2 font-medium">
                                  {row.name || (
                                    <span className="text-muted-foreground/50 italic text-[10px]">
                                      auto-detect
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs py-2 text-muted-foreground">
                                  {row.region || (
                                    <span className="text-muted-foreground/50 italic text-[10px]">
                                      auto-detect
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs py-2 text-muted-foreground font-mono">
                                  {row.date || "—"}
                                </TableCell>
                                <TableCell className="text-xs py-2 text-right font-semibold text-foreground">
                                  {row.amountOfSale > 0
                                    ? `₹${row.amountOfSale.toLocaleString()}`
                                    : "—"}
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  {row.error ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <AlertCircle className="w-3.5 h-3.5 text-[oklch(0.48_0.2_25)]" />
                                      <span className="text-[10px] text-[oklch(0.48_0.2_25)]">
                                        {row.error}
                                      </span>
                                    </div>
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.42_0.16_145)] ml-auto" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    {uploadMode === "sales" && (
                      <p className="text-[10px] text-muted-foreground/70 mt-2">
                        Name and Region will be automatically resolved from
                        existing employee records using FIPL Code.
                      </p>
                    )}
                  </div>
                )}

              {errorRows.length + errorSalesRows.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-[oklch(0.48_0.2_25)]">
                    {errorRows.length + errorSalesRows.length} row
                    {errorRows.length + errorSalesRows.length > 1 ? "s" : ""}{" "}
                    with errors
                  </span>{" "}
                  will be skipped. Only valid rows will be imported.
                </p>
              )}

              {validRows.length === 0 && validSalesRows.length === 0 && (
                <div
                  className="rounded-lg border border-[oklch(0.65_0.18_25_/_0.3)] bg-[oklch(0.96_0.04_25_/_0.3)] px-4 py-3"
                  data-ocid="bulk_upload.error_state"
                >
                  <p className="text-xs text-[oklch(0.45_0.2_25)] font-semibold">
                    No valid rows to import
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Please fix the file and upload again.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div
              className="px-6 py-10 flex flex-col items-center text-center gap-4"
              data-ocid="bulk_upload.success_state"
            >
              <div className="w-16 h-16 rounded-full bg-[oklch(0.93_0.05_145_/_0.6)] border border-[oklch(0.65_0.14_145_/_0.3)] flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-[oklch(0.42_0.16_145)]" />
              </div>
              <div>
                {addedCount > 0 && (
                  <p className="text-xl font-display font-bold text-foreground">
                    {addedCount} Employee{addedCount !== 1 ? "s" : ""} Added
                  </p>
                )}
                {addedSalesCount > 0 && (
                  <p className="text-xl font-display font-bold text-foreground mt-1">
                    {addedSalesCount} Sales Record
                    {addedSalesCount !== 1 ? "s" : ""} Imported
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  All data has been saved to the backend.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleClose}
                className="mt-2"
                data-ocid="bulk_upload.confirm_button"
              >
                Done
              </Button>
            </div>
          )}
        </div>

        {step !== "done" && (
          <>
            <Separator />
            <DialogFooter className="px-6 py-4 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={bulkAdd.isPending}
                data-ocid="bulk_upload.cancel_button"
              >
                Cancel
              </Button>
              {step === "preview" && (
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    (validRows.length === 0 && validSalesRows.length === 0) ||
                    bulkAdd.isPending
                  }
                  onClick={handleConfirm}
                  className="gap-2"
                  data-ocid="bulk_upload.submit_button"
                >
                  {bulkAdd.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Users className="w-3.5 h-3.5" />
                      Import{" "}
                      {uploadMode === "employees"
                        ? `${validRows.length} Employee${validRows.length !== 1 ? "s" : ""}`
                        : uploadMode === "sales"
                          ? `${validSalesRows.length} Sales Record${validSalesRows.length !== 1 ? "s" : ""}`
                          : `${validRows.length} Emp + ${validSalesRows.length} Sales`}
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
