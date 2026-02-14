"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Search,
  Camera,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import ExcelOperations from "@/components/employee/ExcelOperations";
import { Label } from "@/components/ui/label";

type Employee = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  position: string | null;
  is_active: boolean;
  is_face_enrolled: boolean;
  face_enrolled_at: string | null;
  created_at: string;
};

type FaceVerificationLog = {
  id: string;
  similarity_score: number;
  is_match: boolean;
  created_at: string;
};

export default function EmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewStatsDialogOpen, setIsViewStatsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [verificationLogs, setVerificationLogs] = useState<
    FaceVerificationLog[]
  >([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Form state for adding employee
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    position: "",
  });

  const supabase = createClient();

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [searchQuery, employees]);

  const loadEmployees = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    setEmployees(data || []);
    setIsLoading(false);
  };

  const filterEmployees = () => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.department?.toLowerCase().includes(query) ||
        emp.position?.toLowerCase().includes(query),
    );
    setFilteredEmployees(filtered);
  };

  // ============================================
  // VIEW FACE STATS
  // ============================================
  const handleViewFaceStats = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewStatsDialogOpen(true);
    setIsLoadingLogs(true);

    try {
      // Load verification logs for this employee
      const { data } = await supabase
        .from("face_verification_logs")
        .select("*")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setVerificationLogs(data || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      alert("Nama, Email, dan Password wajib diisi!");
      return;
    }

    if (formData.password.length < 6) {
      alert("Password minimal 6 karakter!");
      return;
    }

    try {
      // Call API to create employee
      const response = await fetch("/api/employees/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Karyawan berhasil ditambahkan!");
        setIsDialogOpen(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          department: "",
          position: "",
        });
        loadEmployees(); // Reload list
      } else {
        alert("❌ " + (result.error || "Gagal menambahkan karyawan"));
      }
    } catch (error: any) {
      alert("❌ Error: " + error.message);
    }
  };

  const stats = {
    total: employees.length,
    active: employees.filter((e) => e.is_active).length,
    inactive: employees.filter((e) => !e.is_active).length,
    faceEnrolled: employees.filter((e) => e.is_face_enrolled).length,
    pendingEnrollment: employees.filter(
      (e) => e.is_active && !e.is_face_enrolled,
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Manajemen Karyawan
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Monitor status karyawan dan pendaftaran face recognition
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Total Karyawan
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.total}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Karyawan Aktif
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {stats.active}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  Nonaktif
                </p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {stats.inactive}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                  Face Registered
                </p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {stats.faceEnrolled}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {stats.total > 0
                    ? Math.round((stats.faceEnrolled / stats.total) * 100)
                    : 0}
                  % completion
                </p>
              </div>
              <Camera className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                  Pending Register
                </p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {stats.pendingEnrollment}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Perlu daftar wajah
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-1">
                📱 Face Registration via Mobile App
              </p>
              <p>
                Karyawan harus mendaftar wajah mereka sendiri melalui{" "}
                <strong>Mobile App</strong>. Admin hanya dapat melihat status
                enrollment dan statistik verifikasi.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cari nama, email, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ExcelOperations onImportComplete={loadEmployees} />
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Karyawan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Grid */}
      {isLoading ? (
        <Card className="bg-white dark:bg-slate-900">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-4 text-slate-500">Memuat data...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => (
            <Card
              key={employee.id}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                {/* Employee Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">
                      {employee.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {employee.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge
                        className={
                          employee.is_active
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-red-100 text-red-700 border-red-300"
                        }
                      >
                        {employee.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                      {employee.is_face_enrolled ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Face Registered
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Registration
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Employee Details */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Department:</span>
                    <span>{employee.department || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Position:</span>
                    <span>{employee.position || "-"}</span>
                  </div>
                  {employee.face_enrolled_at && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="font-medium">Registered:</span>
                      <span className="text-xs">
                        {new Date(employee.face_enrolled_at).toLocaleDateString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {employee.is_face_enrolled && (
                  <Button
                    onClick={() => handleViewFaceStats(employee)}
                    variant="outline"
                    size="sm"
                    className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Verification Stats
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Face Stats Dialog */}
      <Dialog
        open={isViewStatsDialogOpen}
        onOpenChange={setIsViewStatsDialogOpen}
      >
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
              Face Verification Statistics
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Employee Info */}
            {selectedEmployee && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {selectedEmployee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedEmployee.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedEmployee.email}
                    </p>
                    {selectedEmployee.face_enrolled_at && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Registered:{" "}
                        {new Date(
                          selectedEmployee.face_enrolled_at,
                        ).toLocaleDateString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Verification Logs */}
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                Recent Verification Attempts (Last 10)
              </h3>

              {isLoadingLogs ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                  <p className="mt-2 text-sm text-slate-500">Loading logs...</p>
                </div>
              ) : verificationLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No verification attempts yet
                </div>
              ) : (
                <div className="space-y-2">
                  {verificationLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                        log.is_match
                          ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {log.is_match ? (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        )}
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              log.is_match
                                ? "text-green-700 dark:text-green-300"
                                : "text-red-700 dark:text-red-300"
                            }`}
                          >
                            {log.is_match
                              ? "Verified Successfully"
                              : "Verification Failed"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(log.created_at).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          log.is_match
                            ? "bg-green-600 text-white"
                            : "bg-red-600 text-white"
                        }
                      >
                        {Math.round(log.similarity_score * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsViewStatsDialogOpen(false)}
                className="flex-1"
              >
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Tambah Karyawan Baru
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nama Lengkap *
              </Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="John Doe"
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email *
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john@company.com"
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Password *
              </Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Min. 6 karakter"
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Department
              </Label>
              <Input
                type="text"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                placeholder="IT, HR, Sales, etc."
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Position/Jabatan
              </Label>
              <Input
                type="text"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
                placeholder="Staff, Manager, etc."
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                ℹ️ Setelah karyawan dibuat, mereka perlu{" "}
                <strong>mendaftar wajah sendiri</strong> melalui Mobile App
                untuk dapat menggunakan face recognition saat absen.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setFormData({
                    name: "",
                    email: "",
                    password: "",
                    department: "",
                    position: "",
                  });
                }}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
