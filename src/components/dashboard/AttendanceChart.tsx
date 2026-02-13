"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type AttendanceData = {
  created_at: string;
  type: string;
};

export default function AttendanceChart({ data }: { data: AttendanceData[] }) {
  // Process data for chart
  const processedData = (() => {
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("id-ID", { weekday: "short" });

      const checkIns = data.filter(
        (d) =>
          d.type === "check_in" &&
          new Date(d.created_at).toISOString().split("T")[0] === dateStr,
      ).length;

      const checkOuts = data.filter(
        (d) =>
          d.type === "check_out" &&
          new Date(d.created_at).toISOString().split("T")[0] === dateStr,
      ).length;

      last7Days.push({
        name: dayName,
        "Check In": checkIns,
        "Check Out": checkOuts,
      });
    }

    return last7Days;
  })();

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardHeader className="border-b border-slate-200 dark:border-slate-800">
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Tren Absensi 7 Hari Terakhir
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={processedData}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-slate-200 dark:stroke-slate-800"
            />
            <XAxis
              dataKey="name"
              className="text-xs text-slate-600 dark:text-slate-400"
            />
            <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgb(15 23 42)",
                border: "1px solid rgb(51 65 85)",
                borderRadius: "8px",
                color: "white",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Check In"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Check Out"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: "#f59e0b", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
