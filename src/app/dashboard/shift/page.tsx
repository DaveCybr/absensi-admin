"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Plus, Edit, Trash2, Calendar } from "lucide-react";

type Shift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  late_tolerance: number;
  work_days: string[];
  created_at: string;
};

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_LABELS: Record<string, string> = {
  Monday: "Senin",
  Tuesday: "Selasa",
  Wednesday: "Rabu",
  Thursday: "Kamis",
  Friday: "Jumat",
  Saturday: "Sabtu",
  Sunday: "Minggu",
};

export default function ShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    start_time: "08:00",
    end_time: "16:00",
    late_tolerance: 15,
    work_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  });
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("shifts")
      .select("*")
      .order("created_at", { ascending: false });
    setShifts(data || []);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.start_time || !form.end_time) {
      setError("Nama shift, jam mulai, dan jam selesai wajib diisi");
      return;
    }

    if (form.work_days.length === 0) {
      setError("Pilih minimal 1 hari kerja");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        name: form.name,
        start_time: form.start_time,
        end_time: form.end_time,
        late_tolerance: form.late_tolerance,
        work_days: form.work_days,
      };

      if (editingShift) {
        await supabase.from("shifts").update(payload).eq("id", editingShift.id);
      } else {
        await supabase.from("shifts").insert(payload);
      }

      setIsDialogOpen(false);
      setEditingShift(null);
      setForm({
        name: "",
        start_time: "08:00",
        end_time: "16:00",
        late_tolerance: 15,
        work_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      });
      loadShifts();
    } catch (e: any) {
      setError(e.message || "Gagal menyimpan shift");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setForm({
      name: shift.name,
      start_time: shift.start_time.substring(0, 5),
      end_time: shift.end_time.substring(0, 5),
      late_tolerance: shift.late_tolerance,
      work_days: shift.work_days || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus shift ini?")) return;
    await supabase.from("shifts").delete().eq("id", id);
    loadShifts();
  };

  const toggleWorkDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      work_days: prev.work_days.includes(day)
        ? prev.work_days.filter((d) => d !== day)
        : [...prev.work_days, day],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Shift & Jadwal
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Kelola shift kerja dan jadwal karyawan
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingShift(null);
            setError("");
            setIsDialogOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Shift
        </Button>
      </div>

      {/* Shifts List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Memuat...
        </div>
      ) : shifts.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="text-center py-12 text-slate-500 dark:text-slate-400">
            Belum ada shift. Klik tombol "Tambah Shift" untuk membuat shift
            baru.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map((shift) => (
            <Card
              key={shift.id}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all"
            >
              <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    {shift.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(shift)}
                      className="border-slate-300 dark:border-slate-700"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(shift.id)}
                      className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Time */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Jam Kerja
                    </p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {shift.start_time.substring(0, 5)} -{" "}
                      {shift.end_time.substring(0, 5)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Toleransi
                    </p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {shift.late_tolerance} mnt
                    </p>
                  </div>
                </div>

                {/* Work Days */}
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Hari Kerja
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {DAYS_OF_WEEK.map((day) => (
                      <span
                        key={day}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          shift.work_days?.includes(day)
                            ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        }`}
                      >
                        {DAY_LABELS[day].substring(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              {editingShift ? "Edit Shift" : "Tambah Shift"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Nama Shift *
              </Label>
              <Input
                placeholder="Shift Pagi, Shift Siang, Normal"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Jam Mulai *
                </Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) =>
                    setForm({ ...form, start_time: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Jam Selesai *
                </Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) =>
                    setForm({ ...form, end_time: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Toleransi Keterlambatan (menit)
              </Label>
              <Input
                type="number"
                value={form.late_tolerance}
                onChange={(e) =>
                  setForm({ ...form, late_tolerance: parseInt(e.target.value) })
                }
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Hari Kerja *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkDay(day)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      form.work_days.includes(day)
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 border-slate-300 dark:border-slate-700"
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
