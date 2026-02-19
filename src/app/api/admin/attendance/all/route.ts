// FILE: app/api/admin/attendance/all/route.ts
// PURPOSE: Admin-only endpoint to view all attendance records

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ============================================
// GET ALL ATTENDANCE (Admin Only)
// ============================================
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Pagination
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Filters
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
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

    // Build query
    let query = supabase.from("attendances").select(
      `
        *,
        employee:employees(
          id,
          name,
          email,
          position,
          department
        )
      `,
      { count: "exact" },
    );

    // Apply filters
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }
    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: attendances, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by date for easier display
    const groupedByDate = attendances?.reduce((acc: any, record: any) => {
      const date = new Date(record.created_at).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: attendances,
      groupedByDate,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
