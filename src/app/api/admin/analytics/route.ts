// FILE: app/api/admin/analytics/route.ts
// PURPOSE: Admin dashboard analytics

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ============================================
// GET ANALYTICS (Admin Only)
// ============================================
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period") || "today"; // today, week, month

    // Check authentication & admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentEmployee } = await supabase
      .from("employees")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (currentEmployee?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    // Get total employees
    const { count: totalEmployees } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Get check-ins for period
    const { data: checkIns, count: checkInCount } = await supabase
      .from("attendances")
      .select("*", { count: "exact" })
      .eq("type", "check_in")
      .gte("created_at", startDate.toISOString());

    // Get check-outs for period
    const { count: checkOutCount } = await supabase
      .from("attendances")
      .select("*", { count: "exact", head: true })
      .eq("type", "check_out")
      .gte("created_at", startDate.toISOString());

    // Calculate attendance rate
    const attendanceRate = totalEmployees
      ? (((checkInCount || 0) / (totalEmployees || 1)) * 100).toFixed(1)
      : 0;

    // Calculate average check-in time
    let avgCheckInTime = null;
    if (checkIns && checkIns.length > 0) {
      const times = checkIns.map((record: any) => {
        const time = new Date(record.created_at);
        return time.getHours() * 60 + time.getMinutes();
      });
      const avgMinutes =
        times.reduce((a: number, b: number) => a + b, 0) / times.length;
      const hours = Math.floor(avgMinutes / 60);
      const minutes = Math.round(avgMinutes % 60);
      avgCheckInTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }

    // Count late check-ins (after 08:15)
    const lateCheckIns =
      checkIns?.filter((record: any) => {
        const time = new Date(record.created_at);
        const minutes = time.getHours() * 60 + time.getMinutes();
        return minutes > 8 * 60 + 15; // After 08:15
      }).length || 0;

    // Get face verification stats
    const { data: verificationLogs } = await supabase
      .from("attendances")
      .select("face_confidence")
      .gte("created_at", startDate.toISOString())
      .not("face_confidence", "is", null);

    const avgConfidence =
      verificationLogs && verificationLogs.length > 0
        ? (
            (verificationLogs.reduce(
              (sum: number, log: any) => sum + (log.face_confidence || 0),
              0,
            ) /
              verificationLogs.length) *
            100
          ).toFixed(1)
        : 0;

    // Get department-wise breakdown
    const { data: departmentStats } = await supabase
      .from("employees")
      .select("department");

    const departmentCounts = departmentStats?.reduce((acc: any, emp: any) => {
      const dept = emp.department || "Unassigned";
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    // Get today's attendance by hour (for chart)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayCheckIns } = await supabase
      .from("attendances")
      .select("created_at")
      .eq("type", "check_in")
      .gte("created_at", todayStart.toISOString());

    const checkInsByHour = todayCheckIns?.reduce((acc: any, record: any) => {
      const hour = new Date(record.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      period,
      data: {
        overview: {
          totalEmployees: totalEmployees || 0,
          checkInsToday: checkInCount || 0,
          checkOutsToday: checkOutCount || 0,
          attendanceRate: `${attendanceRate}%`,
          avgCheckInTime,
          lateCheckIns,
          avgFaceConfidence: `${avgConfidence}%`,
        },
        departments: departmentCounts || {},
        checkInsByHour: checkInsByHour || {},
        trends: {
          // Add trend calculations here
          checkInTrend: "+5%", // Calculate actual trend
          attendanceRateTrend: "+2%",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
