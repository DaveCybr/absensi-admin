"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Attendance = {
  id: string;
  type: string;
  status: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  face_confidence: number;
  created_at: string;
  employees: {
    name: string;
    email: string;
    department: string | null;
  };
};

export default function LaporanPage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const supabase = createClient();

  useEffect(() => {
    loadRecords();
  }, [filterDate]);

  const loadRecords = async () => {
    setIsLoading(true);

    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(filterDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("attendances")
      .select("*, employees(name, email, department)")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: false });

    setRecords((data as Attendance[]) ?? []);
    setIsLoading(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-bold">Laporan Absensi</h1>
          <p className="text-slate-400 text-sm mt-1">
            {records.length} record ditemukan
          </p>
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-center py-16">Memuat...</div>
      ) : records.length === 0 ? (
        <div className="text-slate-400 text-center py-16">
          Tidak ada data absensi pada tanggal ini
        </div>
      ) : (
        <div className="grid gap-3">
          {records.map((record) => (
            <Card key={record.id} className="bg-slate-900 border-slate-800">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      record.type === "check_in"
                        ? "bg-green-500/20"
                        : "bg-orange-500/20"
                    }`}
                  >
                    {record.type === "check_in" ? "✅" : "🏃"}
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {record.employees?.name ?? "-"}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {record.employees?.department ?? "-"} •{" "}
                      {record.employees?.email ?? "-"}
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-slate-500">
                      <span>
                        Jarak: {record.distance_meters?.toFixed(0) ?? "-"}m
                      </span>
                      <span>
                        Wajah:{" "}
                        {record.face_confidence
                          ? `${(record.face_confidence * 100).toFixed(1)}%`
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-lg">
                    {formatTime(record.created_at)}
                  </p>
                  <Badge
                    className={
                      record.type === "check_in"
                        ? "bg-green-500/20 text-green-400 border-0 text-xs"
                        : "bg-orange-500/20 text-orange-400 border-0 text-xs"
                    }
                  >
                    {record.type === "check_in" ? "Check In" : "Check Out"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
