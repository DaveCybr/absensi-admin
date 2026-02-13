"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type LeaveRequest = {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  employees: {
    name: string;
    department: string | null;
  };
  leave_types: {
    name: string;
    color: string;
  };
};

export default function LeaveCalendarView() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [departments, setDepartments] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [currentDate, filterDepartment]);

  const loadDepartments = async () => {
    const { data } = await supabase
      .from("employees")
      .select("department")
      .not("department", "is", null);

    const uniqueDepts = Array.from(
      new Set(data?.map((d: any) => d.department).filter(Boolean)),
    );
    setDepartments(uniqueDepts as string[]);
  };

  const loadLeaves = async () => {
    setIsLoading(true);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

    let query = supabase
      .from("leave_requests")
      .select("*, employees(name, department), leave_types(name, color)")
      .eq("status", "approved")
      .gte("start_date", startDate)
      .lte("end_date", endDate);

    const { data } = await query;

    let filtered = (data as LeaveRequest[]) || [];

    if (filterDepartment !== "all") {
      filtered = filtered.filter(
        (l) => l.employees?.department === filterDepartment,
      );
    }

    setLeaves(filtered);
    setIsLoading(false);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startPadding = firstDay.getDay(); // 0 = Sunday

    // Add padding for previous month
    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }

    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date: date.toISOString().split("T")[0],
        day: i,
        isCurrentMonth: true,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }

    return days;
  };

  const getLeavesForDate = (dateStr: string) => {
    return leaves.filter((leave) => {
      const leaveStart = new Date(leave.start_date);
      const leaveEnd = new Date(leave.end_date);
      const currentDate = new Date(dateStr);

      return currentDate >= leaveStart && currentDate <= leaveEnd;
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardHeader className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Kalender Cuti - {monthName}
          </CardTitle>

          <div className="flex items-center gap-3">
            <Select
              value={filterDepartment}
              onValueChange={setFilterDepartment}
            >
              <SelectTrigger className="w-48 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Semua Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Department</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={goToPreviousMonth}
                className="border-slate-300 dark:border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={goToToday}
                className="border-slate-300 dark:border-slate-700"
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={goToNextMonth}
                className="border-slate-300 dark:border-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            Memuat...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-slate-600 dark:text-slate-400 py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {days.map((day, index) => {
              if (!day.isCurrentMonth) {
                return (
                  <div
                    key={index}
                    className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-lg"
                  />
                );
              }

              const leavesOnDate = day.date ? getLeavesForDate(day.date) : [];
              const isToday =
                day.date === new Date().toISOString().split("T")[0];

              return (
                <div
                  key={index}
                  className={`aspect-square rounded-lg border transition-colors ${
                    day.isWeekend
                      ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  } ${
                    isToday
                      ? "ring-2 ring-indigo-500"
                      : "hover:border-indigo-300 dark:hover:border-indigo-700"
                  }`}
                >
                  <div className="p-2 h-full flex flex-col">
                    {/* Date Number */}
                    <div
                      className={`text-sm font-semibold mb-1 ${
                        isToday
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {day.day}
                    </div>

                    {/* Leaves */}
                    <div className="flex-1 space-y-1 overflow-y-auto">
                      {leavesOnDate.slice(0, 3).map((leave) => (
                        <div
                          key={leave.id}
                          className="text-xs p-1 rounded truncate"
                          style={{
                            backgroundColor: leave.leave_types.color + "20",
                            color: leave.leave_types.color,
                          }}
                          title={`${leave.employees.name} - ${leave.leave_types.name}`}
                        >
                          {leave.employees.name}
                        </div>
                      ))}
                      {leavesOnDate.length > 3 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 p-1">
                          +{leavesOnDate.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
