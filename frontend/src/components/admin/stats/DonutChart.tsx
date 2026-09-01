"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard, ChartTooltip, PieLegend } from "./chartBits";

export interface Slice {
  name: string;
  value: number;
  color: string;
}

// Ortasında toplam gösterebilen halka grafik. Danışan bileşimi ve süreç
// durumu dağılımı aynı iskeleti paylaşıyor.
export default function DonutChart({
  title,
  subtitle,
  slices,
  centerValue,
  centerLabel,
}: {
  title: string;
  subtitle?: string;
  slices: Slice[];
  centerValue?: string;
  centerLabel?: string;
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((e) => (
                <Cell key={e.name} fill={e.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
          </PieChart>
        </ResponsiveContainer>
        {centerValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {centerValue}
            </span>
            {centerLabel && (
              <span className="text-xs text-gray-400">{centerLabel}</span>
            )}
          </div>
        )}
      </div>
      <PieLegend items={slices} />
    </ChartCard>
  );
}
