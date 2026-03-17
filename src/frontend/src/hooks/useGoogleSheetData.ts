import { useQuery } from "@tanstack/react-query";
import { Status } from "../backend";
import type { Employee } from "../backend.d.ts";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOjE98FXvqzyDsHobJaFeIE_45dElbccI_yNzCirTrTD10vQiLE6eZS3UKpqgXt7xH1cLSjlMpeRn6/pub?gid=0&single=true&output=csv";

const BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOjE98FXvqzyDsHobJaFeIE_45dElbccI_yNzCirTrTD10vQiLE6eZS3UKpqgXt7xH1cLSjlMpeRn6/pub?single=true&output=csv";

// Known GIDs for Sheets 1–5
const SWOT_URL = `${BASE}&gid=261281208`;
const PARAMETERS_URL = `${BASE}&gid=540205484`;
const ATTENDANCE_URL = `${BASE}&gid=699978179`;
const SALES_URL = `${BASE}&gid=2107831932`;

// Pubhtml URL used to discover Sheet 6 and Sheet 7 GIDs dynamically
const PUBHTML_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOjE98FXvqzyDsHobJaFeIE_45dElbccI_yNzCirTrTD10vQiLE6eZS3UKpqgXt7xH1cLSjlMpeRn6/pubhtml";

const STALE_5MIN = 5 * 60 * 1000;

// ─── GID auto-discovery ──────────────────────────────────────────────────────────────────────

let cachedGids: string[] | null = null;

async function discoverAllSheetGids(): Promise<string[]> {
  if (cachedGids !== null) return cachedGids;
  try {
    const res = await fetch(PUBHTML_URL);
    const html = await res.text();
    // The pubhtml navigation contains links like ?gid=XXXXXXX
    // Extract all unique GIDs in the order they appear (= sheet order)
    const seen = new Set<string>();
    const gids: string[] = [];
    // Match both "gid=XXXXX" patterns in anchor hrefs
    const re = /[?&]gid=(\d+)/g;
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex loop pattern
    while ((m = re.exec(html)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        gids.push(m[1]);
      }
    }
    cachedGids = gids;
    return gids;
  } catch {
    // Return empty if discovery fails — hooks will show empty state
    cachedGids = [];
    return [];
  }
}

/** Hook that discovers all sheet GIDs once per session */
export function useSheetGids() {
  return useQuery<string[]>({
    queryKey: ["sheetGids"],
    queryFn: discoverAllSheetGids,
    staleTime: Number.POSITIVE_INFINITY, // GIDs don't change
    retry: 2,
  });
}

// ─── Shared helpers ────────────────────────────────────────────────────────────────────────────

export function fiplCodeToId(fiplCode: string): bigint {
  let hash = 0;
  for (let i = 0; i < fiplCode.length; i++) {
    hash = (hash * 31 + fiplCode.charCodeAt(i)) & 0x7fffffff;
  }
  return BigInt(hash);
}

function parseJoinDate(raw: string): bigint {
  if (!raw || raw === "#N/A" || raw.trim() === "") return 0n;
  // DD-MM-YYYY
  const parts = raw.split("-");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    const date = new Date(`${yyyy}-${mm}-${dd}`);
    if (!Number.isNaN(date.getTime()))
      return BigInt(date.getTime()) * 1_000_000n;
  }
  return 0n;
}

/** Parse DD-MM-YYYY to nanoseconds BigInt */
function parseDDMMYYYY(raw: string): bigint {
  if (!raw || raw.trim() === "") return 0n;
  const parts = raw.trim().split("-");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    const date = new Date(`${yyyy}-${mm}-${dd}`);
    if (!Number.isNaN(date.getTime()))
      return BigInt(date.getTime()) * 1_000_000n;
  }
  return 0n;
}

function parseStatus(raw: string): Status {
  const s = raw.trim().toLowerCase();
  if (s === "active") return Status.active;
  if (s === "on hold") return Status.onHold;
  return Status.inactive;
}

function parseCategory(raw: string): string {
  const s = raw.trim();
  if (!s || s === "NA" || s === "-") return "";
  if (s.toLowerCase() === "question mark") return "Question Mark";
  return s;
}

