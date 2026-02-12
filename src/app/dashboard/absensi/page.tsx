"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Search,
  Filter,
  Download,
  Users,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Attendance = {
  id: string;
  type: string;
  status: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  face_confidence: number;
  photo_url: string;
  check_in_photo_url?: string;
  check_out_photo_url?: string;
  late_minutes: number;
  created_at: string;
  employees: {
    name: string;
    email: string;
    department: string | null;
    position: string | null;
    face_image_url: string | null;
  };
};

export default function AbsensiPage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadRecords();
  }, [filterDate]);

  useEffect(() => {
    applyFilters();
  }, [records, filterType, filterStatus, searchQuery]);

  const loadRecords = async () => {
    setIsLoading(true);
    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filterDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("attendances")
      .select("*, employees(name, email, department, position, face_image_url)")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: false });

    setRecords((data as Attendance[]) || []);
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...records];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((r) => r.type === filterType);
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    // Search
    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.employees?.name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          r.employees?.email?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    setFilteredRecords(filtered);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Nama",
      "Email",
      "Department",
      "Type",
      "Waktu",
      "Status",
      "Jarak (m)",
      "Terlambat (mnt)",
    ];
    const rows = filteredRecords.map((r) => [
      r.employees?.name || "",
      r.employees?.email || "",
      r.employees?.department || "",
      r.type === "check_in" ? "Check In" : "Check Out",
      formatTime(r.created_at),
      r.status,
      r.distance_meters?.toFixed(0) || "",
      r.late_minutes || 0,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `absensi_${filterDate}.csv`;
    a.click();
  };

  // Stats
  const totalCheckIn = records.filter((r) => r.type === "check_in").length;
  const totalCheckOut = records.filter((r) => r.type === "check_out").length;
  const totalLate = records.filter((r) => r.late_minutes > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Manajemen Absensi
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Monitor dan kelola absensi real-time
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          className="border-slate-300 dark:border-slate-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Check In
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {totalCheckIn}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Check Out
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {totalCheckOut}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Terlambat
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {totalLate}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Date */}
            <div>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            {/* Type */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="check_in">Check In</SelectItem>
                <SelectItem value="check_out">Check Out</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="invalid">Invalid</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cari nama atau email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records List */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
            Daftar Absensi ({filteredRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Memuat...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Tidak ada data
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => {
                const photoUrl =
                  record.type === "check_in"
                    ? record.check_in_photo_url || record.photo_url
                    : record.check_out_photo_url || record.photo_url;

                return (
                  <div
                    key={record.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {record.employees?.face_image_url ? (
                        <img
                          src={record.employees.face_image_url}
                          alt={record.employees.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <Users className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                          record.type === "check_in"
                            ? "bg-green-500"
                            : "bg-orange-500"
                        }`}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {record.employees?.name || "Unknown"}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {record.employees?.department || "No Department"} •{" "}
                        {record.employees?.position || "No Position"}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                            record.type === "check_in"
                              ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                              : "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300"
                          }`}
                        >
                          {record.type === "check_in"
                            ? "Check In"
                            : "Check Out"}
                        </span>
                        {record.late_minutes > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                            Terlambat {record.late_minutes} mnt
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {formatTime(record.created_at)}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {record.distance_meters?.toFixed(0) || 0}m
                        </span>
                        {photoUrl && (
                          <button
                            onClick={() => setSelectedImage(photoUrl)}
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                          >
                            <ImageIcon className="w-3 h-3" />
                            Foto
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Dialog */}
      <Dialog
        open={selectedImage !== null}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Foto Absensi
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Attendance"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
