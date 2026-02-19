// FILE: app/api/admin/employees/route.ts
// PURPOSE: Admin-only endpoint to manage all employees

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ============================================
// GET ALL EMPLOYEES (Admin Only)
// ============================================
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 },
      );
    }

    // Get current employee with role
    const { data: currentEmployee, error: empError } = await supabase
      .from("employees")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (empError || !currentEmployee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Check if admin
    if (currentEmployee.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Get all employees
    const { data: employees, error: listError } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: employees,
      total: employees.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================
// UPDATE EMPLOYEE ROLE (Admin Only)
// ============================================
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { employeeId, role } = body;

    // Validate input
    if (!employeeId || !role) {
      return NextResponse.json(
        { error: "employeeId and role are required" },
        { status: 400 },
      );
    }

    if (!["employee", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be employee or admin" },
        { status: 400 },
      );
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current employee role
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

    // Update employee role
    const { data, error } = await supabase
      .from("employees")
      .update({ role })
      .eq("id", employeeId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Role updated to ${role}`,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