/** Generic quoted-CSV row parser */
function parseRow(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

/** Split a multiline cell into a clean string array */
function parseMultilineCell(raw: string): string[] {
  return raw
    .split(/\n/)
    .map((s) => s.replace(/^\d+[.)\s]+/, "").trim())
    .filter(Boolean);
}

/** Split a semicolon-separated cell */
function parseSemicolonCell(raw: string): string[] {
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse numeric; treats "-", "NA" or empty as 0 */
function parseNum(val: string): number {
  const v = val?.trim() ?? "";
  if (v === "-" || v === "NA" || v === "") return 0;
  const cleaned = v.replace(/[,\s₹$]/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

// ─── Employee (Sheet 1) ────────────────────────────────────────────────────────────────────────────

function parseCSV(text: string): Employee[] {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const employees: Employee[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const fiplCode = cols[0]?.replace(/\*/g, "").trim() || "";
    if (!fiplCode) continue;
    employees.push({
      id: fiplCodeToId(fiplCode),
      fiplCode,
      name: cols[1]?.replace(/\*/g, "").trim() || "",
      role: cols[2]?.replace(/\*/g, "").trim() || "",
      department: cols[3]?.replace(/\*/g, "").trim() || "",
      fseCategory: parseCategory(cols[4] || ""),
      status: parseStatus(cols[5] || ""),
      joinDate: parseJoinDate(cols[6] || ""),
      avatar: cols[7]?.trim() || "",
      region: cols[8]?.trim() || "",
      familyDetails: cols[9]?.trim() || "",
      pastExperience: cols[10]
        ? cols[10]
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    });
  }
  return employees;
}

export function useGoogleSheetEmployees() {
  return useQuery<Employee[]>({
    queryKey: ["googleSheetEmployees"],
    queryFn: async () => {
      const res = await fetch(SHEET_CSV_URL);
      if (!res.ok) throw new Error("Failed to fetch sheet");
      const text = await res.text();
      return parseCSV(text);
    },
    staleTime: STALE_5MIN,
    refetchOnWindowFocus: true,
  });
}

// ─── SWOT (Sheet 2) ────────────────────────────────────────────────────────────────────────────

export interface SheetSWOT {
  fiplCode: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  traits: string[];
  problems: string[];
}

function parseSWOTCSV(text: string): SheetSWOT[] {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const results: SheetSWOT[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const fiplCode = cols[0]?.replace(/\*/g, "").trim() || "";
    if (!fiplCode) continue;
    results.push({
      fiplCode,
      strengths: parseMultilineCell(cols[1] || ""),
      weaknesses: parseMultilineCell(cols[2] || ""),
      opportunities: parseMultilineCell(cols[3] || ""),
      threats: parseMultilineCell(cols[4] || ""),
      traits: parseSemicolonCell(cols[5] || ""),
      problems: parseSemicolonCell(cols[6] || ""),
    });
  }
  return results;
}

export function useGoogleSheetSWOT() {
  return useQuery<SheetSWOT[]>({
    queryKey: ["googleSheetSWOT"],
    queryFn: async () => {
      const res = await fetch(SWOT_URL);
      if (!res.ok) throw new Error("Failed to fetch SWOT sheet");
      const text = await res.text();
      return parseSWOTCSV(text);
    },
    staleTime: STALE_5MIN,
    refetchOnWindowFocus: true,
  });
}

export function useGoogleSheetSWOTByFiplCode(
  fiplCode: string | null | undefined,
) {
  const { data: allSwot = [], ...rest } = useGoogleSheetSWOT();
  const match = fiplCode
    ? (allSwot.find(
        (s) => s.fiplCode.toUpperCase() === fiplCode.toUpperCase(),
      ) ?? null)
    : null;
  return { ...rest, data: match };
}

// ─── Parameters (Sheet 3) ──────────────────────────────────────────────────────────────────────────

export interface SheetParameters {
  fiplCode: string;
  salesInfluenceIndex: number;
  reviewCount: number;
  operationalDiscipline: number;
  productKnowledgeScore: number;
  softSkillsScore: number;
  totalDemoVisits: number;
  totalComplaintVisits: number;
  totalVideoCallDemos: number;
}

function parseParametersCSV(text: string): SheetParameters[] {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const results: SheetParameters[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const fiplCode = cols[0]?.replace(/\*/g, "").trim() || "";
    if (!fiplCode) continue;
    results.push({
      fiplCode,
      salesInfluenceIndex: parseNum(cols[1] || ""),
      reviewCount: parseNum(cols[2] || ""),
      operationalDiscipline: parseNum(cols[3] || ""),
      productKnowledgeScore: parseNum(cols[4] || ""),
      softSkillsScore: parseNum(cols[5] || ""),
      totalDemoVisits: parseNum(cols[6] || ""),
      totalComplaintVisits: parseNum(cols[7] || ""),
      totalVideoCallDemos: parseNum(cols[8] || ""),
    });
  }
  return results;
}

export function useGoogleSheetParameters() {
  return useQuery<SheetParameters[]>({
    queryKey: ["googleSheetParameters"],
    queryFn: async () => {
      const res = await fetch(PARAMETERS_URL);
      if (!res.ok) throw new Error("Failed to fetch Parameters sheet");
      const text = await res.text();
      return parseParametersCSV(text);
    },
    staleTime: STALE_5MIN,
    refetchOnWindowFocus: true,
  });
}

export function useGoogleSheetParametersByFiplCode(
  fiplCode: string | null | undefined,
) {
  const { data: all = [], ...rest } = useGoogleSheetParameters();
  const match = fiplCode
    ? (all.find((s) => s.fiplCode.toUpperCase() === fiplCode.toUpperCase()) ??
      null)
    : null;
  return { ...rest, data: match };
}

// ─── Attendance (Sheet 4) ─────────────────────────────────────────────────────────────────────────

export interface SheetAttendanceRecord {
  id: bigint;
  fiplCode: string;
  employeeId: bigint;
  date: bigint;
  lapseType: string;
  remarks: string;
}

function parseAttendanceCSV(text: string): SheetAttendanceRecord[] {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const results: SheetAttendanceRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const fiplCode = cols[0]?.replace(/\*/g, "").trim() || "";
    if (!fiplCode) continue;
    const employeeId = fiplCodeToId(fiplCode);
    results.push({
      id: BigInt(i),
      fiplCode,
      employeeId,
      date: parseDDMMYYYY(cols[2] || ""),
      lapseType: cols[3]?.trim() || "",
      remarks: cols[4]?.trim() || "",
    });
  }
  return results;
}

export function useGoogleSheetAttendance() {
  return useQuery<SheetAttendanceRecord[]>({
    queryKey: ["googleSheetAttendance"],
    queryFn: async () => {
      const res = await fetch(ATTENDANCE_URL);
      if (!res.ok) throw new Error("Failed to fetch Attendance sheet");
      const text = await res.text();
      return parseAttendanceCSV(text);
    },
    staleTime: STALE_5MIN,
    refetchOnWindowFocus: true,
  });
}

export function useGoogleSheetAttendanceByFiplCode(
  fiplCode: string | null | undefined,
) {
  const { data: all = [], ...rest } = useGoogleSheetAttendance();
  const filtered = fiplCode
    ? all.filter((r) => r.fiplCode.toUpperCase() === fiplCode.toUpperCase())
    : [];
  return { ...rest, data: filtered };
}

// ─── Sales (Sheet 5) ────────────────────────────────────────────────────────────────────────────

export interface SheetSalesRecord {
  id: bigint;
  fiplCode: string;
  employeeId: bigint;
  brand: string;
  product: string;
  saleType: string;
  saleDate: bigint;
  recordDate: bigint;
  quantity: bigint;
  amount: bigint;
}

function mapBrand(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s === "ecovacs") return "ecovacs";
  if (s === "kuvings") return "kuvings";
  if (s === "coway") return "coway";
  if (s === "tineco") return "tineco";
  if (s === "instant") return "instant";
  return s;
}

function mapSaleType(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s.includes("extended") || s.includes("warranty"))
    return "extendedWarranty";
  if (s.includes("accessor")) return "accessories";
  return s;
}

