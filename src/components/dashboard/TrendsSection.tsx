"use client";

import { useState } from "react";
import type { DayData, TrendsData, UserGoals } from "@/app/dashboard/profile/actions";

type Props = { trends: TrendsData; goals: UserGoals };

type Range = "7d" | "30d";

// ─── SVG helpers ─────────────────────────────────────────────────────────────

const CHART_W = 560;
const CHART_H = 110;
const PAD = { top: 8, right: 8, bottom: 20, left: 40 };

function normX(i: number, total: number) {
  return PAD.left + (i / Math.max(total - 1, 1)) * (CHART_W - PAD.left - PAD.right);
}
function normY(val: number, max: number) {
  return PAD.top + (1 - val / Math.max(max, 1)) * (CHART_H - PAD.top - PAD.bottom);
}

function CalorieChart({ days, target }: { days: DayData[]; target: number }) {
  if (days.length === 0) return null;
  const max = Math.max(...days.map((d) => d.calories), target) * 1.15;

  const points = days
    .map((d, i) => `${normX(i, days.length)},${normY(d.calories, max)}`)
    .join(" ");

  const targetY = normY(target, max);

  // Fill path below the line
  const firstX = normX(0, days.length);
  const lastX = normX(days.length - 1, days.length);
  const bottomY = CHART_H - PAD.bottom;
  const fillPath = `M ${firstX},${normY(days[0].calories, max)} L ${points.split(" ").slice(1).join(" L ")} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;

  // Y-axis labels
  const yLabels = [0, Math.round(max / 2), Math.round(max)];

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      aria-label="Калории по дням"
    >
      {/* Y axis labels */}
      {yLabels.map((v) => (
        <text
          key={v}
          x={PAD.left - 4}
          y={normY(v, max) + 4}
          textAnchor="end"
          fontSize={9}
          fill="#9ca3af"
        >
          {v}
        </text>
      ))}

      {/* Target line */}
      <line
        x1={PAD.left}
        x2={CHART_W - PAD.right}
        y1={targetY}
        y2={targetY}
        stroke="#6b7280"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.5}
      />
      <text x={CHART_W - PAD.right + 2} y={targetY + 3} fontSize={8} fill="#6b7280">
        цель
      </text>

      {/* Fill area */}
      <path d={fillPath} fill="#4e7c59" opacity={0.12} />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#4e7c59"
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {days.map((d, i) =>
        d.calories > 0 ? (
          <circle
            key={d.date}
            cx={normX(i, days.length)}
            cy={normY(d.calories, max)}
            r={2.5}
            fill="#4e7c59"
          />
        ) : null
      )}

      {/* X axis labels — show every N-th day */}
      {days.map((d, i) => {
        const step = days.length <= 7 ? 1 : days.length <= 14 ? 2 : 5;
        if (i % step !== 0) return null;
        return (
          <text
            key={d.date}
            x={normX(i, days.length)}
            y={CHART_H - 4}
            textAnchor="middle"
            fontSize={8}
            fill="#9ca3af"
          >
            {d.dayLabel}
          </text>
        );
      })}
    </svg>
  );
}

const MACRO_COLORS = {
  protein: "#4e7c59",  // sage green
  carbs: "#c8a96e",    // bark/amber
  fat: "#7c9dbf",      // slate blue
};

function MacroChart({ days }: { days: DayData[] }) {
  if (days.length === 0) return null;

  const maxTotal = Math.max(...days.map((d) => d.protein_g + d.carbs_g + d.fat_g)) * 1.1 || 1;
  const barW = Math.max(4, (CHART_W - PAD.left - PAD.right) / days.length - 3);

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      aria-label="Макросы по дням"
    >
      {/* Y axis labels */}
      {[0, Math.round(maxTotal / 2), Math.round(maxTotal)].map((v) => (
        <text
          key={v}
          x={PAD.left - 4}
          y={normY(v, maxTotal) + 4}
          textAnchor="end"
          fontSize={9}
          fill="#9ca3af"
        >
          {v}
        </text>
      ))}

      {days.map((d, i) => {
        const x = normX(i, days.length) - barW / 2;
        const total = d.protein_g + d.carbs_g + d.fat_g;
        if (total === 0) return null;

        const segments = [
          { key: "fat", val: d.fat_g, color: MACRO_COLORS.fat },
          { key: "carbs", val: d.carbs_g, color: MACRO_COLORS.carbs },
          { key: "protein", val: d.protein_g, color: MACRO_COLORS.protein },
        ];

        let stackY = CHART_H - PAD.bottom;
        return (
          <g key={d.date}>
            {segments.map((seg) => {
              const h = (seg.val / maxTotal) * (CHART_H - PAD.top - PAD.bottom);
              stackY -= h;
              return (
                <rect
                  key={seg.key}
                  x={x}
                  y={stackY}
                  width={barW}
                  height={h}
                  fill={seg.color}
                  opacity={0.8}
                />
              );
            })}
            {/* X label */}
            {(() => {
              const step = days.length <= 7 ? 1 : days.length <= 14 ? 2 : 5;
              if (i % step !== 0) return null;
              return (
                <text
                  x={normX(i, days.length)}
                  y={CHART_H - 4}
                  textAnchor="middle"
                  fontSize={8}
                  fill="#9ca3af"
                >
                  {d.dayLabel}
                </text>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrendsSection({ trends, goals }: Props) {
  const [range, setRange] = useState<Range>("7d");
  const days = range === "7d" ? trends.days.slice(-7) : trends.days;

  const hasAnyData = trends.days.some((d) => d.calories > 0);

  return (
    <div className="space-y-6">
      {/* Header row with range toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-bark-300 uppercase tracking-wide">
          Тренды
        </h2>
        <div className="flex items-center gap-1 rounded-lg border border-parchment-300 p-0.5">
          {(["7d", "30d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                range === r
                  ? "bg-bark-300 text-white"
                  : "text-muted-foreground hover:text-bark-200"
              }`}
            >
              {r === "7d" ? "7 дней" : "30 дней"}
            </button>
          ))}
        </div>
      </div>

      {!hasAnyData ? (
        <div className="rounded-xl border border-dashed border-parchment-300 bg-parchment-50 py-10 text-center">
          <p className="text-sm font-medium text-bark-200">Нет данных</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Начните вести дневник питания — тренды появятся здесь.
          </p>
        </div>
      ) : (
        <>
          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-parchment-200 bg-parchment-50 p-3 text-center">
              <p className="text-2xl font-bold text-bark-300">{trends.streak}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {trends.streak === 1 ? "день подряд" : trends.streak >= 2 && trends.streak <= 4 ? "дня подряд" : "дней подряд"}
              </p>
            </div>
            <div className="rounded-lg border border-parchment-200 bg-parchment-50 p-3 text-center">
              <p className="text-2xl font-bold text-bark-300">
                {trends.avgCalories7d > 0 ? trends.avgCalories7d : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">ккал / день (7д)</p>
            </div>
            <div className="rounded-lg border border-parchment-200 bg-parchment-50 p-3 text-center">
              <p className="text-2xl font-bold text-bark-300">
                {trends.bestMacroDay ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">лучший день по БЖУ</p>
            </div>
          </div>

          {/* Calorie chart */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Калории, ккал</p>
            <div className="rounded-xl border border-parchment-200 bg-parchment-50 p-3">
              <CalorieChart days={days} target={goals.daily_calorie_target} />
            </div>
          </div>

          {/* Macro chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Макросы, г</p>
              <div className="flex items-center gap-3">
                {[
                  { label: "Белки", color: MACRO_COLORS.protein },
                  { label: "Углеводы", color: MACRO_COLORS.carbs },
                  { label: "Жиры", color: MACRO_COLORS.fat },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm"
                      style={{ background: l.color }}
                    />
                    <span className="text-xs text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-parchment-200 bg-parchment-50 p-3">
              <MacroChart days={days} />
            </div>
          </div>

          {/* Top foods */}
          {trends.topFoods.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Часто за 7 дней
              </p>
              <div className="flex flex-wrap gap-2">
                {trends.topFoods.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center rounded-full border border-parchment-300 bg-parchment-50 px-3 py-1 text-xs font-medium text-bark-200"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
