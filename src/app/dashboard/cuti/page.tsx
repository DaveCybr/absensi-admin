"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Check,
  X,
  Clock,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

type LeaveRequest = {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
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

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, filterStatus]);

  const loadRequests = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("leave_requests")
      .select("*, employees(name, email, department), leave_types(name, color)")
      .order("created_at", { ascending: false });

    setRequests((data as LeaveRequest[]) || []);
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...requests];

    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    setFilteredRequests(filtered);
  };

  // UPDATE FILE: src/app/dashboard/cuti/page.tsx
  // FIND handleApprove function and REPLACE with this:

  const handleApprove = async (requestId: string) => {
    setIsProcessing(true);
    try {
      // Get request details
      const request = requests.find((r) => r.id === requestId);
      if (!request) throw new Error("Request not found");

      // Update request status
      const { error: updateError } = await supabase
        .from("leave_requests")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Auto-update leave balance
      const requestYear = new Date(request.start_date).getFullYear();

      // Get current balance
      const { data: balanceData, error: balanceError } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", request.employees.id) // Fix: use employees.id from join
        .eq("leave_type_id", request.leave_types.id) // Fix: use leave_types.id from join
        .eq("year", requestYear)
        .single();

      if (balanceError && balanceError.code !== "PGRST116") {
        console.error("Error fetching balance:", balanceError);
      }

      if (balanceData) {
        // Update used_days
        const { error: updateBalanceError } = await supabase
          .from("leave_balances")
          .update({
            used_days: balanceData.used_days + request.total_days,
          })
          .eq("id", balanceData.id);

        if (updateBalanceError) {
          console.error("Error updating balance:", updateBalanceError);
          // Don't throw - request already approved
        }
      }

      loadRequests();
      setIsDialogOpen(false);
      alert(
        `Cuti disetujui! Saldo cuti telah dikurangi ${request.total_days} hari.`,
      );
    } catch (error) {
      console.error("Error approving:", error);
      alert("Gagal approve cuti");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      loadRequests();
      setIsDialogOpen(false);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setIsDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Stats
  const totalPending = requests.filter((r) => r.status === "pending").length;
  const totalApproved = requests.filter((r) => r.status === "approved").length;
  const totalRejected = requests.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Pengajuan Cuti
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Kelola dan approve pengajuan cuti karyawan
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Pengajuan
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {requests.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Menunggu Approval
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {totalPending}
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
                  Disetujui
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {totalApproved}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Ditolak
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {totalRejected}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-64 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
            Daftar Pengajuan ({filteredRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Memuat...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Tidak ada pengajuan
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {/* Employee Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {request.employees?.name}
                      </p>
                      <Badge
                        style={{
                          backgroundColor: request.leave_types?.color + "20",
                          color: request.leave_types?.color,
                          border: "none",
                        }}
                      >
                        {request.leave_types?.name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(request.start_date)} -{" "}
                        {formatDate(request.end_date)}
                      </span>
                      <span className="font-medium">
                        ({request.total_days} hari)
                      </span>
                    </div>
                    {request.reason && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        {request.reason}
                      </p>
                    )}
                    {request.rejection_reason && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Alasan ditolak: {request.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      className={
                        request.status === "approved"
                          ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-0"
                          : request.status === "rejected"
                            ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-0"
                            : request.status === "pending"
                              ? "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-0"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-0"
                      }
                    >
                      {request.status === "approved"
                        ? "Disetujui"
                        : request.status === "rejected"
                          ? "Ditolak"
                          : request.status === "pending"
                            ? "Pending"
                            : "Dibatalkan"}
                    </Badge>

                    {request.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          disabled={isProcessing}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRejectDialog(request)}
                          disabled={isProcessing}
                          className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Tolak Pengajuan Cuti
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <strong>{selectedRequest?.employees?.name}</strong>
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {selectedRequest?.start_date &&
                  formatDate(selectedRequest.start_date)}{" "}
                -{" "}
                {selectedRequest?.end_date &&
                  formatDate(selectedRequest.end_date)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Alasan Penolakan *
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Masukkan alasan penolakan..."
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 min-h-24"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 border-slate-300 dark:border-slate-700"
              >
                Batal
              </Button>
              <Button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? "Memproses..." : "Tolak Pengajuan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
