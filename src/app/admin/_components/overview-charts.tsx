"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DesignsOverTimeRow, StyleBreakdownRow } from "@/app/admin/_modules/admin.service";

/*
 * Overview charts (recharts). Colors follow the design tokens + the dataviz method:
 *   - single-series charts (designs-over-time, engagement funnel) use the brand green.
 *   - the styles donut is multi-category → the VALIDATED default categorical palette (passes
 *     CVD + normal-vision gates in both modes; direct labels satisfy the light contrast relief).
 *   - generation success uses the reserved status palette (good green / critical red) + labels.
 * Thin marks, recessive axes, per-mark tooltips — see the dataviz skill.
 */

const BRAND = "#1c4e3f"; // --chart-1 (brand green)
const GRID = "var(--muted-foreground)";

// Validated categorical palette (dataviz default; passes all gates). Fixed order, never cycled.
const CATEGORICAL = ["#2a78d6", "#008300", "#e87ba4", "#eda100", "#1baf7a"];

// Reserved status colors (never used for a series).
const STATUS_GOOD = "#0ca30c";
const STATUS_CRITICAL = "#d03b3b";

const STYLE_LABELS: Record<string, string> = {
  modern: "Modern",
  minimal: "Minimal",
  luxury: "Luxury",
  traditional_bangla: "Traditional",
  scandinavian: "Scandinavian",
  classic: "Classic",
};

const EVENT_LABELS: Record<string, string> = {
  generation: "Redesigns",
  regenerate: "Re-generates",
  tag_click: "Furniture taps",
  buy_click: "Buy clicks",
  share: "Shares",
  save: "Saves",
};

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
} as const;

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** Designs created per day — activity trend. Single-series area, brand green. */
export function DesignsOverTimeChart({ data }: { data: DesignsOverTimeRow[] }) {
  const rows = data.map((d) => ({
    ...d,
    // "Jul 19" tick from the ISO day.
    label: new Date(`${d.day}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));
  return (
    <Panel title="Designs over time">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="designsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.28} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: GRID }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: GRID }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={40}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: GRID, strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="count"
            name="Designs"
            stroke={BRAND}
            strokeWidth={2}
            fill="url(#designsFill)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Panel>
  );
}

/** Engagement funnel — event counts as horizontal bars, single hue, direct value labels. */
export function EngagementChart({ data }: { data: { eventType: string; count: number }[] }) {
  const rows = data.map((d) => ({
    label: EVENT_LABELS[d.eventType] ?? d.eventType,
    count: d.count,
  }));
  if (rows.length === 0) {
    return (
      <Panel title="Engagement">
        <p className="text-brand-body text-sm">No activity yet.</p>
      </Panel>
    );
  }
  return (
    <Panel title="Engagement">
      <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 40)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 8 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12, fill: "var(--foreground)" }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
          <Bar
            dataKey="count"
            name="Events"
            fill={BRAND}
            radius={[0, 4, 4, 0]}
            barSize={18}
            label={{ position: "right", fontSize: 11, fill: "var(--muted-foreground)" }}
          />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

/** Popular styles — donut with the validated categorical palette + direct legend/labels. */
export function StylesChart({ data }: { data: StyleBreakdownRow[] }) {
  const rows = data.map((d, i) => ({
    label: STYLE_LABELS[d.style] ?? d.style,
    count: d.count,
    color: CATEGORICAL[i % CATEGORICAL.length],
  }));
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <Panel title="Popular styles">
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={180}>
          <PieChart>
            <Pie
              data={rows}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={72}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {rows.map((r) => (
                <Cell key={r.label} fill={r.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        {/* Direct legend — identity never by color alone (relief for light-mode contrast). */}
        <ul className="flex flex-1 flex-col gap-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-2 text-sm">
              <span className="size-3 shrink-0 rounded-sm" style={{ background: r.color }} />
              <span className="flex-1 text-brand-body">{r.label}</span>
              <span className="font-bold text-foreground tabular-nums">
                {total ? Math.round((r.count / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/** Generation success — status donut (good/critical) with a center rate + labels. */
export function GenerationSuccessChart({ data }: { data: { success: number; failed: number } }) {
  const total = data.success + data.failed;
  const rate = total ? Math.round((data.success / total) * 100) : 0;
  const rows = [
    { label: "Success", count: data.success, color: STATUS_GOOD },
    { label: "Failed", count: data.failed, color: STATUS_CRITICAL },
  ];
  return (
    <Panel title="Generation success (30d)">
      <div className="flex items-center gap-4">
        <div className="relative" style={{ width: "50%" }}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                stroke="var(--card)"
                strokeWidth={2}
              >
                {rows.map((r) => (
                  <Cell key={r.label} fill={r.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-serif font-extrabold text-2xl text-foreground">{rate}%</span>
            <span className="text-[11px] text-muted-foreground">success</span>
          </div>
        </div>
        <ul className="flex flex-1 flex-col gap-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-2 text-sm">
              <span className="size-3 shrink-0 rounded-sm" style={{ background: r.color }} />
              <span className="flex-1 text-brand-body">{r.label}</span>
              <span className="font-bold text-foreground tabular-nums">
                {r.count.toLocaleString("en-US")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
