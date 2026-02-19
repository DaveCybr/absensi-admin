// FILE: app/api/admin/settings/route.ts
// PURPOSE: Admin-only office settings management

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ============================================
// UPDATE OFFICE SETTINGS (Admin Only)
// ============================================
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

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

    // Validate input
    const allowedFields = [
      "office_name",
      "latitude",
      "longitude",
      "radius_meters",
      "address",
      "work_start_time",
      "work_end_time",
      "timezone",
    ];

    const updates: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Additional validation
    if (
      updates.radius_meters &&
      (updates.radius_meters < 10 || updates.radius_meters > 1000)
    ) {
      return NextResponse.json(
        { error: "Radius must be between 10 and 1000 meters" },
        { status: 400 },
      );
    }

    if (updates.latitude && (updates.latitude < -90 || updates.latitude > 90)) {
      return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
    }

    if (
      updates.longitude &&
      (updates.longitude < -180 || updates.longitude > 180)
    ) {
      return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
    }

    // Update settings
    const { data, error } = await supabase
      .from("office_settings")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Office settings updated successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// GET OFFICE SETTINGS (Public - no auth needed)
// ============================================
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("office_settings")
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
