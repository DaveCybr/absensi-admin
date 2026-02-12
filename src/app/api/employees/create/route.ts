import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function POST(req: NextRequest) {
  const { name, email, password, department, position } = await req.json();

  try {
    // Buat user tanpa kirim email
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // langsung confirm, tanpa email
      });

    if (authError) throw authError;

    // Insert ke tabel employees
    const { error: empError } = await supabaseAdmin.from("employees").insert({
      user_id: authData.user.id,
      name,
      email,
      department: department || null,
      position: position || null,
    });

    if (empError) throw empError;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e.message },
      { status: 400 },
    );
  }
}
