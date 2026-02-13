"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  Search,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navGroups = [
  {
    label: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "HR Management",
    items: [
      {
        href: "/dashboard/karyawan",
        label: "Karyawan",
        icon: Users,
      },
      {
        href: "/dashboard/absensi",
        label: "Absensi",
        icon: Clock,
      },
      {
        href: "/dashboard/shift",
        label: "Shift Management",
        icon: Calendar,
      },
      {
        href: "/dashboard/shift/schedule",
        label: "Penjadwalan",
        icon: Calendar,
      },
      {
        href: "/dashboard/cuti",
        label: "Pengajuan Cuti",
        icon: FileText,
      },
      {
        href: "/dashboard/cuti/saldo",
        label: "Saldo Cuti",
        icon: Calendar,
      },
      {
        href: "/dashboard/cuti/calendar",
        label: "Kalender Cuti",
        icon: Calendar,
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
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/dashboard/pengaturan",
        label: "Pengaturan",
        icon: Settings,
      },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Absensi Pro
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Admin Panel
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-3">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = (() => {
                    // Exact match - jika path sama persis
                    if (pathname === item.href) return true;

                    // Dashboard khusus - tidak match dengan nested routes
                    if (item.href === "/dashboard") return false;

                    // Untuk parent routes dengan children, hanya match exact
                    // Ini mencegah /dashboard/shift match dengan /dashboard/shift/schedule
                    const parentRoutesWithChildren = [
                      "/dashboard/shift",
                      "/dashboard/cuti",
                    ];

                    if (parentRoutesWithChildren.includes(item.href)) {
                      return pathname === item.href;
                    }

                    // Untuk routes lain, match jika startsWith + slash
                    if (pathname.startsWith(item.href + "/")) {
                      return true;
                    }

                    return false;
                  })();

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 w-80">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari karyawan, laporan..."
                className="bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none flex-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User Menu */}
            <button className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-3 py-2 transition-colors">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full" />
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
