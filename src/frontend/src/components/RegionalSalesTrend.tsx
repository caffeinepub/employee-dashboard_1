import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Employee } from "../backend.d.ts";
import { useGoogleSheetEmployees } from "../hooks/useGoogleSheetData";
import { useGoogleSheetSales } from "../hooks/useGoogleSheetData";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const REGION_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

const FSE_COLORS = [
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#a855f7",
  "#22c55e",
  "#0ea5e9",
  "#f43f5e",
  "#eab308",
];

function formatAmount(val: number): string {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
}

interface RegionalSalesTrendProps {
  className?: string;
}

type ViewMode = "region" | "fse";
type GranularityMode = "yearly" | "halfYearly" | "monthly" | "daily";

export function RegionalSalesTrend({ className }: RegionalSalesTrendProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [viewMode, setViewMode] = useState<ViewMode>("region");
  const [granularity, setGranularity] = useState<GranularityMode>("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterFse, setFilterFse] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterSaleType, setFilterSaleType] = useState<string>("all");
  const [fsePopoverOpen, setFsePopoverOpen] = useState(false);

  const { data: employees = [] } = useGoogleSheetEmployees();
  const { data: salesRecordsRaw = [], isLoading } = useGoogleSheetSales();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesRecords = salesRecordsRaw as any[];

  // Build lookup maps
  const fiplToEmployee = useMemo<Map<string, Employee>>(
    () => new Map(employees.map((e) => [e.fiplCode.toUpperCase(), e])),
    [employees],
  );

  // Enrich sales records with employee info resolved via FIPL Code
  const enrichedRecords = useMemo(() => {
    return salesRecords.map((sr) => {
      const emp = fiplToEmployee.get(sr.fiplCode.toUpperCase());
      // Use saleDate (actual sale date) for trend analysis, not recordDate (insertion time)
      const date = new Date(Number(sr.saleDate / 1_000_000n));
      return {
        ...sr,
        employeeName: emp?.name ?? sr.fiplCode,
        region: emp?.region ?? "Unknown",
        fseCategory: emp?.fseCategory ?? "",
        date,
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        amount: Number(sr.amount),
        brand: sr.brand as string,
        saleType: sr.saleType as string,
        quantity: Number(sr.quantity),
      };
    });
  }, [salesRecords, fiplToEmployee]);

  // Distinct regions and FSEs
  const allRegions = useMemo(
    () =>
      Array.from(
        new Set(enrichedRecords.map((r) => r.region).filter(Boolean)),
      ).sort(),
    [enrichedRecords],
  );

  const allFses = useMemo(() => {
    const codesWithSales = new Set(
      salesRecords.map((r) => r.fiplCode.toUpperCase()),
    );
    return employees
      .filter((e) => codesWithSales.has(e.fiplCode.toUpperCase()))
      .map((e) => ({
        name: e.name,
        fiplCode: e.fiplCode,
        region: e.region ?? "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, salesRecords]);

  const yearOptions = useMemo(() => {
    const years = new Set(
      enrichedRecords.map((r) => r.year).filter((y) => y > 2000),
    );
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [enrichedRecords, currentYear]);

  // Filter records based on current selections
  const filteredRecords = useMemo(() => {
    return enrichedRecords.filter((r) => {
      if (filterRegion !== "all" && r.region !== filterRegion) return false;
      if (filterFse !== "all" && r.fiplCode !== filterFse) return false;
      if (filterBrand !== "all" && r.brand !== filterBrand) return false;
      if (filterSaleType !== "all" && r.saleType !== filterSaleType)
        return false;
      return true;
    });
  }, [enrichedRecords, filterRegion, filterFse, filterBrand, filterSaleType]);

  // Build chart data
  const { chartData, seriesKeys } = useMemo(() => {
    if (filteredRecords.length === 0) return { chartData: [], seriesKeys: [] };

    if (granularity === "daily") {
      // Day-by-day for the selected year + month
      const daysInMonth = new Date(
        selectedYear,
        selectedMonth + 1,
        0,
      ).getDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      const recordsForMonth = filteredRecords.filter(
        (r) => r.year === selectedYear && r.month === selectedMonth,
      );

      if (viewMode === "region") {
        const regions =
          filterRegion === "all"
            ? Array.from(new Set(recordsForMonth.map((r) => r.region)))
            : [filterRegion];
        const data = days.map((d) => {
          const point: Record<string, number | string> = {
            period: `${d} ${MONTH_ABBR[selectedMonth]}`,
          };
          for (const region of regions) {
            point[region] = recordsForMonth
              .filter((r) => r.day === d && r.region === region)
              .reduce((sum, r) => sum + r.amount, 0);
          }
          return point;
        });
        return { chartData: data, seriesKeys: regions };
      }
      // FSE view
      const fses =
        filterFse === "all"
          ? Array.from(new Set(recordsForMonth.map((r) => r.fiplCode)))
          : [filterFse];
      const fseNames = new Map(
        recordsForMonth.map((r) => [r.fiplCode, r.employeeName]),
      );
      const data = days.map((d) => {
        const point: Record<string, number | string> = {
          period: `${d} ${MONTH_ABBR[selectedMonth]}`,
        };
        for (const fiplCode of fses) {
          const key = fseNames.get(fiplCode) ?? fiplCode;
          point[key] = recordsForMonth
            .filter((r) => r.day === d && r.fiplCode === fiplCode)
            .reduce((sum, r) => sum + r.amount, 0);
        }
        return point;
      });
      const keys = fses.map((fc) => fseNames.get(fc) ?? fc);
      return { chartData: data, seriesKeys: keys };
    }

    if (granularity === "halfYearly") {
      // Show 6 months for each half: H1 = months 0-5, H2 = months 6-11
      const recordsForYear = filteredRecords.filter(
        (r) => r.year === selectedYear,
      );
      const half = selectedMonth < 6 ? 0 : 1; // 0 = H1, 1 = H2
      const startMonth = half * 6;
      const monthSlice = MONTH_ABBR.slice(startMonth, startMonth + 6);

      if (viewMode === "region") {
        const regions =
          filterRegion === "all"
            ? Array.from(new Set(recordsForYear.map((r) => r.region)))
            : [filterRegion];
        const data = monthSlice.map((abbr, idx) => {
          const m = startMonth + idx;
          const point: Record<string, number | string> = { period: abbr };
          for (const region of regions) {
            point[region] = recordsForYear
              .filter((r) => r.month === m && r.region === region)
              .reduce((sum, r) => sum + r.amount, 0);
          }
          return point;
        });
        return { chartData: data, seriesKeys: regions };
      }
      const fses =
        filterFse === "all"
          ? Array.from(new Set(recordsForYear.map((r) => r.fiplCode)))
          : [filterFse];
      const fseNames = new Map(
        recordsForYear.map((r) => [r.fiplCode, r.employeeName]),
      );
      const data = monthSlice.map((abbr, idx) => {
        const m = startMonth + idx;
        const point: Record<string, number | string> = { period: abbr };
        for (const fiplCode of fses) {
          const key = fseNames.get(fiplCode) ?? fiplCode;
          point[key] = recordsForYear
            .filter((r) => r.month === m && r.fiplCode === fiplCode)
            .reduce((sum, r) => sum + r.amount, 0);
        }
        return point;
      });
      const keys = fses.map((fc) => fseNames.get(fc) ?? fc);
      return { chartData: data, seriesKeys: keys };
    }

    if (granularity === "monthly") {
      // Month-by-month for the selected year
      const recordsForYear = filteredRecords.filter(
        (r) => r.year === selectedYear,
      );

      if (viewMode === "region") {
        const regions =
          filterRegion === "all"
            ? Array.from(new Set(recordsForYear.map((r) => r.region)))
            : [filterRegion];
        const data = MONTH_ABBR.map((abbr, m) => {
          const point: Record<string, number | string> = { period: abbr };
          for (const region of regions) {
            point[region] = recordsForYear
              .filter((r) => r.month === m && r.region === region)
              .reduce((sum, r) => sum + r.amount, 0);
          }
          return point;
        });
        return { chartData: data, seriesKeys: regions };
      }
      const fses =
        filterFse === "all"
          ? Array.from(new Set(recordsForYear.map((r) => r.fiplCode)))
          : [filterFse];
      const fseNames = new Map(
        recordsForYear.map((r) => [r.fiplCode, r.employeeName]),
      );
      const data = MONTH_ABBR.map((abbr, m) => {
        const point: Record<string, number | string> = { period: abbr };
        for (const fiplCode of fses) {
          const key = fseNames.get(fiplCode) ?? fiplCode;
          point[key] = recordsForYear
            .filter((r) => r.month === m && r.fiplCode === fiplCode)
            .reduce((sum, r) => sum + r.amount, 0);
        }
        return point;
      });
      const keys = fses.map((fc) => fseNames.get(fc) ?? fc);
      return { chartData: data, seriesKeys: keys };
    }

    // Yearly granularity
    if (viewMode === "region") {
      const regions =
        filterRegion === "all"
          ? Array.from(new Set(filteredRecords.map((r) => r.region)))
          : [filterRegion];
      const years = Array.from(
        new Set(filteredRecords.map((r) => r.year)),
      ).sort();
      const data = years.map((y) => {
        const point: Record<string, number | string> = { period: String(y) };
        for (const region of regions) {
          point[region] = filteredRecords
            .filter((r) => r.year === y && r.region === region)
            .reduce((sum, r) => sum + r.amount, 0);
        }
        return point;
      });
      return { chartData: data, seriesKeys: regions };
    }
    const fses =
      filterFse === "all"
        ? Array.from(new Set(filteredRecords.map((r) => r.fiplCode)))
        : [filterFse];
    const fseNames = new Map(
      filteredRecords.map((r) => [r.fiplCode, r.employeeName]),
    );
    const years = Array.from(
      new Set(filteredRecords.map((r) => r.year)),
    ).sort();
    const data = years.map((y) => {
      const point: Record<string, number | string> = { period: String(y) };
      for (const fiplCode of fses) {
        const key = fseNames.get(fiplCode) ?? fiplCode;
        point[key] = filteredRecords
          .filter((r) => r.year === y && r.fiplCode === fiplCode)
          .reduce((sum, r) => sum + r.amount, 0);
      }
      return point;
    });
    const keys = fses.map((fc) => fseNames.get(fc) ?? fc);
    return { chartData: data, seriesKeys: keys };
  }, [
    filteredRecords,
    granularity,
    viewMode,
    selectedYear,
    selectedMonth,
    filterRegion,
    filterFse,
  ]);

  // Summary stats for selected period
  const summaryStats = useMemo(() => {
    const records =
      granularity === "daily"
        ? filteredRecords.filter(
            (r) => r.year === selectedYear && r.month === selectedMonth,
          )
        : granularity === "monthly" || granularity === "halfYearly"
          ? filteredRecords.filter((r) => r.year === selectedYear)
          : filteredRecords;

    const total = records.reduce((s, r) => s + r.amount, 0);
    const byRegion = new Map<string, number>();
    const byFse = new Map<string, { name: string; amount: number }>();
    for (const r of records) {
      byRegion.set(r.region, (byRegion.get(r.region) ?? 0) + r.amount);
      const existing = byFse.get(r.fiplCode);
      byFse.set(r.fiplCode, {
        name: r.employeeName,
        amount: (existing?.amount ?? 0) + r.amount,
      });
    }
    const topRegion = [...byRegion.entries()].sort((a, b) => b[1] - a[1])[0];
    const topFse = [...byFse.entries()].sort(
      (a, b) => b[1].amount - a[1].amount,
    )[0];

    return { total, topRegion, topFse, recordCount: records.length };
  }, [filteredRecords, granularity, selectedYear, selectedMonth]);

  const hasData = enrichedRecords.length > 0;

  const chartTitle = (() => {
    if (granularity === "daily")
      return `${MONTH_NAMES[selectedMonth]} ${selectedYear} — Daily Sales`;
    if (granularity === "halfYearly") {
      const half = selectedMonth < 6 ? "H1 (Jan–Jun)" : "H2 (Jul–Dec)";
      return `${selectedYear} — ${half} Sales`;
    }
    if (granularity === "monthly") return `${selectedYear} — Monthly Sales`;
    return "Year-over-Year Sales";
  })();

  const colors = viewMode === "region" ? REGION_COLORS : FSE_COLORS;
  const useBarChart = granularity === "yearly" || seriesKeys.length > 4;

  return (
    <div className={cn("space-y-5", className)}>
      {/* Top controls */}
      <div className="flex flex-col gap-3">
        {/* Row 1: View mode + granularity */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
              Sales Analysis
            </p>
            <h3 className="text-sm font-display font-bold text-foreground">
              {chartTitle}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View mode: Region vs FSE */}
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 border border-border/50">
              {(["region", "fse"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setViewMode(v);
                    if (v === "region") setFilterFse("all");
                    else setFilterRegion("all");
                  }}
                  className={cn(
                    "text-xs font-semibold px-3 py-1 rounded-md transition-all",
                    viewMode === v
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  data-ocid={`sales_trends.${v}_tab`}
                >
                  {v === "region" ? "By Region" : "By FSE"}
                </button>
              ))}
            </div>

            {/* Granularity pills */}
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 border border-border/50">
              {(
                [
                  "yearly",
                  "halfYearly",
                  "monthly",
                  "daily",
                ] as GranularityMode[]
              ).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularity(g)}
                  className={cn(
                    "text-xs font-semibold px-3 py-1 rounded-md transition-all capitalize",
                    granularity === g
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  data-ocid={`sales_trends.${g}_toggle`}
                >
                  {g === "yearly"
                    ? "Yearly"
                    : g === "halfYearly"
                      ? "6M"
                      : g === "monthly"
                        ? "Monthly"
                        : "Daily"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Year / Month dropdowns + filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year dropdown — shown for monthly, halfYearly, and daily */}
          {(granularity === "monthly" ||
            granularity === "halfYearly" ||
            granularity === "daily") && (
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger
                className="h-7 text-xs w-24 border-border/50"
                data-ocid="sales_trends.year_select"
              >
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Month dropdown — shown for daily only */}
          {granularity === "daily" && (
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(Number(v))}
            >
              <SelectTrigger
                className="h-7 text-xs w-32 border-border/50"
                data-ocid="sales_trends.month_select"
              >
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, idx) => (
                  <SelectItem
                    key={name}
                    value={String(idx)}
                    className="text-xs"
                  >
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Region filter */}
          {viewMode === "region" && (
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger
                className="h-7 text-xs w-40 border-border/50"
                data-ocid="sales_trends.region_select"
              >
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Regions
                </SelectItem>
                {allRegions.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* FSE filter — searchable combobox */}
          {viewMode === "fse" && (
            <Popover open={fsePopoverOpen} onOpenChange={setFsePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs w-52 border-border/50 justify-between font-normal px-2.5"
                  data-ocid="sales_trends.fse_select"
                >
                  <span className="truncate">
                    {filterFse === "all"
                      ? "All FSEs"
                      : (allFses.find((f) => f.fiplCode === filterFse)?.name ??
                        filterFse)}
                  </span>
                  <ChevronDown className="w-3 h-3 ml-1 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-0"
                align="start"
                data-ocid="sales_trends.fse_select.popover"
              >
                <Command>
                  <CommandInput
                    placeholder="Search FSE by name..."
                    className="h-8 text-xs"
                    data-ocid="sales_trends.fse_select.search_input"
                  />
                  <CommandList className="max-h-56 overflow-y-auto">
                    <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                      No FSE found.
                    </CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setFilterFse("all");
                          setFsePopoverOpen(false);
                        }}
                        className="text-xs"
                        data-ocid="sales_trends.fse_select.item.all"
                      >
                        <Check
                          className={cn(
                            "mr-2 w-3.5 h-3.5",
                            filterFse === "all" ? "opacity-100" : "opacity-0",
                          )}
                        />
                        All FSEs
                      </CommandItem>
                      {allFses.map((f, idx) => (
                        <CommandItem
                          key={f.fiplCode}
                          value={`${f.name} ${f.fiplCode} ${f.region}`}
                          onSelect={() => {
                            setFilterFse(f.fiplCode);
                            setFsePopoverOpen(false);
                          }}
                          className="text-xs"
                          data-ocid={`sales_trends.fse_select.item.${idx + 1}`}
                        >
                          <Check
                            className={cn(
                              "mr-2 w-3.5 h-3.5 shrink-0",
                              filterFse === f.fiplCode
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">
                              {f.name}
                            </span>
                            {f.region && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                {f.fiplCode} · {f.region}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Brand filter */}
          <Select value={filterBrand} onValueChange={setFilterBrand}>
            <SelectTrigger
              className="h-7 text-xs w-32 border-border/50"
              data-ocid="sales_trends.brand_select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Brands
              </SelectItem>
              <SelectItem value="ecovacs" className="text-xs">
                Ecovacs
              </SelectItem>
              <SelectItem value="kuvings" className="text-xs">
                Kuvings
              </SelectItem>
              <SelectItem value="coway" className="text-xs">
                Coway
              </SelectItem>
              <SelectItem value="tineco" className="text-xs">
                Tineco
              </SelectItem>
              <SelectItem value="instant" className="text-xs">
                Instant
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Sale type filter */}
          <Select value={filterSaleType} onValueChange={setFilterSaleType}>
            <SelectTrigger
              className="h-7 text-xs w-40 border-border/50"
              data-ocid="sales_trends.saletype_select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Types
              </SelectItem>
              <SelectItem value="accessories" className="text-xs">
                Accessories
              </SelectItem>
              <SelectItem value="extendedWarranty" className="text-xs">
                Extended Warranty
              </SelectItem>
            </SelectContent>
          </Select>

          {(filterRegion !== "all" ||
            filterFse !== "all" ||
            filterBrand !== "all" ||
            filterSaleType !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={() => {
                setFilterRegion("all");
                setFilterFse("all");
                setFilterBrand("all");
                setFilterSaleType("all");
              }}
            >
              Reset filters
            </Button>
          )}
        </div>
      </div>

      {/* Summary stat cards */}
      {hasData && summaryStats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Sales",
              value: formatAmount(summaryStats.total),
              sub: null,
            },
            {
              label: "Records",
              value: String(summaryStats.recordCount),
              sub: "transactions",
            },
            {
              label: "Top Region",
              value: summaryStats.topRegion?.[0] ?? "—",
              sub: summaryStats.topRegion
                ? formatAmount(summaryStats.topRegion[1])
                : null,
            },
            {
              label: "Top FSE",
              value: summaryStats.topFse?.[1]?.name ?? "—",
              sub: summaryStats.topFse
                ? formatAmount(summaryStats.topFse[1].amount)
                : null,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                {card.label}
              </p>
              <p className="text-base font-bold text-foreground truncate">
                {card.value}
              </p>
              {card.sub && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {card.sub}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 glass-card rounded-xl border border-border/30"
          data-ocid="sales_trends.loading_state"
        >
          <TrendingUp className="w-10 h-10 mb-3 opacity-30 animate-pulse" />
          <p className="text-sm font-semibold">Loading sales data...</p>
        </div>
      ) : !hasData ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 glass-card rounded-xl border border-border/30"
          data-ocid="sales_trends.empty_state"
        >
          <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-semibold">No sales data yet</p>
          <p className="text-xs mt-1 opacity-70">
            Add employees and upload sales records to see trends
          </p>
        </div>
      ) : chartData.length === 0 || seriesKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 glass-card rounded-xl border border-border/30">
          <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-semibold">No data for this selection</p>
          <p className="text-xs mt-1 opacity-70">
            Try adjusting the filters or time period
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-5 border border-border/30">
          <ResponsiveContainer width="100%" height={320}>
            {useBarChart ? (
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.88 0.01 240 / 0.5)"
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10, fill: "oklch(0.55 0.02 240)" }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "oklch(0.55 0.02 240)" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickFormatter={(v: number) => formatAmount(v)}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `₹${Number(value).toLocaleString()}`,
                    "",
                  ]}
                  contentStyle={{
                    background: "oklch(0.98 0.005 240)",
                    border: "1px solid oklch(0.88 0.01 240)",
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: "0 4px 12px oklch(0.4 0.02 240 / 0.12)",
                  }}
                  labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                />
                <Legend content={() => null} />
                {seriesKeys.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={colors[i % colors.length]}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                  />
                ))}
              </BarChart>
            ) : (
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.88 0.01 240 / 0.5)"
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10, fill: "oklch(0.55 0.02 240)" }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                  interval={
                    granularity === "daily"
                      ? Math.ceil(
                          new Date(
                            selectedYear,
                            selectedMonth + 1,
                            0,
                          ).getDate() / 6,
                        )
                      : 0
                  }
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "oklch(0.55 0.02 240)" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickFormatter={(v: number) => formatAmount(v)}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `₹${Number(value).toLocaleString()}`,
                    "",
                  ]}
                  contentStyle={{
                    background: "oklch(0.98 0.005 240)",
                    border: "1px solid oklch(0.88 0.01 240)",
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: "0 4px 12px oklch(0.4 0.02 240 / 0.12)",
                  }}
                  labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                />
                <Legend content={() => null} />
                {seriesKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[i % colors.length]}
                    strokeWidth={2}
                    dot={
                      granularity === "daily" ? false : { r: 3, strokeWidth: 0 }
                    }
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>

          {/* Series summary chips */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/30">
            {seriesKeys.slice(0, 20).map((key, i) => (
              <div
                key={key}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border bg-muted/20"
                style={{
                  borderColor: `${colors[i % colors.length]}40`,
                  color: colors[i % colors.length],
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: colors[i % colors.length] }}
                />
                {viewMode === "region" ? (
                  <>
                    <span className="font-semibold text-foreground">{key}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {employees.filter((e) => e.region === key).length} FSE
                      {employees.filter((e) => e.region === key).length !== 1
                        ? "s"
                        : ""}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold text-foreground">
                    {allFses.find((f) => f.fiplCode === key)?.name ?? key}
                  </span>
                )}
              </div>
            ))}
            {seriesKeys.length > 20 && (
              <div className="flex items-center text-xs text-muted-foreground italic px-2.5 py-1">
                +{seriesKeys.length - 20} more…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed breakdown table for daily view */}
      {granularity === "daily" &&
        hasData &&
        chartData.length > 0 &&
        seriesKeys.length > 0 && (
          <div className="glass-card rounded-xl p-5 border border-border/30">
            <p className="text-xs font-semibold text-foreground/70 mb-3 uppercase tracking-wider">
              Day-level Detail — {MONTH_NAMES[selectedMonth]} {selectedYear}
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 w-24">
                      Day
                    </TableHead>
                    {seriesKeys.map((k) => (
                      <TableHead
                        key={k}
                        className="text-[10px] font-bold uppercase tracking-wider py-2 text-right"
                      >
                        {k}
                      </TableHead>
                    ))}
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider py-2 text-right">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData
                    .filter((row) =>
                      seriesKeys.some((k) => (row[k] as number) > 0),
                    )
                    .map((row, idx) => {
                      const total = seriesKeys.reduce(
                        (s, k) => s + ((row[k] as number) || 0),
                        0,
                      );
                      return (
                        <TableRow
                          key={String(row.period)}
                          data-ocid={`sales_trends.row.${idx + 1}`}
                        >
                          <TableCell className="text-xs py-2 font-mono text-muted-foreground">
                            {row.period}
                          </TableCell>
                          {seriesKeys.map((k) => (
                            <TableCell
                              key={k}
                              className="text-xs py-2 text-right"
                            >
                              {(row[k] as number) > 0
                                ? `₹${((row[k] as number) || 0).toLocaleString()}`
                                : "—"}
                            </TableCell>
                          ))}
                          <TableCell className="text-xs py-2 text-right font-semibold text-foreground">
                            {total > 0 ? `₹${total.toLocaleString()}` : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
    </div>
  );
}
