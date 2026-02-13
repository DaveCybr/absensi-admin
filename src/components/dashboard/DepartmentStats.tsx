"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

type DepartmentData = {
  department: string | null;
};

const COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Green
  "#f59e0b", // Orange
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
];

export default function DepartmentStats({ data }: { data: DepartmentData[] }) {
  // Process data
  const processedData = (() => {
    const deptCount: Record<string, number> = {};

    data.forEach((item) => {
      const dept = item.department || "No Department";
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    });

    return Object.entries(deptCount).map(([name, value]) => ({
      name,
      value,
    }));
  })();

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardHeader className="border-b border-slate-200 dark:border-slate-800">
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Distribusi per Department
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {processedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgb(15 23 42)",
                border: "1px solid rgb(51 65 85)",
                borderRadius: "8px",
                color: "white",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
