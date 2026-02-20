"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Clock,
  Settings,
  FileText,
  Calendar,
  ArrowRight,
  Activity,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AdminViewProps {
  employee: any;
}

export default function AdminDashboardView({ employee }: AdminViewProps) {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalCheckIns: 0,
    totalCheckOuts: 0,
    stillActive: 0,
    attendanceRateToday: "0",
    lateCheckIns: 0,
    monthAttendanceCount: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminDashboard();
  }, []);

  const loadAdminDashboard = async () => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const { count: totalEmployees } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true });

    const { data: todayAttendance } = await supabase
      .from("attendance")
      .select("*, employees(name, email)")
      .gte("check_in_time", `${today}T00:00:00`)
      .lte("check_in_time", `${today}T23:59:59`)
      .order("check_in_time", { ascending: false });

    const totalCheckIns = todayAttendance?.length || 0;
    const totalCheckOuts =
      todayAttendance?.filter((att) => att.check_out_time !== null).length || 0;
    const stillActive = totalCheckIns - totalCheckOuts;

    const attendanceRateToday =
      totalEmployees && totalEmployees > 0
        ? ((totalCheckIns / totalEmployees) * 100).toFixed(1)
        : "0";

    const lateCheckIns =
      todayAttendance?.filter((att) => {
        const checkInTime = new Date(att.check_in_time);
        return (
          checkInTime.getHours() > 9 ||
          (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 0)
        );
      }).length || 0;

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { data: monthAttendance } = await supabase
      .from("attendance")
      .select("*")
      .gte("check_in_time", firstDayOfMonth.toISOString());

    const { data: recentData } = await supabase
      .from("attendance")
      .select("*, employees(name, email)")
      .order("check_in_time", { ascending: false })
      .limit(10);

    setStats({
      totalEmployees: totalEmployees || 0,
      totalCheckIns,
      totalCheckOuts,
      stillActive,
      attendanceRateToday,
      lateCheckIns,
      monthAttendanceCount: monthAttendance?.length || 0,
    });

    setRecentAttendance(recentData || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: "Kelola Karyawan",
      description: "Tambah, edit, hapus karyawan",
      icon: Users,
      href: "/dashboard/karyawan",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Riwayat Absensi",
      description: "Lihat semua kehadiran",
      icon: Calendar,
      href: "/dashboard/absensi",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      title: "Laporan",
      description: "Export & analisis data",
      icon: FileText,
      href: "/dashboard/laporan",
      gradient: "from-orange-500 to-red-500",
    },
    {
      title: "Pengaturan",
      description: "Kantor, jam kerja, radius",
      icon: Settings,
      href: "/dashboard/pengaturan",
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");

        * {
          font-family:
            "Inter",
            system-ui,
            -apple-system,
            sans-serif;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.6);
          }
        }

        .animate-slide-in {
          animation: slideIn 0.6s ease-out forwards;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .glass-dark {
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-card {
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.9),
            rgba(30, 41, 59, 0.9)
          );
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          border-color: rgba(168, 85, 247, 0.5);
          box-shadow: 0 20px 40px rgba(168, 85, 247, 0.2);
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div
          className="animate-slide-in flex items-center justify-between"
          style={{ animationDelay: "0.1s" }}
        >
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                Admin Dashboard
              </h1>
              <div className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                <span className="text-2xl">👑</span>
              </div>
            </div>
            <p className="text-lg text-purple-300 font-medium">
              Selamat datang kembali, {employee.name}
            </p>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 hover:scale-105"
            onClick={() => (window.location.href = "/dashboard/pengaturan")}
          >
            <Settings className="h-5 w-5 mr-2" />
            Pengaturan
          </Button>
        </div>

        {/* Main Stats Grid */}
        <div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-in"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="stat-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-2xl">
                <Users className="h-7 w-7 text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-1 font-medium">
              Total Karyawan
            </p>
            <p className="text-4xl font-black text-white mb-2">
              {stats.totalEmployees}
            </p>
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <Activity className="h-4 w-4" />
              <span>Karyawan terdaftar</span>
            </div>
          </div>

          <div className="stat-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-2xl">
                <UserCheck className="h-7 w-7 text-green-400" />
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-1 font-medium">
              Check-in Hari Ini
            </p>
            <p className="text-4xl font-black text-white mb-2">
              {stats.totalCheckIns}
            </p>
            <div className="flex items-center gap-2 text-xs text-red-400">
              <Clock className="h-4 w-4" />
              <span>{stats.lateCheckIns} terlambat</span>
            </div>
          </div>

          <div className="stat-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-2xl">
                <Clock className="h-7 w-7 text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-1 font-medium">
              Sedang Aktif
            </p>
            <p className="text-4xl font-black text-white mb-2">
              {stats.stillActive}
            </p>
            <div className="flex items-center gap-2 text-xs text-purple-400">
              <UserCheck className="h-4 w-4" />
              <span>{stats.totalCheckOuts} sudah check-out</span>
            </div>
          </div>

          <div className="stat-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-500/20 rounded-2xl">
                <TrendingUp className="h-7 w-7 text-pink-400" />
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-1 font-medium">
              Tingkat Kehadiran
            </p>
            <p className="text-4xl font-black text-white mb-2">
              {stats.attendanceRateToday}%
            </p>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-1000"
                style={{ width: `${stats.attendanceRateToday}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="animate-slide-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-2xl font-bold text-white mb-6">Aksi Cepat</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <button
                key={action.href}
                onClick={() => (window.location.href = action.href)}
                className="group glass-dark rounded-3xl p-6 hover:scale-[1.02] transition-all duration-300 text-left"
                style={{
                  animation: `slideIn 0.6s ease-out forwards`,
                  animationDelay: `${0.4 + index * 0.1}s`,
                  opacity: 0,
                }}
              >
                <div
                  className={`p-4 bg-gradient-to-br ${action.gradient} rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <action.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {action.title}
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  {action.description}
                </p>
                <div className="flex items-center gap-2 text-purple-400 font-medium text-sm group-hover:gap-4 transition-all duration-300">
                  <span>Buka</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div
          className="grid lg:grid-cols-2 gap-6 animate-slide-in"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="glass-dark rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Ringkasan Hari Ini
            </h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-2xl border border-green-500/20">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-6 w-6 text-green-400" />
                  <span className="text-white font-medium">Sudah Check-in</span>
                </div>
                <span className="text-3xl font-bold text-green-400">
                  {stats.totalCheckIns}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                <div className="flex items-center gap-3">
                  <UserX className="h-6 w-6 text-orange-400" />
                  <span className="text-white font-medium">Belum Check-in</span>
                </div>
                <span className="text-3xl font-bold text-orange-400">
                  {stats.totalEmployees - stats.totalCheckIns}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-red-400" />
                  <span className="text-white font-medium">Terlambat</span>
                </div>
                <span className="text-3xl font-bold text-red-400">
                  {stats.lateCheckIns}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                  <span className="text-white font-medium">Sedang Bekerja</span>
                </div>
                <span className="text-3xl font-bold text-blue-400">
                  {stats.stillActive}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-dark rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Statistik Bulan Ini
            </h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                <span className="text-white font-medium">Total Kehadiran</span>
                <span className="text-3xl font-bold text-purple-400">
                  {stats.monthAttendanceCount}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-pink-500/10 rounded-2xl border border-pink-500/20">
                <span className="text-white font-medium">
                  Rata-rata per Hari
                </span>
                <span className="text-3xl font-bold text-pink-400">
                  {stats.totalEmployees
                    ? (
                        stats.monthAttendanceCount / new Date().getDate()
                      ).toFixed(1)
                    : "0"}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <span className="text-white font-medium">Hari Kerja</span>
                <span className="text-3xl font-bold text-blue-400">
                  {new Date().getDate()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="animate-slide-in glass-dark rounded-3xl p-8"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Aktivitas Terbaru</h2>
            <Button
              variant="outline"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              onClick={() => (window.location.href = "/dashboard/absensi")}
            >
              Lihat Semua
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          {recentAttendance && recentAttendance.length > 0 ? (
            <div className="space-y-3">
              {recentAttendance.map((attendance, index) => {
                const checkInTime = new Date(attendance.check_in_time);
                const isLate =
                  checkInTime.getHours() > 9 ||
                  (checkInTime.getHours() === 9 &&
                    checkInTime.getMinutes() > 0);
                const hasCheckedOut = !!attendance.check_out_time;

                return (
                  <div
                    key={attendance.id}
                    className="flex items-center justify-between p-5 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-purple-500/50 transition-all duration-300"
                    style={{
                      animation: `slideIn 0.6s ease-out forwards`,
                      animationDelay: `${0.6 + index * 0.05}s`,
                      opacity: 0,
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-2xl ${
                          hasCheckedOut
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {hasCheckedOut ? (
                          <UserCheck className="h-6 w-6" />
                        ) : (
                          <Activity className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">
                          {attendance.employees?.name || "Unknown"}
                        </p>
                        <p className="text-sm text-slate-400">
                          {attendance.employees?.email || ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold text-xl ${
                          isLate ? "text-red-400" : "text-green-400"
                        }`}
                      >
                        {checkInTime.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isLate && " ⚠️"}
                      </p>
                      <p className="text-sm text-slate-400">
                        {checkInTime.toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Activity className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">
                Belum ada aktivitas hari ini
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
