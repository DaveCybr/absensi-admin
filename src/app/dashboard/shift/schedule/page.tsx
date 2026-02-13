"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Calendar,
  Users,
  Plus,
  Check,
  Copy,
  Zap,
  RefreshCw,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

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
  work_days: string[] | null; // ← ADD null
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

const DAY_MAP: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
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

  // Dialog states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk assign state
  const [bulkForm, setBulkForm] = useState({
    dateFrom: "",
    dateTo: "",
    selectedEmployees: [] as string[],
    selectedShift: "",
    isHoliday: false,
    skipWeekends: false,
  });

  // Template state
  const [templateForm, setTemplateForm] = useState({
    selectedShift: "",
    applyToAllEmployees: true,
    selectedEmployees: [] as string[],
  });

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
        .eq("is_active", true)
        .order("department, name"),
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

  // ============================================
  // BULK ASSIGN - DATE RANGE
  // ============================================
  const handleBulkAssign = async () => {
    if (
      !bulkForm.dateFrom ||
      !bulkForm.dateTo ||
      bulkForm.selectedEmployees.length === 0
    )
      return;

    setIsSubmitting(true);
    try {
      const startDate = new Date(bulkForm.dateFrom);
      const endDate = new Date(bulkForm.dateTo);

      const scheduleData: any[] = [];
      const datesToDelete: string[] = [];

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split("T")[0];
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        if (bulkForm.skipWeekends && isWeekend) continue;

        datesToDelete.push(dateStr);

        bulkForm.selectedEmployees.forEach((empId) => {
          scheduleData.push({
            employee_id: empId,
            shift_id: bulkForm.selectedShift || null,
            date: dateStr,
            is_holiday: bulkForm.isHoliday,
          });
        });
      }

      await supabase
        .from("schedules")
        .delete()
        .in("date", datesToDelete)
        .in("employee_id", bulkForm.selectedEmployees);

      await supabase.from("schedules").insert(scheduleData);

      setIsBulkDialogOpen(false);
      resetBulkForm();
      loadSchedules();
      alert(
        `✅ Berhasil assign ${scheduleData.length} jadwal untuk ${bulkForm.selectedEmployees.length} karyawan`,
      );
    } catch (error) {
      console.error("Error bulk assign:", error);
      alert("❌ Gagal assign jadwal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // APPLY TEMPLATE
  // ============================================
  const handleApplyTemplate = async () => {
    if (!templateForm.selectedShift) return;

    const selectedShiftData = shifts.find(
      (s) => s.id === templateForm.selectedShift,
    );
    if (!selectedShiftData) return;

    setIsSubmitting(true);
    try {
      const days = getDaysInMonth();
      const scheduleData: any[] = [];
      const datesToDelete: string[] = [];

      const employeesToAssign = templateForm.applyToAllEmployees
        ? employees.map((e) => e.id)
        : templateForm.selectedEmployees;

      days.forEach((day) => {
        const date = new Date(day.date);
        const dayOfWeek = DAY_MAP[date.getDay()];

        if (selectedShiftData.work_days?.includes(dayOfWeek)) {
          datesToDelete.push(day.date);

          employeesToAssign.forEach((empId) => {
            scheduleData.push({
              employee_id: empId,
              shift_id: templateForm.selectedShift,
              date: day.date,
              is_holiday: false,
            });
          });
        }
      });

      await supabase
        .from("schedules")
        .delete()
        .in("date", datesToDelete)
        .in("employee_id", employeesToAssign);

      await supabase.from("schedules").insert(scheduleData);

      setIsTemplateDialogOpen(false);
      resetTemplateForm();
      loadSchedules();
      alert(
        `✅ Berhasil apply template untuk ${employeesToAssign.length} karyawan`,
      );
    } catch (error) {
      console.error("Error apply template:", error);
      alert("❌ Gagal apply template");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // COPY FROM PREVIOUS MONTH
  // ============================================
  const handleCopyFromPreviousMonth = async () => {
    setIsSubmitting(true);
    try {
      const [year, month] = selectedMonth.split("-").map(Number);
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;

      const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
      const prevEndDate = new Date(prevYear, prevMonth, 0)
        .toISOString()
        .split("T")[0];

      const { data: prevSchedules } = await supabase
        .from("schedules")
        .select("*")
        .gte("date", prevStartDate)
        .lte("date", prevEndDate);

      if (!prevSchedules || prevSchedules.length === 0) {
        alert("⚠️ Tidak ada jadwal di bulan sebelumnya");
        return;
      }

      const currentMonthDays = getDaysInMonth();
      const scheduleData: any[] = [];

      prevSchedules.forEach((prevSched: any) => {
        const prevDate = new Date(prevSched.date);
        const dayOfMonth = prevDate.getDate();

        const currentDay = currentMonthDays.find((d) => d.day === dayOfMonth);
        if (currentDay) {
          scheduleData.push({
            employee_id: prevSched.employee_id,
            shift_id: prevSched.shift_id,
            date: currentDay.date,
            is_holiday: prevSched.is_holiday,
          });
        }
      });

      const currentDates = currentMonthDays.map((d) => d.date);
      await supabase.from("schedules").delete().in("date", currentDates);
      await supabase.from("schedules").insert(scheduleData);

      setIsCopyDialogOpen(false);
      loadSchedules();
      alert(
        `✅ Berhasil copy ${scheduleData.length} jadwal dari bulan sebelumnya`,
      );
    } catch (error) {
      console.error("Error copying schedules:", error);
      alert("❌ Gagal copy jadwal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetBulkForm = () => {
    setBulkForm({
      dateFrom: "",
      dateTo: "",
      selectedEmployees: [],
      selectedShift: "",
      isHoliday: false,
      skipWeekends: false,
    });
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      selectedShift: "",
      applyToAllEmployees: true,
      selectedEmployees: [],
    });
  };

  const toggleEmployeeInBulk = (empId: string) => {
    setBulkForm((prev) => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(empId)
        ? prev.selectedEmployees.filter((id) => id !== empId)
        : [...prev.selectedEmployees, empId],
    }));
  };

  const toggleEmployeeInTemplate = (empId: string) => {
    setTemplateForm((prev) => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(empId)
        ? prev.selectedEmployees.filter((id) => id !== empId)
        : [...prev.selectedEmployees, empId],
    }));
  };

  const selectAllInBulk = () => {
    setBulkForm((prev) => ({
      ...prev,
      selectedEmployees: employees.map((e) => e.id),
    }));
  };

  const clearAllInBulk = () => {
    setBulkForm((prev) => ({ ...prev, selectedEmployees: [] }));
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Penjadwalan Karyawan
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Kelola jadwal shift dengan bulk operations yang efisien
        </p>
      </div>

      {/* Month Selector & Info */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 border-0 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Calendar className="w-10 h-10" />
              <div>
                <p className="text-sm opacity-90">Menampilkan Jadwal</p>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="mt-1 bg-white/20 backdrop-blur border-0 rounded-lg px-4 py-2 text-lg font-bold text-white"
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{employees.length}</p>
              <p className="text-sm opacity-90">Total Karyawan</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - IMPROVED */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          onClick={() => setIsBulkDialogOpen(true)}
          className="cursor-pointer border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-lg transition-all bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900"
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                  Bulk Assign
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Assign banyak karyawan sekaligus untuk rentang tanggal
                  tertentu
                </p>
                <Badge className="mt-3 bg-indigo-600 text-white">
                  Paling Cepat
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setIsTemplateDialogOpen(true)}
          className="cursor-pointer border-2 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 hover:shadow-lg transition-all bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                  Apply Template
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Auto assign berdasarkan hari kerja shift (Senin-Jumat, dll)
                </p>
                <Badge className="mt-3 bg-green-600 text-white">
                  Paling Smart
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setIsCopyDialogOpen(true)}
          className="cursor-pointer border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900"
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
                <Copy className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                  Copy Bulan Lalu
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Duplikasi jadwal dari bulan sebelumnya ke bulan ini
                </p>
                <Badge className="mt-3 bg-purple-600 text-white">
                  Paling Mudah
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend - IMPROVED */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-400 to-green-600 border-2 border-green-700 shadow-sm" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Ada Shift
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-400 to-red-600 border-2 border-red-700 shadow-sm" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Hari Libur
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Belum Dijadwalkan
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950 border-2 border-amber-300 dark:border-amber-700" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Weekend
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Calendar - IMPROVED UI */}
      {isLoading ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-4 text-slate-500 dark:text-slate-400">
                Memuat jadwal...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 overflow-x-auto">
            <table className="w-full border-collapse min-w-max">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-300 dark:border-slate-700 px-6 py-4 text-left text-sm font-bold text-slate-900 dark:text-white min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Karyawan
                    </div>
                  </th>
                  {days.map((day) => (
                    <th
                      key={`header-${day.date}`}
                      className={`border-2 px-3 py-3 text-center min-w-[100px] ${
                        day.isWeekend
                          ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        {day.dayName}
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {day.day}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(employeesByDept).map(([dept, emps]) => (
                  <>
                    <tr key={`dept-${dept}`}>
                      <td
                        colSpan={days.length + 1}
                        className="bg-gradient-to-r from-indigo-100 to-indigo-50 dark:from-indigo-950 dark:to-indigo-900 border-2 border-indigo-300 dark:border-indigo-800 px-6 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                          <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">
                            {dept}
                          </span>
                          <Badge
                            variant="outline"
                            className="ml-2 border-indigo-300 text-indigo-700"
                          >
                            {emps.length} karyawan
                          </Badge>
                        </div>
                      </td>
                    </tr>
                    {emps.map((emp) => (
                      <tr
                        key={`emp-${emp.id}`}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                {emp.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {emp.department || "No Dept"}
                              </div>
                            </div>
                          </div>
                        </td>
                        {days.map((day) => {
                          const schedule = getScheduleForEmployeeAndDate(
                            emp.id,
                            day.date,
                          );

                          return (
                            <td
                              key={`cell-${emp.id}-${day.date}`}
                              className={`border-2 p-2 text-center transition-all ${
                                schedule?.is_holiday
                                  ? "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-950 dark:to-red-900 border-red-300 dark:border-red-800"
                                  : schedule?.shift_id
                                    ? "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-950 dark:to-green-900 border-green-300 dark:border-green-800"
                                    : day.isWeekend
                                      ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
                                      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                              }`}
                            >
                              {schedule ? (
                                schedule.is_holiday ? (
                                  <div className="py-3">
                                    <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white border-0 text-xs font-bold px-3 py-1 shadow-sm">
                                      LIBUR
                                    </Badge>
                                  </div>
                                ) : schedule.shifts ? (
                                  <div className="py-2 px-1">
                                    <div className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                                      {schedule.shifts.name}
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
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
                                <div className="py-4 text-slate-400 dark:text-slate-600 text-lg font-light">
                                  —
                                </div>
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

      {/* Bulk Assign Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2 text-xl">
              <Zap className="w-6 h-6 text-indigo-600" />
              Bulk Assign Jadwal
            </DialogTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Assign shift untuk banyak karyawan sekaligus dalam rentang tanggal
              tertentu
            </p>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Dari Tanggal *
                </Label>
                <Input
                  type="date"
                  value={bulkForm.dateFrom}
                  onChange={(e) =>
                    setBulkForm({ ...bulkForm, dateFrom: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Sampai Tanggal *
                </Label>
                <Input
                  type="date"
                  value={bulkForm.dateTo}
                  onChange={(e) =>
                    setBulkForm({ ...bulkForm, dateTo: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-base"
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Pilihan Shift
              </Label>
              <div className="flex items-center gap-3">
                <Select
                  value={bulkForm.selectedShift}
                  onValueChange={(val) =>
                    setBulkForm({ ...bulkForm, selectedShift: val })
                  }
                  disabled={bulkForm.isHoliday}
                >
                  <SelectTrigger className="flex-1 bg-slate-50 dark:bg-slate-800 text-base h-12">
                    <SelectValue placeholder="Pilih Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{shift.name}</span>
                          <span className="text-xs text-slate-500">
                            ({shift.start_time.substring(0, 5)} -{" "}
                            {shift.end_time.substring(0, 5)})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant={bulkForm.isHoliday ? "default" : "outline"}
                  onClick={() =>
                    setBulkForm({
                      ...bulkForm,
                      isHoliday: !bulkForm.isHoliday,
                      selectedShift: "",
                    })
                  }
                  className={`h-12 px-6 ${
                    bulkForm.isHoliday ? "bg-red-600 hover:bg-red-700" : ""
                  }`}
                >
                  Hari Libur
                </Button>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={bulkForm.skipWeekends}
                  onChange={(e) =>
                    setBulkForm({
                      ...bulkForm,
                      skipWeekends: e.target.checked,
                    })
                  }
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Skip weekends (Sabtu & Minggu)
                </span>
              </label>
            </div>

            {/* Select Employees */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Karyawan ({bulkForm.selectedEmployees.length} dipilih)
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={selectAllInBulk}
                  >
                    Pilih Semua
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearAllInBulk}
                  >
                    Bersihkan
                  </Button>
                </div>
              </div>
              <div className="border-2 border-slate-300 dark:border-slate-700 rounded-lg p-4 max-h-72 overflow-y-auto">
                {Object.entries(employeesByDept).map(([dept, emps]) => (
                  <div key={`bulk-dept-${dept}`} className="mb-4 last:mb-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                      {dept}
                    </p>
                    <div className="space-y-2">
                      {emps.map((emp) => (
                        <button
                          key={`bulk-emp-${emp.id}`}
                          type="button"
                          onClick={() => toggleEmployeeInBulk(emp.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
                            bulkForm.selectedEmployees.includes(emp.id)
                              ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-400 dark:border-indigo-600 shadow-sm"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {emp.name}
                          </span>
                          {bulkForm.selectedEmployees.includes(emp.id) && (
                            <Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBulkDialogOpen(false)}
                className="flex-1 h-12 border-2"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleBulkAssign}
                disabled={
                  isSubmitting ||
                  !bulkForm.dateFrom ||
                  !bulkForm.dateTo ||
                  bulkForm.selectedEmployees.length === 0
                }
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-semibold"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memproses...
                  </span>
                ) : (
                  `Assign ${bulkForm.selectedEmployees.length} Karyawan`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
      >
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2 text-xl">
              <RefreshCw className="w-6 h-6 text-green-600" />
              Apply Template Shift
            </DialogTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Otomatis assign shift sesuai dengan hari kerja yang dikonfigurasi
            </p>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Cara Kerja:</strong> Template akan otomatis assign
                  shift berdasarkan <strong>work days</strong> yang
                  dikonfigurasi. Misalnya shift dengan work days "Monday-Friday"
                  akan otomatis di-assign hanya untuk hari Senin-Jumat saja.
                </p>
              </div>
            </div>

            {/* Select Shift */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Pilih Shift Template *
              </Label>
              <Select
                value={templateForm.selectedShift}
                onValueChange={(val) =>
                  setTemplateForm({ ...templateForm, selectedShift: val })
                }
              >
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 text-base h-12">
                  <SelectValue placeholder="Pilih Shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      <div className="py-1">
                        <div className="font-semibold">{shift.name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Work Days:{" "}
                          {shift.work_days?.join(", ") || "Belum diatur"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {shift.start_time.substring(0, 5)} -{" "}
                          {shift.end_time.substring(0, 5)}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Apply to All or Select */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={templateForm.applyToAllEmployees}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      applyToAllEmployees: e.target.checked,
                    })
                  }
                  className="w-5 h-5"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Apply ke semua karyawan aktif ({employees.length} karyawan)
                </span>
              </label>

              {!templateForm.applyToAllEmployees && (
                <div className="border-2 border-slate-300 dark:border-slate-700 rounded-lg p-4 max-h-72 overflow-y-auto">
                  {Object.entries(employeesByDept).map(([dept, emps]) => (
                    <div
                      key={`template-dept-${dept}`}
                      className="mb-4 last:mb-0"
                    >
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                        {dept}
                      </p>
                      <div className="space-y-2">
                        {emps.map((emp) => (
                          <button
                            key={`template-emp-${emp.id}`}
                            type="button"
                            onClick={() => toggleEmployeeInTemplate(emp.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
                              templateForm.selectedEmployees.includes(emp.id)
                                ? "bg-green-50 dark:bg-green-950 border-green-400 dark:border-green-600 shadow-sm"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {emp.name}
                            </span>
                            {templateForm.selectedEmployees.includes(
                              emp.id,
                            ) && (
                              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTemplateDialogOpen(false)}
                className="flex-1 h-12 border-2"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleApplyTemplate}
                disabled={isSubmitting || !templateForm.selectedShift}
                className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-base font-semibold"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memproses...
                  </span>
                ) : (
                  "Apply Template"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Previous Month Dialog */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2 text-xl">
              <Copy className="w-6 h-6 text-purple-600" />
              Copy Jadwal Bulan Lalu
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-purple-50 dark:bg-purple-950 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  ⚠️ Ini akan <strong>menghapus semua jadwal</strong> di bulan
                  ini dan menggantinya dengan copy dari bulan lalu.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Jadwal akan di-copy berdasarkan tanggal yang sama. Misalnya:
                tanggal 15 bulan lalu → tanggal 15 bulan ini.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCopyDialogOpen(false)}
                className="flex-1 h-12 border-2"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleCopyFromPreviousMonth}
                disabled={isSubmitting}
                className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-base font-semibold"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memproses...
                  </span>
                ) : (
                  "Copy Jadwal"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
