"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Employee = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  position: string | null;
  is_active: boolean;
  face_image_url: string | null;
  created_at: string;
};

export default function KaryawanPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    position: "",
  });
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });
    setEmployees(data ?? []);
    setIsLoading(false);
  };

  const handleTambah = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Nama, email, dan password wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/employees/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setIsDialogOpen(false);
      setForm({
        name: "",
        email: "",
        password: "",
        department: "",
        position: "",
      });
      loadEmployees();
    } catch (e: any) {
      setError(e.message ?? "Gagal menambah karyawan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await supabase
      .from("employees")
      .update({ is_active: !currentStatus })
      .eq("id", id);
    loadEmployees();
  };

  const handleUploadFace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEmployee || !e.target.files?.[0]) return;

    const file = e.target.files[0];

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      setUploadError("File harus berupa gambar");
      return;
    }

    // Validasi ukuran (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Ukuran file maksimal 2MB");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccess(false);

    try {
      const filePath = `${selectedEmployee.id}.jpg`;

      // Upload ke Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("face-references")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Ambil public URL
      const { data: urlData } = supabase.storage
        .from("face-references")
        .getPublicUrl(filePath);

      // Update face_image_url di tabel employees
      await supabase
        .from("employees")
        .update({ face_image_url: urlData.publicUrl })
        .eq("id", selectedEmployee.id);

      setUploadSuccess(true);
      loadEmployees();
    } catch (e: any) {
      setUploadError(e.message ?? "Gagal upload foto");
    } finally {
      setIsUploading(false);
    }
  };

  const openUploadDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setUploadError("");
    setUploadSuccess(false);
    setIsUploadDialogOpen(true);
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-bold">Karyawan</h1>
          <p className="text-slate-400 text-sm mt-1">
            Total {employees.length} karyawan terdaftar
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          + Tambah Karyawan
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Cari nama atau email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 max-w-sm"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-slate-400 text-center py-16">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-400 text-center py-16">
          Belum ada karyawan
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((emp) => (
            <Card key={emp.id} className="bg-slate-900 border-slate-800">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar / Foto Wajah */}
                  <div className="relative">
                    {emp.face_image_url ? (
                      <img
                        src={emp.face_image_url}
                        alt={emp.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Indikator foto wajah */}
                    <div
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                        emp.face_image_url ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                  </div>

                  <div>
                    <p className="text-white font-semibold">{emp.name}</p>
                    <p className="text-slate-400 text-sm">{emp.email}</p>
                    <div className="flex gap-2 mt-1">
                      {emp.department && (
                        <span className="text-xs text-slate-500">
                          {emp.department}
                        </span>
                      )}
                      {emp.position && (
                        <span className="text-xs text-slate-500">
                          • {emp.position}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status foto wajah */}
                  <Badge
                    className={
                      emp.face_image_url
                        ? "bg-green-500/20 text-green-400 border-0 text-xs"
                        : "bg-red-500/20 text-red-400 border-0 text-xs"
                    }
                  >
                    {emp.face_image_url ? "📷 Foto Ada" : "📷 Belum Ada"}
                  </Badge>

                  <Badge
                    className={
                      emp.is_active
                        ? "bg-green-500/20 text-green-400 border-0"
                        : "bg-red-500/20 text-red-400 border-0"
                    }
                  >
                    {emp.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>

                  {/* Upload foto */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openUploadDialog(emp)}
                    className="border-slate-700 text-slate-400 hover:text-white text-xs"
                  >
                    Upload Foto
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(emp.id, emp.is_active)}
                    className="border-slate-700 text-slate-400 hover:text-white text-xs"
                  >
                    {emp.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Tambah Karyawan */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Tambah Karyawan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-slate-300">Nama Lengkap *</Label>
              <Input
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email *</Label>
              <Input
                type="email"
                placeholder="john@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Password *</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Departemen</Label>
                <Input
                  placeholder="IT, HRD, dll"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Jabatan</Label>
                <Input
                  placeholder="Staff, Manager, dll"
                  value={form.position}
                  onChange={(e) =>
                    setForm({ ...form, position: e.target.value })
                  }
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 border-slate-700 text-slate-400"
              >
                Batal
              </Button>
              <Button
                onClick={handleTambah}
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Upload Foto Wajah */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Upload Foto Wajah — {selectedEmployee?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {uploadError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{uploadError}</p>
              </div>
            )}
            {uploadSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-green-400 text-sm">
                  Foto berhasil diupload!
                </p>
              </div>
            )}

            {/* Preview foto saat ini */}
            {selectedEmployee?.face_image_url && (
              <div className="flex justify-center">
                <img
                  src={selectedEmployee.face_image_url}
                  alt="Foto saat ini"
                  className="w-32 h-32 rounded-full object-cover border-2 border-slate-700"
                />
              </div>
            )}

            <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-400 space-y-1">
              <p>📌 Ketentuan foto:</p>
              <p>• Format JPG, PNG</p>
              <p>• Ukuran maksimal 2MB</p>
              <p>• Wajah terlihat jelas, pencahayaan cukup</p>
              <p>• Tidak menggunakan kacamata atau masker</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadFace}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isUploading ? "Mengupload..." : "📷 Pilih Foto"}
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsUploadDialogOpen(false)}
              className="w-full border-slate-700 text-slate-400"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