/**
 * Parse a sale date from Column G: Unix timestamp (seconds), YYYY-MM-DD, or DD-MM-YYYY.
 */
function parseSaleDate(raw: string): bigint {
  if (!raw || raw.trim() === "") return 0n;
  const trimmed = raw.trim();
  const num = Number(trimmed);
  if (!Number.isNaN(num) && num > 0) {
    // Excel serial numbers: days since Dec 30, 1899 (range ~25569 to 73050)
    if (num >= 25569 && num <= 73050) {
      const ms = Date.UTC(1899, 11, 30) + num * 86400000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 1970) {
        return BigInt(Math.round(ms)) * 1_000_000n;
      }
    }
    // Unix timestamp in milliseconds (> 1e12)
    if (num > 1e12) {
      const d = new Date(num);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() > 1971) {
        return BigInt(Math.round(num)) * 1_000_000n;
      }
    }
    // Unix timestamp in seconds (1e9 to 1e12)
    if (num >= 1e9 && num < 1e12) {
      const ms = num * 1000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() > 1971) {
        return BigInt(Math.round(ms)) * 1_000_000n;
      }
    }
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(
      `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`,
    );
    if (!Number.isNaN(d.getTime())) return BigInt(d.getTime()) * 1_000_000n;
  }
  const ddmmyyyy = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(
      `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[1].padStart(2, "0")}`,
    );
    if (!Number.isNaN(d.getTime())) return BigInt(d.getTime()) * 1_000_000n;
  }
  return 0n;
}

