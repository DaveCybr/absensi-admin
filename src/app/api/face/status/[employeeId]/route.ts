// FILE: src/app/api/face/status/[employeeId]/route.ts
// PURPOSE: Check if employee has enrolled their face

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { employeeId: string } },
) {
  try {
    const { employeeId } = params;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get employee enrollment status
    const { data: employee, error } = await supabase
      .from("employees")
      .select("is_face_enrolled, face_enrolled_at")
      .eq("id", employeeId)
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      isEnrolled: employee.is_face_enrolled || false,
      enrolledAt: employee.face_enrolled_at,
    });
  } catch (error: any) {
    console.error("Check enrollment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check enrollment" },
      { status: 500 },
    );
  }
}
