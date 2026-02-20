import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminDashboardView from "./admin-view";
import EmployeeDashboardView from "./employee-view";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get employee data with role
  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!employee) {
    redirect("/login");
  }

  // Show admin or employee dashboard based on role
  const isAdmin = employee.role === "admin";

  return (
    <div>
      {isAdmin ? (
        <AdminDashboardView employee={employee} />
      ) : (
        <EmployeeDashboardView employee={employee} />
      )}
    </div>
  );
}