function parseSalesCSV(text: string): SheetSalesRecord[] {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const results: SheetSalesRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const fiplCode = cols[0]?.replace(/\*/g, "").trim() || "";
    if (!fiplCode) continue;
    const employeeId = fiplCodeToId(fiplCode);
    const saleDate = parseSaleDate(cols[6] || "");
    results.push({
      id: BigInt(i),
      fiplCode,
      employeeId,
      brand: mapBrand(cols[3] || ""),
      product: cols[4]?.trim() || "",
      saleType: mapSaleType(cols[5] || ""),
      saleDate,
      recordDate: saleDate,
      quantity: BigInt(parseNum(cols[7] || "")),
      amount: BigInt(parseNum(cols[8]?.replace(/[₹,]/g, "") || "")),
    });
  }
  return results;
}

export function useGoogleSheetSales() {
  return useQuery<SheetSalesRecord[]>({
    queryKey: ["googleSheetSales"],
    queryFn: async () => {
      const res = await fetch(SALES_URL);
      if (!res.ok) throw new Error("Failed to fetch Sales sheet");
      const text = await res.text();
      return parseSalesCSV(text);
    },
    staleTime: STALE_5MIN,
    refetchOnWindowFocus: true,
  });
}

export function useGoogleSheetSalesByFiplCode(
  fiplCode: string | null | undefined,
) {
  const { data: all = [], ...rest } = useGoogleSheetSales();
  const filtered = fiplCode
    ? all.filter((r) => r.fiplCode.toUpperCase() === fiplCode.toUpperCase())
    : [];
  return { ...rest, data: filtered };
}

// ─── Top Performers (Sheet 6) ────────────────────────────────────────────────────────────────────

export interface SheetTopPerformer {
  rank: number;
  name: string;
  fiplCode: string;
  accessories: number;
  extendedWarranty: number;
  totalSales: number;
}

