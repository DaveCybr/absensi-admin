"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Users, Plus, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Employee = {
  id: string;
  name: string;
  department: string | null;
};

type Shift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

type Schedule = {
  id: string;
  employee_id: string;
  shift_id: string;
  date: string;
  is_holiday: boolean;
  note: string | null;
  shifts?: Shift;
};

export default function SchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [isHoliday, setIsHoliday] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [selectedMonth]);

  const loadData = async () => {
    setIsLoading(true);

    const [employeesRes, shiftsRes] = await Promise.all([
      supabase
        .from("employees")
        .select("id, name, department")
        .eq("is_active", true),
      supabase.from("shifts").select("*").order("created_at"),
    ]);

    setEmployees(employeesRes.data || []);
    setShifts(shiftsRes.data || []);
    setIsLoading(false);
  };

  const loadSchedules = async () => {
    const [year, month] = selectedMonth.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0)
      .toISOString()
      .split("T")[0];

    const { data } = await supabase
      .from("schedules")
      .select("*, shifts(*)")
      .gte("date", startDate)
      .lte("date", endDate);

    setSchedules((data as Schedule[]) || []);
  };

  const getDaysInMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const days = [];

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month - 1, i);
      days.push({
        date: date.toISOString().split("T")[0],
        day: date.getDate(),
        dayName: date.toLocaleDateString("id-ID", { weekday: "short" }),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }

    return days;
  };

  const getScheduleForEmployeeAndDate = (employeeId: string, date: string) => {
    return schedules.find(
      (s) => s.employee_id === employeeId && s.date === date,
    );
  };

  const handleAssignSchedule = async () => {
    if (!selectedDate || selectedEmployees.length === 0) return;

    setIsSubmitting(true);

    try {
      const scheduleData = selectedEmployees.map((empId) => ({
        employee_id: empId,
        shift_id: selectedShift || null,
        date: selectedDate,
        is_holiday: isHoliday,
      }));

      // Delete existing schedules for this date & employees
      await supabase
        .from("schedules")
        .delete()
        .eq("date", selectedDate)
        .in("employee_id", selectedEmployees);

      // Insert new schedules
      await supabase.from("schedules").insert(scheduleData);

      setIsDialogOpen(false);
      setSelectedDate("");
      setSelectedEmployees([]);
      setSelectedShift("");
      setIsHoliday(false);
      loadSchedules();
    } catch (error) {
      console.error("Error assigning schedule:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssignDialog = (date: string) => {
    setSelectedDate(date);
    setSelectedEmployees([]);
    setSelectedShift("");
    setIsHoliday(false);
    setIsDialogOpen(true);
  };

  const toggleEmployee = (empId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId],
    );
  };

  const selectAllEmployees = () => {
    setSelectedEmployees(employees.map((e) => e.id));
  };

  const clearAllEmployees = () => {
    setSelectedEmployees([]);
  };

  const days = getDaysInMonth();

  // Group employees by department
  const employeesByDept = employees.reduce(
    (acc, emp) => {
      const dept = emp.department || "No Department";
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(emp);
      return acc;
    },
    {} as Record<string, Employee[]>,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Penjadwalan Karyawan
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Assign shift dan atur jadwal karyawan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Legend */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-indigo-100 dark:bg-indigo-950 border border-indigo-300 dark:border-indigo-700" />
              <span className="text-slate-600 dark:text-slate-400">
                Ada Shift
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-700" />
              <span className="text-slate-600 dark:text-slate-400">Libur</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
              <span className="text-slate-600 dark:text-slate-400">
                Belum Dijadwalkan
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Calendar */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Memuat...
        </div>
      ) : (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 overflow-x-auto">
            <table className="w-full border-collapse min-w-max">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[200px]">
                    Karyawan
                  </th>
                  {days.map((day) => (
                    <th
                      key={day.date}
                      className={`border border-slate-200 dark:border-slate-800 px-2 py-2 text-center min-w-[80px] ${
                        day.isWeekend
                          ? "bg-slate-50 dark:bg-slate-800"
                          : "bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {day.dayName}
                      </div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {day.day}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openAssignDialog(day.date)}
                        className="mt-1 h-6 px-2 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(employeesByDept).map(([dept, emps]) => (
                  <>
                    <tr key={dept}>
                      <td
                        colSpan={days.length + 1}
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
                      >
                        {dept}
                      </td>
                    </tr>
                    {emps.map((emp) => (
                      <tr key={emp.id}>
                        <td className="sticky left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {emp.name}
                          </div>
                        </td>
                        {days.map((day) => {
                          const schedule = getScheduleForEmployeeAndDate(
                            emp.id,
                            day.date,
                          );

                          return (
                            <td
                              key={day.date}
                              className={`border border-slate-200 dark:border-slate-800 p-1 text-center ${
                                schedule?.is_holiday
                                  ? "bg-red-50 dark:bg-red-950"
                                  : schedule?.shift_id
                                    ? "bg-indigo-50 dark:bg-indigo-950"
                                    : "bg-slate-50 dark:bg-slate-800"
                              }`}
                            >
                              {schedule ? (
                                schedule.is_holiday ? (
                                  <Badge className="bg-red-600 text-white border-0 text-xs">
                                    Libur
                                  </Badge>
                                ) : schedule.shifts ? (
                                  <div className="text-xs">
                                    <div className="font-semibold text-slate-900 dark:text-white">
                                      {schedule.shifts.name}
                                    </div>
                                    <div className="text-slate-500 dark:text-slate-400 mt-1">
                                      {schedule.shifts.start_time.substring(
                                        0,
                                        5,
                                      )}{" "}
                                      -{" "}
                                      {schedule.shifts.end_time.substring(0, 5)}
                                    </div>
                                  </div>
                                ) : null
                              ) : (
                                <span className="text-slate-400 text-xs">
                                  -
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Assign Schedule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Assign Jadwal - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Select Shift or Holiday */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Pilih Shift atau Libur
              </label>
              <div className="flex items-center gap-3">
                <Select
                  value={selectedShift}
                  onValueChange={setSelectedShift}
                  disabled={isHoliday}
                >
                  <SelectTrigger className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    <SelectValue placeholder="Pilih Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {shift.name} ({shift.start_time.substring(0, 5)} -{" "}
                        {shift.end_time.substring(0, 5)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={isHoliday ? "default" : "outline"}
                  onClick={() => {
                    setIsHoliday(!isHoliday);
                    if (!isHoliday) setSelectedShift("");
                  }}
                  className={
                    isHoliday
                      ? "bg-red-600 hover:bg-red-700"
                      : "border-slate-300 dark:border-slate-700"
                  }
                >
                  Hari Libur
                </Button>
              </div>
            </div>

            {/* Select Employees */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Pilih Karyawan ({selectedEmployees.length} dipilih)
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllEmployees}
                    className="border-slate-300 dark:border-slate-700 text-xs"
                  >
                    Pilih Semua
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearAllEmployees}
                    className="border-slate-300 dark:border-slate-700 text-xs"
                  >
                    Bersihkan
                  </Button>
                </div>
              </div>
              <div className="border border-slate-300 dark:border-slate-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                {Object.entries(employeesByDept).map(([dept, emps]) => (
                  <div key={dept} className="mb-4 last:mb-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {dept}
                    </p>
                    <div className="space-y-2">
                      {emps.map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => toggleEmployee(emp.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                            selectedEmployees.includes(emp.id)
                              ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          <span className="text-sm text-slate-900 dark:text-white">
                            {emp.name}
                          </span>
                          {selectedEmployees.includes(emp.id) && (
                            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 border-slate-300 dark:border-slate-700"
              >
                Batal
              </Button>
              <Button
                onClick={handleAssignSchedule}
                disabled={isSubmitting || selectedEmployees.length === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {isSubmitting ? "Menyimpan..." : "Assign Jadwal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
