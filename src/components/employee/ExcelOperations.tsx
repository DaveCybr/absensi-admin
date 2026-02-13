"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

type Employee = {
  name: string;
  email: string;
  department: string;
  position: string;
  password?: string;
};

export default function ExcelOperations({
  onImportComplete,
}: {
  onImportComplete: () => void;
}) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Employee[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // ============================================
  // EXPORT TO EXCEL
  // ============================================
  const handleExportToExcel = async () => {
    setIsExporting(true);
    try {
      const { data: employees } = await supabase
        .from("employees")
        .select("name, email, department, position, is_active, created_at")
        .order("created_at", { ascending: false });

      if (!employees || employees.length === 0) {
        alert("Tidak ada data karyawan untuk di-export");
        return;
      }

      // Format data for Excel
      const excelData = employees.map((emp) => ({
        Nama: emp.name,
        Email: emp.email,
        Department: emp.department || "",
        Jabatan: emp.position || "",
        Status: emp.is_active ? "Aktif" : "Nonaktif",
        "Tanggal Dibuat": new Date(emp.created_at).toLocaleDateString("id-ID"),
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws["!cols"] = [
        { wch: 25 }, // Nama
        { wch: 30 }, // Email
        { wch: 20 }, // Department
        { wch: 20 }, // Jabatan
        { wch: 10 }, // Status
        { wch: 15 }, // Tanggal
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Karyawan");

      // Generate filename with date
      const filename = `Karyawan_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);

      alert(`Berhasil export ${employees.length} karyawan ke Excel`);
    } catch (error) {
      console.error("Error exporting:", error);
      alert("Gagal export ke Excel");
    } finally {
      setIsExporting(false);
    }
  };

  // ============================================
  // DOWNLOAD TEMPLATE
  // ============================================
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Nama: "John Doe",
        Email: "john@company.com",
        Password: "password123",
        Department: "IT",
        Jabatan: "Staff",
      },
      {
        Nama: "Jane Smith",
        Email: "jane@company.com",
        Password: "password123",
        Department: "HR",
        Jabatan: "Manager",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws["!cols"] = [
      { wch: 25 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_Karyawan.xlsx");
  };

  // ============================================
  // IMPORT FROM EXCEL - PREVIEW
  // ============================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Validate and transform data
        const errors: string[] = [];
        const validEmployees: Employee[] = [];

        json.forEach((row, index) => {
          const lineNum = index + 2; // +2 because Excel is 1-indexed and has header

          // Required fields validation
          if (!row.Nama || !row.Email || !row.Password) {
            errors.push(
              `Baris ${lineNum}: Nama, Email, dan Password wajib diisi`,
            );
            return;
          }

          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row.Email)) {
            errors.push(`Baris ${lineNum}: Format email tidak valid`);
            return;
          }

          // Password length validation
          if (row.Password.length < 6) {
            errors.push(`Baris ${lineNum}: Password minimal 6 karakter`);
            return;
          }

          validEmployees.push({
            name: row.Nama,
            email: row.Email,
            password: row.Password,
            department: row.Department || "",
            position: row.Jabatan || "",
          });
        });

        setImportErrors(errors);
        setImportPreview(validEmployees);
        setIsImportDialogOpen(true);
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Gagal membaca file Excel. Pastikan format file benar.");
      }
    };

    reader.readAsBinaryString(file);
  };

  // ============================================
  // IMPORT FROM EXCEL - EXECUTE
  // ============================================
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;

    setIsImporting(true);
    try {
      let successCount = 0;
      let failCount = 0;
      const failedEmails: string[] = [];

      for (const emp of importPreview) {
        try {
          const response = await fetch("/api/employees/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emp),
          });

          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            failCount++;
            failedEmails.push(emp.email);
          }
        } catch (error) {
          failCount++;
          failedEmails.push(emp.email);
        }
      }

      setIsImportDialogOpen(false);
      setImportPreview([]);

      let message = `Berhasil import ${successCount} karyawan`;
      if (failCount > 0) {
        message += `\nGagal: ${failCount} karyawan`;
        if (failedEmails.length > 0) {
          message += `\nEmail gagal: ${failedEmails.join(", ")}`;
        }
      }

      alert(message);
      onImportComplete();
    } catch (error) {
      console.error("Error importing:", error);
      alert("Gagal import karyawan");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      {/* Export & Import Buttons */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleDownloadTemplate}
          variant="outline"
          className="border-slate-300 dark:border-slate-700"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Download Template
        </Button>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import Excel
        </Button>

        <Button
          onClick={handleExportToExcel}
          disabled={isExporting}
          variant="outline"
          className="border-green-300 dark:border-green-700 text-green-600 dark:text-green-400"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "Exporting..." : "Export Excel"}
        </Button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Preview Import - {importPreview.length} Karyawan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Errors */}
            {importErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-300 mb-2">
                      {importErrors.length} Error Ditemukan:
                    </p>
                    <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                      {importErrors.slice(0, 10).map((err, idx) => (
                        <li key={idx}>• {err}</li>
                      ))}
                      {importErrors.length > 10 && (
                        <li className="font-semibold">
                          ... dan {importErrors.length - 10} error lainnya
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Table */}
            {importPreview.length > 0 && (
              <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Nama
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Email
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Department
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Jabatan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {importPreview.slice(0, 50).map((emp, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <td className="px-4 py-2 text-sm text-slate-900 dark:text-white">
                            {emp.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                            {emp.email}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                            {emp.department || "-"}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                            {emp.position || "-"}
                          </td>
                        </tr>
                      ))}
                      {importPreview.length > 50 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-2 text-center text-sm text-slate-500 dark:text-slate-400"
                          >
                            ... dan {importPreview.length - 50} karyawan lainnya
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(false)}
                className="flex-1 border-slate-300 dark:border-slate-700"
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isImporting || importPreview.length === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {isImporting
                  ? `Importing ${importPreview.length} karyawan...`
                  : `Import ${importPreview.length} Karyawan`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