function normHeader(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColIdx(headers: string[], ...candidates: string[]): number {
  const norm = headers.map(normHeader);
  for (const c of candidates) {
    const idx = norm.findIndex(
      (h) => h === normHeader(c) || h.includes(normHeader(c)),
    );
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseTopPerformersCSV(text: string): SheetTopPerformer[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]);
  const rankIdx = findColIdx(headers, "rank", "#", "no");
  const nameIdx = findColIdx(headers, "name", "fsename", "employee");
  const fiplIdx = findColIdx(headers, "fiplcode", "fipl", "code");
  const accIdx = findColIdx(headers, "accessories", "accessory", "acc");
  const ewIdx = findColIdx(
    headers,
    "extendedwarranty",
    "extended",
    "warranty",
    "ew",
  );
  const salesIdx = findColIdx(
    headers,
    "totalsales",
    "sales",
    "amount",
    "total",
  );

  const results: SheetTopPerformer[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const name = nameIdx >= 0 ? cols[nameIdx]?.trim() || "" : "";
    const fiplCode = fiplIdx >= 0 ? cols[fiplIdx]?.trim() || "" : "";
    if (!name && !fiplCode) continue;

    const rank = rankIdx >= 0 ? parseNum(cols[rankIdx] || "") || i : i;

    results.push({
      rank,
      name,
      fiplCode,
      accessories: accIdx >= 0 ? parseNum(cols[accIdx] || "") : 0,
      extendedWarranty: ewIdx >= 0 ? parseNum(cols[ewIdx] || "") : 0,
      totalSales: salesIdx >= 0 ? parseNum(cols[salesIdx] || "") : 0,
    });
  }
  return results.sort((a, b) => a.rank - b.rank);
}

export function useGoogleSheetTopPerformers() {
  const { data: gids = [] } = useSheetGids();
  // Sheet 6 is the 6th sheet (index 5)
  const sheet6Gid = gids[5] ?? null;

  return useQuery<SheetTopPerformer[]>({
    queryKey: ["googleSheetTopPerformers", sheet6Gid],
    queryFn: async () => {
      if (!sheet6Gid) return [];
      const url = `${BASE}&gid=${sheet6Gid}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch Top Performers sheet");
      const text = await res.text();
      return parseTopPerformersCSV(text);
    },
    enabled: gids.length > 0,
    staleTime: STALE_5MIN,
    refetchOnWindowFocus: true,
  });
}

// ─── Call Records (Sheet 7) ─────────────────────────────────────────────────────────────────────

export interface SheetCallRecord {
  id: string;
  fiplCode: string;
  fseName: string;
  customerName: string;
  brand: string;
  product: string;
  cesScore: number;
  remark: string;
  dateOfCall: string;
  agent: string;
  priority: string;
}

function parseCallRecordsCSV(text: string): SheetCallRecord[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]);
  const fiplIdx = findColIdx(headers, "fiplcode", "fipl");
  const fseIdx = findColIdx(headers, "fse name", "fsename", "fse");
  const custIdx = findColIdx(
    headers,
    "customer name",
    "customername",
    "customer",
  );
  const brandIdx = findColIdx(headers, "brand");
  const productIdx = findColIdx(headers, "product");
  const cesIdx = findColIdx(headers, "ces score", "cesscore", "ces");
  const remarkIdx = findColIdx(headers, "remark", "remarks");
  const dateIdx = findColIdx(headers, "date of call", "dateofcall", "date");
  const agentIdx = findColIdx(headers, "agent", "calledby");
  const priorityIdx = findColIdx(headers, "priority", "pri");

  const results: SheetCallRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const get = (idx: number) => (idx >= 0 ? (cols[idx]?.trim() ?? "") : "");
    const fiplCode = get(fiplIdx);
    const customerName = get(custIdx);
    if (!fiplCode && !customerName) continue;
    results.push({
      id: `sheet-${i}`,
      fiplCode,
      fseName: get(fseIdx),
      customerName,
      brand: get(brandIdx),
      product: get(productIdx),
      cesScore: parseNum(get(cesIdx)),
      remark: get(remarkIdx),
      dateOfCall: get(dateIdx),
      agent: get(agentIdx),
      priority: get(priorityIdx),
    });
  }
  return results;
}

export function useGoogleSheetCallRecords() {
  const { data: gids = [] } = useSheetGids();
  // Sheet 7 is the 7th sheet (index 6)
  const sheet7Gid = gids[6] ?? null;

  return useQuery<SheetCallRecord[]>({
    queryKey: ["googleSheetCallRecords", sheet7Gid],
    queryFn: async () => {
      if (!sheet7Gid) return [];
      const url = `${BASE}&gid=${sheet7Gid}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch Call Records sheet");
      const text = await res.text();
      return parseCallRecordsCSV(text);
    },
    enabled: gids.length > 0,
    staleTime: STALE_5MIN,
    refetchOnWindowFocus: true,
  });
}
