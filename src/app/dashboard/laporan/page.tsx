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
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

type ReportData = {
  employee_id: string;
  employee_name: string;
  department: string | null;
  total_days: number;
  present_days: number;
  late_days: number;
  absent_days: number;
  total_late_minutes: number;
  avg_check_in_time: string | null;
  avg_check_out_time: string | null;
  total_work_hours: number;
};

export default function LaporanPage() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of month
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [departments, setDepartments] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadReports();
  }, [dateFrom, dateTo, filterDepartment]);

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

  const loadReports = async () => {
    setIsLoading(true);

    try {
      // Get all employees
      const { data: employees } = await supabase
        .from("employees")
        .select("id, name, department")
        .eq("is_active", true);

      if (!employees) {
        setReports([]);
        setIsLoading(false);
        return;
      }

      // Filter by department
      const filteredEmployees =
        filterDepartment === "all"
          ? employees
          : employees.filter((e: any) => e.department === filterDepartment);

      // Calculate date range
      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);

      const totalDays =
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

      // Get attendance data for each employee
      const reportsData: ReportData[] = await Promise.all(
        filteredEmployees.map(async (emp: any) => {
          const { data: attendances } = await supabase
            .from("attendances")
            .select("*")
            .eq("employee_id", emp.id)
            .eq("type", "check_in")
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString());

          const presentDays = attendances?.length || 0;
          const lateDays =
            attendances?.filter((a: any) => a.late_minutes > 0).length || 0;
          const absentDays = totalDays - presentDays;

          const totalLateMinutes =
            attendances?.reduce(
              (sum: number, a: any) => sum + (a.late_minutes || 0),
              0,
            ) || 0;

          // Calculate average times
          let avgCheckInTime = null;
          let avgCheckOutTime = null;
          let totalWorkHours = 0;

          if (attendances && attendances.length > 0) {
            const checkInTimes = attendances
              .map(
                (a: any) =>
                  new Date(a.created_at).getHours() * 60 +
                  new Date(a.created_at).getMinutes(),
              )
              .filter((t: number) => !isNaN(t));

            if (checkInTimes.length > 0) {
              const avgMinutes =
                checkInTimes.reduce((a: number, b: number) => a + b, 0) /
                checkInTimes.length;
              const hours = Math.floor(avgMinutes / 60);
              const mins = Math.floor(avgMinutes % 60);
              avgCheckInTime = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
            }

            // Get checkout data
            const { data: checkouts } = await supabase
              .from("attendances")
              .select("*")
              .eq("employee_id", emp.id)
              .eq("type", "check_out")
              .gte("created_at", startDate.toISOString())
              .lte("created_at", endDate.toISOString());

            if (checkouts && checkouts.length > 0) {
              const checkOutTimes = checkouts
                .map(
                  (a: any) =>
                    new Date(a.created_at).getHours() * 60 +
                    new Date(a.created_at).getMinutes(),
                )
                .filter((t: number) => !isNaN(t));

              if (checkOutTimes.length > 0) {
                const avgMinutes =
                  checkOutTimes.reduce((a: number, b: number) => a + b, 0) /
                  checkOutTimes.length;
                const hours = Math.floor(avgMinutes / 60);
                const mins = Math.floor(avgMinutes % 60);
                avgCheckOutTime = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
              }

              // Calculate total work hours
              totalWorkHours = checkouts.reduce((sum: number, co: any) => {
                const checkOut = new Date(co.created_at);
                const checkIn = attendances.find((ci: any) => {
                  const ciDate = new Date(ci.created_at);
                  return ciDate.toDateString() === checkOut.toDateString();
                });

                if (checkIn) {
                  const diff =
                    checkOut.getTime() - new Date(checkIn.created_at).getTime();
                  return sum + diff / (1000 * 60 * 60); // Convert to hours
                }
                return sum;
              }, 0);
            }
          }

          return {
            employee_id: emp.id,
            employee_name: emp.name,
            department: emp.department,
            total_days: totalDays,
            present_days: presentDays,
            late_days: lateDays,
            absent_days: absentDays,
            total_late_minutes: totalLateMinutes,
            avg_check_in_time: avgCheckInTime,
            avg_check_out_time: avgCheckOutTime,
            total_work_hours: totalWorkHours,
          };
        }),
      );

      setReports(reportsData);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Nama",
      "Department",
      "Total Hari",
      "Hadir",
      "Terlambat",
      "Absen",
      "Total Terlambat (mnt)",
      "Avg Check In",
      "Avg Check Out",
      "Total Jam Kerja",
    ];

    const rows = reports.map((r) => [
      r.employee_name,
      r.department || "",
      r.total_days,
      r.present_days,
      r.late_days,
      r.absent_days,
      r.total_late_minutes,
      r.avg_check_in_time || "",
      r.avg_check_out_time || "",
      r.total_work_hours.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan_absensi_${dateFrom}_to_${dateTo}.csv`;
    a.click();
  };

  // Calculate summary
  const totalEmployees = reports.length;
  const avgAttendanceRate =
    reports.length > 0
      ? reports.reduce(
          (sum, r) => sum + (r.present_days / r.total_days) * 100,
          0,
        ) / reports.length
      : 0;
  const totalLateCount = reports.reduce((sum, r) => sum + r.late_days, 0);
  const totalAbsentCount = reports.reduce((sum, r) => sum + r.absent_days, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Laporan & Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Analisis kehadiran dan performa karyawan
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          disabled={reports.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Dari Tanggal
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Sampai Tanggal
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Department
              </label>
              <Select
                value={filterDepartment}
                onValueChange={setFilterDepartment}
              >
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                &nbsp;
              </label>
              <Button
                onClick={loadReports}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? "Memuat..." : "Generate Laporan"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Karyawan
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {totalEmployees}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Avg Attendance Rate
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {avgAttendanceRate.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Terlambat
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {totalLateCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Absen
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {totalAbsentCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
            Detail Laporan Karyawan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Memuat laporan...
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Tidak ada data. Pilih rentang tanggal dan klik "Generate Laporan"
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Department
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Hadir
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Terlambat
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Absen
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Total Terlambat
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Avg Check In
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Total Jam Kerja
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Attendance Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {reports.map((report) => {
                    const attendanceRate =
                      (report.present_days / report.total_days) * 100;

                    return (
                      <tr
                        key={report.employee_id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                          {report.employee_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {report.department || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            {report.present_days}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            {report.late_days}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            {report.absent_days}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-900 dark:text-white font-medium">
                          {report.total_late_minutes} mnt
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-900 dark:text-white">
                          {report.avg_check_in_time || "-"}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-900 dark:text-white font-medium">
                          {report.total_work_hours.toFixed(1)} jam
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              attendanceRate >= 90
                                ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                                : attendanceRate >= 75
                                  ? "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300"
                                  : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {attendanceRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
