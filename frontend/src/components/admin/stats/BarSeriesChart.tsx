"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartCard, ChartTooltip, axisTick } from "./chartBits";

// Dikey ya da yatay tek serili çubuk grafik. Aylık randevu, haftalık
// yoğunluk, kaynak ve iptal dağılımı aynı iskeleti paylaşıyor.
export default function BarSeriesChart<T extends Record<string, unknown>>({
  title,
  subtitle,
  data,
  categoryKey,
  valueKey,
  valueName,
  color,
  layout = "horizontal",
  emptyText = "Bu dönemde veri yok.",
  height = 260,
}: {
  title: string;
  subtitle?: string;
  data: T[];
  categoryKey: string;
  valueKey: string;
  valueName: string;
  color: string;
  layout?: "horizontal" | "vertical";
  emptyText?: string;
  height?: number;
}) {
  const vertical = layout === "vertical";

  return (
    <ChartCard title={title} subtitle={subtitle}>
      {data.length === 0 ? (
        <p className="text-gray-400 text-sm">{emptyText}</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout={layout}
            margin={{ top: 8, right: vertical ? 16 : 8, left: 0, bottom: 0 }}
            barCategoryGap={vertical ? "20%" : "35%"}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              vertical={vertical}
              horizontal={!vertical}
            />
            {vertical ? (
              <>
                <XAxis
                  type="number"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey={categoryKey}
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={categoryKey}
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={32}
                />
              </>
            )}
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "#f8fafc" }}
              isAnimationActive={false}
            />
            <Bar
              dataKey={valueKey}
              name={valueName}
              fill={color}
              radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={vertical ? 22 : 28}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
