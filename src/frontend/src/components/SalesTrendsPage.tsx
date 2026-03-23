import { TrendingUp } from "lucide-react";
import { RegionalSalesTrend } from "./RegionalSalesTrend";

export function SalesTrendsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto" data-ocid="sales_trends.page">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold">
            Analytics
          </p>
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Regional Sales Trends
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Analyse actual sales by region or individual FSE — yearly, monthly, or
          day-by-day. FIPL Code auto-links name and region.
        </p>
      </div>

      {/* Trend Chart */}
      <section
        className="glass-card rounded-xl p-6"
        data-ocid="sales_trends.section"
      >
        <RegionalSalesTrend />
      </section>

      {/* FSE Category Legend */}
      <section className="glass-card rounded-xl p-6 mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" />
          FSE Category Framework
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              name: "Cash Cow",
              desc: "Experienced, stable, high-trust FSEs",
              textCls: "text-[oklch(0.32_0.15_165)]",
              bgCls:
                "bg-[oklch(0.93_0.05_165_/_0.5)] border-[oklch(0.65_0.12_165_/_0.4)]",
              dot: "bg-[oklch(0.52_0.18_165)]",
            },
            {
              name: "Star",
              desc: "High-growth, high-energy top performers",
              textCls: "text-[oklch(0.38_0.14_85)]",
              bgCls:
                "bg-[oklch(0.95_0.05_85_/_0.5)] border-[oklch(0.65_0.12_85_/_0.4)]",
              dot: "bg-[oklch(0.55_0.18_85)]",
            },
            {
              name: "Question Mark",
              desc: "Inconsistent but high-potential FSEs",
              textCls: "text-[oklch(0.35_0.14_240)]",
              bgCls:
                "bg-[oklch(0.93_0.04_240_/_0.5)] border-[oklch(0.65_0.12_240_/_0.4)]",
              dot: "bg-[oklch(0.52_0.18_240)]",
            },
            {
              name: "Dog",
              desc: "Underperforming and at-risk FSEs",
              textCls: "text-[oklch(0.40_0.18_25)]",
              bgCls:
                "bg-[oklch(0.95_0.04_25_/_0.5)] border-[oklch(0.65_0.14_25_/_0.4)]",
              dot: "bg-[oklch(0.52_0.2_25)]",
            },
          ].map((cat) => (
            <div
              key={cat.name}
              className={`rounded-xl p-4 border ${cat.bgCls}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cat.dot}`} />
                <span className={`text-sm font-bold ${cat.textCls}`}>
                  {cat.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
