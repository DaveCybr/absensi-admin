"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Search,
  Upload,
  Filter,
  Download,
  UserCheck,
  UserX,
  Camera,
  Mail,
  Briefcase,
  Building2,
  MoreVertical,
} from "lucide-react";

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
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
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

  useEffect(() => {
    applyFilters();
  }, [employees, search, filterDepartment, filterStatus]);

  const loadEmployees = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });
    setEmployees(data ?? []);
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...employees];

    // Search filter
    if (search) {
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.email.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Department filter
    if (filterDepartment !== "all") {
      filtered = filtered.filter((e) => e.department === filterDepartment);
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(
        (e) => e.is_active === (filterStatus === "active"),
      );
    }

    setFilteredEmployees(filtered);
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

    if (!file.type.startsWith("image/")) {
      setUploadError("File harus berupa gambar");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Ukuran file maksimal 2MB");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccess(false);

    try {
      const filePath = `${selectedEmployee.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("face-references")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("face-references")
        .getPublicUrl(filePath);

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

  const exportToCSV = () => {
    const headers = ["Nama", "Email", "Department", "Position", "Status"];
    const rows = filteredEmployees.map((e) => [
      e.name,
      e.email,
      e.department || "",
      e.position || "",
      e.is_active ? "Aktif" : "Nonaktif",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `karyawan_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Get unique departments
  const departments = Array.from(
    new Set(employees.map((e) => e.department).filter(Boolean)),
  );

  // Stats
  const totalActive = employees.filter((e) => e.is_active).length;
  const totalInactive = employees.filter((e) => !e.is_active).length;
  const withFace = employees.filter((e) => e.face_image_url).length;
  const withoutFace = employees.filter((e) => !e.face_image_url).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Manajemen Karyawan
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Kelola data karyawan dan registrasi wajah
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="border-slate-300 dark:border-slate-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => {
              setError("");
              setIsDialogOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Karyawan
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Karyawan
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {employees.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Aktif
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {totalActive}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Nonaktif
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {totalInactive}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Dengan Foto Wajah
                </p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {withFace}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                <Camera className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cari nama atau email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Department Filter */}
            <Select
              value={filterDepartment}
              onValueChange={setFilterDepartment}
            >
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Semua Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Department</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept!}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
            Daftar Karyawan ({filteredEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Memuat...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Tidak ada karyawan
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {emp.face_image_url ? (
                      <img
                        src={emp.face_image_url}
                        alt={emp.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                        emp.face_image_url ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {emp.name}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {emp.email}
                      </span>
                      {emp.department && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {emp.department}
                        </span>
                      )}
                      {emp.position && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {emp.position}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      className={
                        emp.face_image_url
                          ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-0"
                          : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-0"
                      }
                    >
                      {emp.face_image_url ? "📷 Ada" : "📷 Belum"}
                    </Badge>

                    <Badge
                      className={
                        emp.is_active
                          ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-0"
                          : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-0"
                      }
                    >
                      {emp.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openUploadDialog(emp)}
                      className="border-slate-300 dark:border-slate-700"
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Upload Foto
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(emp.id, emp.is_active)}
                      className={
                        emp.is_active
                          ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                          : "border-green-300 dark:border-green-700 text-green-600 dark:text-green-400"
                      }
                    >
                      {emp.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Tambah Karyawan */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Tambah Karyawan
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
                Nama Lengkap *
              </Label>
              <Input
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Email *
              </Label>
              <Input
                type="email"
                placeholder="john@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Password *
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Departemen
                </Label>
                <Input
                  placeholder="IT, HRD, dll"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Jabatan
                </Label>
                <Input
                  placeholder="Staff, Manager, dll"
                  value={form.position}
                  onChange={(e) =>
                    setForm({ ...form, position: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
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
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Upload Foto Wajah — {selectedEmployee?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {uploadError && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {uploadError}
                </p>
              </div>
            )}
            {uploadSuccess && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-green-600 dark:text-green-400 text-sm">
                  Foto berhasil diupload!
                </p>
              </div>
            )}

            {selectedEmployee?.face_image_url && (
              <div className="flex justify-center">
                <img
                  src={selectedEmployee.face_image_url}
                  alt="Foto saat ini"
                  className="w-32 h-32 rounded-full object-cover border-4 border-slate-200 dark:border-slate-700"
                />
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">
                📌 Ketentuan foto:
              </p>
              <ul className="space-y-1 ml-4">
                <li>• Format JPG, PNG</li>
                <li>• Ukuran maksimal 2MB</li>
                <li>• Wajah terlihat jelas</li>
                <li>• Pencahayaan cukup</li>
                <li>• Tidak menggunakan kacamata atau masker</li>
              </ul>
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
              {isUploading ? (
                "Mengupload..."
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Pilih Foto
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsUploadDialogOpen(false)}
              className="w-full border-slate-300 dark:border-slate-700"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
