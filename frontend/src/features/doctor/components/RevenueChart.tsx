import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { RevenuePoint } from "@/types/api";

function formatCLP(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}

interface RevenueChartProps {
  data: RevenuePoint[];
  loading?: boolean;
}

export default function RevenueChart({ data, loading }: RevenueChartProps) {
  if (loading) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
      </div>
    );
  }

  const chartData = data.map((d) => ({
    day: d.day.slice(5), // "06-01" → "06-01"
    ingreso: parseFloat(d.ingreso),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7DD3C0" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#7DD3C0" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#F0EEE8" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: "#A0A0A0", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fill: "#A0A0A0", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          cursor={{ stroke: "#7DD3C0", strokeWidth: 1, strokeDasharray: "3 3" }}
          contentStyle={{
            background: "#fff",
            border: "1px solid #E8E6E1",
            borderRadius: 10,
            fontSize: 12,
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
            padding: "8px 12px",
          }}
          labelStyle={{ color: "#6B6B6B", fontWeight: 500, marginBottom: 2 }}
          formatter={(v: number) => [formatCLP(v), "Ingreso"]}
        />
        <Area
          type="monotone"
          dataKey="ingreso"
          stroke="#5CB8A4"
          strokeWidth={2}
          fill="url(#tealGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
