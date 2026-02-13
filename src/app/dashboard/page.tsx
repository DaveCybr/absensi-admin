import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
} from "lucide-react";
import AttendanceChart from "@/components/dashboard/AttendanceChart";
import DepartmentStats from "@/components/dashboard/DepartmentStats";
// import MonthlyComparison from "@/components/dashboard/MonthlyComparison";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Total karyawan aktif
  const { count: totalKaryawan } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Hari ini
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check in hari ini
  const { count: checkInHariIni } = await supabase
    .from("attendances")
    .select("*", { count: "exact", head: true })
    .eq("type", "check_in")
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString());

  // Check out hari ini
  const { count: checkOutHariIni } = await supabase
    .from("attendances")
    .select("*", { count: "exact", head: true })
    .eq("type", "check_out")
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString());

  // Belum check in
  const belumCheckIn = (totalKaryawan || 0) - (checkInHariIni || 0);

  // Terlambat hari ini
  const { count: terlambatHariIni } = await supabase
    .from("attendances")
    .select("*", { count: "exact", head: true })
    .eq("type", "check_in")
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString())
    .gt("late_minutes", 0);

  // Data minggu lalu untuk comparison
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekEnd = new Date(lastWeek);
  lastWeekEnd.setDate(lastWeekEnd.getDate() + 1);

  const { count: checkInLastWeek } = await supabase
    .from("attendances")
    .select("*", { count: "exact", head: true })
    .eq("type", "check_in")
    .gte("created_at", lastWeek.toISOString())
    .lt("created_at", lastWeekEnd.toISOString());

  // Persentase perubahan
  const checkInChange =
    checkInLastWeek && checkInLastWeek > 0
      ? (((checkInHariIni || 0) - checkInLastWeek) / checkInLastWeek) * 100
      : 0;

  // Get last 7 days attendance for chart
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: last7DaysData } = await supabase
    .from("attendances")
    .select("created_at, type")
    .gte("created_at", sevenDaysAgo.toISOString())
    .lt("created_at", tomorrow.toISOString());

  // Get department stats
  const { data: departmentData } = await supabase
    .from("employees")
    .select("department")
    .eq("is_active", true);

  // Recent attendance
  const { data: recentAttendance } = await supabase
    .from("attendances")
    .select(
      `
      *,
      employees (
        name,
        email,
        department,
        position,
        face_image_url
      )
    `,
    )
    .gte("created_at", today.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  const stats = [
    {
      title: "Total Karyawan Aktif",
      value: totalKaryawan ?? 0,
      icon: Users,
      change: null,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Sudah Check In",
      value: checkInHariIni ?? 0,
      icon: UserCheck,
      change: checkInChange,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Belum Check In",
      value: belumCheckIn,
      icon: UserX,
      change: null,
      color: "from-orange-500 to-orange-600",
    },
    {
      title: "Terlambat Hari Ini",
      value: terlambatHariIni ?? 0,
      icon: AlertCircle,
      change: null,
      color: "from-red-500 to-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change !== null && stat.change > 0;
          const isNegative = stat.change !== null && stat.change < 0;

          return (
            <Card
              key={index}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {stat.change !== null && (
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${
                        isPositive
                          ? "text-green-600"
                          : isNegative
                            ? "text-red-600"
                            : "text-slate-500"
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : isNegative ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : null}
                      {Math.abs(stat.change).toFixed(1)}%
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {stat.title}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Chart */}
        <AttendanceChart data={last7DaysData || []} />

        {/* Department Distribution */}
        <DepartmentStats data={departmentData || []} />
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Aktivitas Absensi Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentAttendance && recentAttendance.length > 0 ? (
                recentAttendance.map((record: any) => {
                  const time = new Date(record.created_at).toLocaleTimeString(
                    "id-ID",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  );

                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="relative">
                        {record.employees?.face_image_url ? (
                          <img
                            src={record.employees.face_image_url}
                            alt={record.employees.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <Users className="w-5 h-5 text-slate-500" />
                          </div>
                        )}
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                            record.type === "check_in"
                              ? "bg-green-500"
                              : "bg-orange-500"
                          }`}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {record.employees?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {record.employees?.department || "No Department"} •{" "}
                          {record.type === "check_in"
                            ? "Check In"
                            : "Check Out"}
                        </p>
                      </div>

                      {/* Time */}
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {time}
                        </p>
                        {record.late_minutes > 0 && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            +{record.late_minutes} mnt
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Belum ada aktivitas hari ini
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <a
                href="/dashboard/karyawan"
                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all group"
              >
                <Users className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Kelola Karyawan
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tambah & edit data
                </p>
              </a>

              <a
                href="/dashboard/shift"
                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all group"
              >
                <Calendar className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Atur Jadwal
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Shift & schedule
                </p>
              </a>

              <a
                href="/dashboard/laporan"
                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all group"
              >
                <Clock className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Lihat Laporan
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Export & analisis
                </p>
              </a>

              <a
                href="/dashboard/pengaturan"
                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all group"
              >
                <AlertCircle className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Pengaturan
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Lokasi & sistem
                </p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
