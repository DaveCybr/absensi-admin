import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  Umbrella,
  FileText,
  Settings,
  LogOut,
  Crown,
  User,
} from "lucide-react";

async function getUserRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: employee } = await supabase
    .from("employees")
    .select("role, name, email")
    .eq("user_id", user.id)
    .single();

  return employee;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const employee = await getUserRole();
  const isAdmin = employee?.role === "admin";

  const navGroups = [
    {
      label: "Main",
      items: [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          adminOnly: false,
        },
      ],
    },
    {
      label: "Management",
      items: [
        {
          href: "/dashboard/karyawan",
          label: "Karyawan",
          icon: Users,
          adminOnly: true,
        },
        {
          href: "/dashboard/absensi",
          label: "Absensi",
          icon: Calendar,
          adminOnly: true,
        },
        {
          href: "/dashboard/shift",
          label: "Shift",
          icon: Clock,
          adminOnly: true,
        },
        {
          href: "/dashboard/cuti",
          label: "Cuti",
          icon: Umbrella,
          adminOnly: true,
        },
      ],
    },
    {
      label: "Reports",
      items: [
        {
          href: "/dashboard/laporan",
          label: "Laporan",
          icon: FileText,
          adminOnly: true,
        },
      ],
    },
    {
      label: "Settings",
      items: [
        {
          href: "/dashboard/pengaturan",
          label: "Pengaturan",
          icon: Settings,
          adminOnly: true,
        },
      ],
    },
  ];

  const filteredNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - Admin Theme (Dark) */}
      {isAdmin ? (
        <aside className="w-72 bg-gradient-to-b from-slate-900 via-indigo-950 to-purple-950 flex flex-col border-r border-white/10">
          {/* Logo & Brand */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-purple-500/20">
                <Calendar className="h-7 w-7 text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                  Attendance
                </h1>
                <p className="text-xs font-medium text-purple-300">
                  Management System
                </p>
              </div>
            </div>

            {/* User Profile Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                  {employee?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">
                    {employee?.name || "User"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {employee?.email || ""}
                  </p>
                </div>
              </div>

              {/* Role Badge */}
              <div className="px-3 py-2 rounded-xl flex items-center gap-2 justify-center bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50">
                <Crown className="h-4 w-4 text-white" />
                <span className="text-white font-bold text-sm">
                  Administrator
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-6">
              {filteredNavGroups.map((group) => (
                <div key={group.label}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 px-3 text-slate-500">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-300 hover:translate-x-1"
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Footer - Logout */}
          <div className="p-4 border-t border-white/10">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </aside>
      ) : (
        /* Sidebar - Employee Theme (Light) */
        <aside className="w-72 bg-gradient-to-b from-white via-slate-50 to-slate-100 flex flex-col border-r border-slate-200">
          {/* Logo & Brand */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-blue-500/20">
                <Calendar className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">
                  Attendance
                </h1>
                <p className="text-xs font-medium text-slate-600">
                  Management System
                </p>
              </div>
            </div>

            {/* User Profile Card */}
            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                  {employee?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">
                    {employee?.name || "User"}
                  </p>
                  <p className="text-xs text-slate-600 truncate">
                    {employee?.email || ""}
                  </p>
                </div>
              </div>

              {/* Role Badge */}
              <div className="px-3 py-2 rounded-xl flex items-center gap-2 justify-center bg-gradient-to-r from-blue-500 to-indigo-500">
                <User className="h-4 w-4 text-white" />
                <span className="text-white font-bold text-sm">Employee</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-6">
              {filteredNavGroups.map((group) => (
                <div key={group.label}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 px-3 text-slate-400">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-all duration-300 hover:translate-x-1"
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Footer - Logout */}
          <div className="p-4 border-t border-slate-200">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 bg-red-100 text-red-600 hover:bg-red-200 border border-red-200"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
