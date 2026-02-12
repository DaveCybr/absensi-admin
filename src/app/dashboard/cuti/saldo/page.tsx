"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Plus,
  Edit,
  User,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

type LeaveBalance = {
  id: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  employees: {
    id: string;
    name: string;
    email: string;
    department: string | null;
  };
  leave_types: {
    id: string;
    name: string;
    color: string;
  };
};

type Employee = {
  id: string;
  name: string;
  email: string;
  department: string | null;
};

type LeaveType = {
  id: string;
  name: string;
  color: string;
  max_days_per_year: number;
};

export default function LeaveBalancePage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [filteredBalances, setFilteredBalances] = useState<LeaveBalance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterLeaveType, setFilterLeaveType] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<LeaveBalance | null>(
    null,
  );
  const [form, setForm] = useState({
    employee_id: "",
    leave_type_id: "",
    year: new Date().getFullYear(),
    total_days: 0,
    used_days: 0,
  });
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadBalances();
  }, [selectedYear]);

  useEffect(() => {
    applyFilters();
  }, [balances, filterEmployee, filterLeaveType]);

  const loadData = async () => {
    const [employeesRes, leaveTypesRes] = await Promise.all([
      supabase.from("employees").select("*").eq("is_active", true),
      supabase.from("leave_types").select("*").eq("is_active", true),
    ]);

    setEmployees(employeesRes.data || []);
    setLeaveTypes(leaveTypesRes.data || []);
  };

  const loadBalances = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("leave_balances")
      .select(
        "*, employees(id, name, email, department), leave_types(id, name, color)",
      )
      .eq("year", parseInt(selectedYear));

    setBalances((data as LeaveBalance[]) || []);
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...balances];

    if (filterEmployee !== "all") {
      filtered = filtered.filter((b) => b.employees.id === filterEmployee);
    }

    if (filterLeaveType !== "all") {
      filtered = filtered.filter((b) => b.leave_types.id === filterLeaveType);
    }

    setFilteredBalances(filtered);
  };

  const handleSubmit = async () => {
    if (!form.employee_id || !form.leave_type_id) return;

    setIsSubmitting(true);
    try {
      if (editMode && selectedBalance) {
        // Update existing balance
        await supabase
          .from("leave_balances")
          .update({
            total_days: form.total_days,
            used_days: form.used_days,
          })
          .eq("id", selectedBalance.id);
      } else {
        // Create new balance
        await supabase.from("leave_balances").insert([
          {
            employee_id: form.employee_id,
            leave_type_id: form.leave_type_id,
            year: form.year,
            total_days: form.total_days,
            used_days: form.used_days,
          },
        ]);
      }

      setIsDialogOpen(false);
      resetForm();
      loadBalances();
    } catch (error) {
      console.error("Error saving balance:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setEditMode(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (balance: LeaveBalance) => {
    setSelectedBalance(balance);
    setForm({
      employee_id: balance.employees.id,
      leave_type_id: balance.leave_types.id,
      year: balance.year,
      total_days: balance.total_days,
      used_days: balance.used_days,
    });
    setEditMode(true);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setForm({
      employee_id: "",
      leave_type_id: "",
      year: new Date().getFullYear(),
      total_days: 0,
      used_days: 0,
    });
    setSelectedBalance(null);
  };

  // Generate bulk balances for all employees
  const handleGenerateBulkBalances = async () => {
    if (!confirm("Generate saldo cuti untuk semua karyawan yang belum punya?"))
      return;

    setIsSubmitting(true);
    try {
      const year = parseInt(selectedYear);

      // Get all employees
      const allEmployees = employees;

      // Get existing balances
      const existingBalances = balances;

      // Find employees without balances
      const bulkData: any[] = [];

      for (const emp of allEmployees) {
        for (const leaveType of leaveTypes) {
          const hasBalance = existingBalances.some(
            (b) =>
              b.employees.id === emp.id && b.leave_types.id === leaveType.id,
          );

          if (!hasBalance) {
            bulkData.push({
              employee_id: emp.id,
              leave_type_id: leaveType.id,
              year: year,
              total_days: leaveType.max_days_per_year,
              used_days: 0,
            });
          }
        }
      }

      if (bulkData.length > 0) {
        await supabase.from("leave_balances").insert(bulkData);
        alert(`Berhasil generate ${bulkData.length} saldo cuti`);
        loadBalances();
      } else {
        alert("Semua karyawan sudah memiliki saldo cuti");
      }
    } catch (error) {
      console.error("Error generating balances:", error);
      alert("Gagal generate saldo cuti");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats
  const totalBalances = balances.length;
  const totalAllocated = balances.reduce((sum, b) => sum + b.total_days, 0);
  const totalUsed = balances.reduce((sum, b) => sum + b.used_days, 0);
  const totalRemaining = balances.reduce((sum, b) => sum + b.remaining_days, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Saldo Cuti Karyawan
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Kelola saldo dan alokasi cuti per karyawan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerateBulkBalances}
            disabled={isSubmitting}
            variant="outline"
            className="border-slate-300 dark:border-slate-700"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Generate Bulk
          </Button>
          <Button
            onClick={openCreateDialog}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Saldo
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
                  Total Records
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {totalBalances}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Dialokasikan
                </p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {totalAllocated}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Terpakai
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {totalUsed}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Sisa
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {totalRemaining}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    Tahun {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Semua Karyawan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Karyawan</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterLeaveType} onValueChange={setFilterLeaveType}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Semua Jenis Cuti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis Cuti</SelectItem>
                {leaveTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Balance List */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
            Daftar Saldo Cuti ({filteredBalances.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Memuat...
            </div>
          ) : filteredBalances.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Tidak ada data saldo cuti
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Karyawan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Jenis Cuti
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tahun
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Terpakai
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Sisa
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredBalances.map((balance) => {
                    const usagePercent =
                      (balance.used_days / balance.total_days) * 100;

                    return (
                      <tr
                        key={balance.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {balance.employees?.name}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {balance.employees?.department || "-"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            style={{
                              backgroundColor:
                                balance.leave_types?.color + "20",
                              color: balance.leave_types?.color,
                              border: "none",
                            }}
                          >
                            {balance.leave_types?.name}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-900 dark:text-white">
                          {balance.year}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-white">
                          {balance.total_days} hari
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-orange-600 dark:text-orange-400">
                          {balance.used_days} hari
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-green-600 dark:text-green-400">
                          {balance.remaining_days} hari
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  usagePercent > 80
                                    ? "bg-red-500"
                                    : usagePercent > 50
                                      ? "bg-orange-500"
                                      : "bg-green-500"
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                              {usagePercent.toFixed(0)}%
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(balance)}
                            className="border-slate-300 dark:border-slate-700"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Create/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              {editMode ? "Edit Saldo Cuti" : "Tambah Saldo Cuti"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Karyawan</Label>
              <Select
                value={form.employee_id}
                onValueChange={(val) => setForm({ ...form, employee_id: val })}
                disabled={editMode}
              >
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <SelectValue placeholder="Pilih Karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Jenis Cuti</Label>
              <Select
                value={form.leave_type_id}
                onValueChange={(val) =>
                  setForm({ ...form, leave_type_id: val })
                }
                disabled={editMode}
              >
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <SelectValue placeholder="Pilih Jenis Cuti" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tahun</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) =>
                    setForm({ ...form, year: parseInt(e.target.value) })
                  }
                  disabled={editMode}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label>Total Hari</Label>
                <Input
                  type="number"
                  value={form.total_days}
                  onChange={(e) =>
                    setForm({ ...form, total_days: parseInt(e.target.value) })
                  }
                  className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label>Terpakai</Label>
                <Input
                  type="number"
                  value={form.used_days}
                  onChange={(e) =>
                    setForm({ ...form, used_days: parseInt(e.target.value) })
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
