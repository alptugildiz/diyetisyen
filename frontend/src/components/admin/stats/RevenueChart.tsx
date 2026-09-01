"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatK } from "@/lib/periods";
import { ChartCard, ChartTooltip, EMERALD, axisTick } from "./chartBits";

export interface MonthPoint {
  month: string;
  label: string;
  revenue: number;
  count: number;
}

export default function RevenueChart({ data }: { data: MonthPoint[] }) {
  return (
    <ChartCard
      title="Aylık Tahsilat"
      subtitle="Paranın kasaya girdiği aya göre toplam gelir"
    >
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={EMERALD} stopOpacity={0.28} />
              <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatK}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip unit="try" />}
            cursor={{ stroke: EMERALD, strokeOpacity: 0.3 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Tahsilat"
            stroke={EMERALD}
            strokeWidth={2}
            fill="url(#revFill)"
            dot={{ r: 3, fill: EMERALD }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
