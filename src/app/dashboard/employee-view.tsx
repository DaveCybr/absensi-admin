"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Calendar,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface EmployeeViewProps {
  employee: any;
}

export default function EmployeeDashboardView({ employee }: EmployeeViewProps) {
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [monthStats, setMonthStats] = useState({
    totalDays: 0,
    onTimeDays: 0,
    lateDays: 0,
    attendanceRate: "0",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data: todayData } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employee.id)
      .gte("check_in_time", `${today}T00:00:00`)
      .lte("check_in_time", `${today}T23:59:59`)
      .order("check_in_time", { ascending: false })
      .limit(1)
      .single();

    setTodayAttendance(todayData);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentData } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employee.id)
      .gte("check_in_time", sevenDaysAgo.toISOString())
      .order("check_in_time", { ascending: false })
      .limit(7);

    setRecentAttendance(recentData || []);

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { data: monthData } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employee.id)
      .gte("check_in_time", firstDayOfMonth.toISOString());

    const totalDaysThisMonth = monthData?.length || 0;
    const onTimeDays =
      monthData?.filter((att) => {
        const checkInTime = new Date(att.check_in_time);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        return hours < 9 || (hours === 9 && minutes === 0);
      }).length || 0;

    const lateDays = totalDaysThisMonth - onTimeDays;
    const attendanceRate =
      totalDaysThisMonth > 0
        ? ((onTimeDays / totalDaysThisMonth) * 100).toFixed(1)
        : "0";

    setMonthStats({
      totalDays: totalDaysThisMonth,
      onTimeDays,
      lateDays,
      attendanceRate,
    });

    setLoading(false);
  };

  const hasCheckedInToday = !!todayAttendance;
  const hasCheckedOutToday = todayAttendance?.check_out_time ? true : false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");

        * {
          font-family:
            "Plus Jakarta Sans",
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

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .animate-slide-in {
          animation: slideIn 0.6s ease-out forwards;
        }

        .animate-pulse-soft {
          animation: pulse 2s ease-in-out infinite;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .gradient-border {
          position: relative;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2px;
          border-radius: 16px;
        }

        .gradient-border::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .gradient-border:hover::before {
          opacity: 0.2;
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="animate-slide-in" style={{ animationDelay: "0.1s" }}>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
            Selamat Datang, {employee.name}! 👋
          </h1>
          <p className="text-lg text-slate-600 font-medium">
            {hasCheckedInToday && !hasCheckedOutToday
              ? "🚀 Semangat bekerja hari ini!"
              : hasCheckedOutToday
                ? "✨ Terima kasih atas kerja keras hari ini"
                : "⏰ Jangan lupa check-in untuk memulai hari!"}
          </p>
        </div>

        {/* Check-in/out Hero Card */}
        <div className="animate-slide-in" style={{ animationDelay: "0.2s" }}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 shadow-2xl">
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-300 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Clock className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Absensi Hari Ini
                </h2>
              </div>

              {todayAttendance ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                      <p className="text-sm text-white/80 mb-2 font-medium">
                        Check-in
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {new Date(
                          todayAttendance.check_in_time,
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {todayAttendance.check_out_time ? (
                      <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                        <p className="text-sm text-white/80 mb-2 font-medium">
                          Check-out
                        </p>
                        <p className="text-3xl font-bold text-white">
                          {new Date(
                            todayAttendance.check_out_time,
                          ).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ) : (
                      <Button
                        size="lg"
                        className="h-full bg-white hover:bg-white/90 text-indigo-600 font-bold text-lg rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02]"
                        onClick={() => (window.location.href = "/check-out")}
                      >
                        <span className="flex items-center gap-2">
                          Check Out Sekarang
                          <ArrowRight className="h-5 w-5" />
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full h-20 bg-white hover:bg-white/90 text-indigo-600 font-bold text-xl rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => (window.location.href = "/check-in")}
                >
                  <span className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6" />
                    Check In Sekarang
                    <ArrowRight className="h-6 w-6" />
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          className="grid md:grid-cols-3 gap-6 animate-slide-in"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="glass-card rounded-3xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 font-medium mb-1">
                  Kehadiran Bulan Ini
                </p>
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {monthStats.totalDays}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                {monthStats.onTimeDays} tepat waktu
              </span>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                {monthStats.lateDays} terlambat
              </span>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-100 rounded-2xl">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 font-medium mb-1">
                  Tingkat Kehadiran
                </p>
                <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {monthStats.attendanceRate}%
                </p>
              </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                style={{ width: `${monthStats.attendanceRate}%` }}
              />
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-2xl">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 font-medium mb-1">
                  Status Hari Ini
                </p>
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {hasCheckedOutToday ? "✓" : hasCheckedInToday ? "⚡" : "⏳"}
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-700">
              {hasCheckedOutToday
                ? "Sudah check-out hari ini"
                : hasCheckedInToday
                  ? "Sedang bekerja"
                  : "Belum check-in"}
            </p>
          </div>
        </div>

        {/* Recent Attendance History */}
        <div className="animate-slide-in" style={{ animationDelay: "0.4s" }}>
          <div className="glass-card rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Riwayat Kehadiran (7 Hari Terakhir)
            </h2>
            {recentAttendance && recentAttendance.length > 0 ? (
              <div className="space-y-3">
                {recentAttendance.map((attendance, index) => {
                  const checkInDate = new Date(attendance.check_in_time);
                  const checkInTime = checkInDate.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const checkOutTime = attendance.check_out_time
                    ? new Date(attendance.check_out_time).toLocaleTimeString(
                        "id-ID",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
                    : "-";

                  const isLate =
                    checkInDate.getHours() > 9 ||
                    (checkInDate.getHours() === 9 &&
                      checkInDate.getMinutes() > 0);

                  return (
                    <div
                      key={attendance.id}
                      className="flex items-center justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                      style={{
                        animation: `slideIn 0.6s ease-out forwards`,
                        animationDelay: `${0.5 + index * 0.1}s`,
                        opacity: 0,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-2xl ${
                            attendance.check_out_time
                              ? "bg-green-100"
                              : "bg-blue-100"
                          }`}
                        >
                          {attendance.check_out_time ? (
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                          ) : (
                            <Clock className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {checkInDate.toLocaleDateString("id-ID", {
                              weekday: "long",
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          <p className="text-sm text-slate-600">
                            {checkInDate.toLocaleDateString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-1">
                            Check-in
                          </p>
                          <p
                            className={`font-bold text-lg ${
                              isLate ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {checkInTime}
                            {isLate && " ⚠️"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-1">
                            Check-out
                          </p>
                          <p className="font-bold text-lg text-slate-900">
                            {checkOutTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <XCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">
                  Belum ada riwayat kehadiran
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
