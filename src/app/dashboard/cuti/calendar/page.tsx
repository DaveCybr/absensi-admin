"use client";

import LeaveCalendarView from "@/components/leave/LeaveCalendarView";

export default function LeaveCalendarPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Kalender Cuti
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Visualisasi jadwal cuti karyawan per bulan
        </p>
      </div>

      {/* Calendar */}
      <LeaveCalendarView />
    </div>
  );
}
