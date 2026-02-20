"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";

export default function CheckOutPage() {
  const [step, setStep] = useState<"init" | "processing" | "success" | "error">(
    "init",
  );
  const [employee, setEmployee] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: emp } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .single();

    setEmployee(emp);

    // Get today's attendance
    const today = new Date().toISOString().split("T")[0];
    const { data: attendance } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", emp.id)
      .gte("check_in_time", `${today}T00:00:00`)
      .lte("check_in_time", `${today}T23:59:59`)
      .order("check_in_time", { ascending: false })
      .limit(1)
      .single();

    setTodayAttendance(attendance);

    // Check if already checked out
    if (attendance?.check_out_time) {
      setError("You have already checked out today");
      setStep("error");
    }

    // Check if not checked in yet
    if (!attendance) {
      setError("You haven't checked in today");
      setStep("error");
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) {
      setError("No check-in record found for today");
      setStep("error");
      return;
    }

    setStep("processing");
    setError("");

    try {
      const response = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance_id: todayAttendance.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Check-out failed");
      }

      setStep("success");

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Check-out failed. Please try again.");
      setStep("error");
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = () => {
    if (!todayAttendance?.check_in_time) return "0h 0m";

    const checkIn = new Date(todayAttendance.check_in_time);
    const now = new Date();
    const diff = now.getTime() - checkIn.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
            Check Out
          </h1>
          <p className="text-lg text-slate-600">
            See you tomorrow, {employee.name}! 👋
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
          {/* Initial State - Show Work Summary */}
          {step === "init" &&
            todayAttendance &&
            !todayAttendance.check_out_time && (
              <div className="space-y-6">
                {/* Work Summary */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="h-8 w-8" />
                    <h2 className="text-2xl font-bold">Today's Work Summary</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-sm text-blue-100 mb-1">
                        Check-in Time
                      </p>
                      <p className="text-2xl font-bold">
                        {formatTime(todayAttendance.check_in_time)}
                      </p>
                    </div>

                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-sm text-blue-100 mb-1">
                        Work Duration
                      </p>
                      <p className="text-2xl font-bold">
                        {calculateDuration()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Check-out Info */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
                  <strong>ℹ️ Before you go:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Make sure you've saved all your work</li>
                    <li>Close all running applications</li>
                    <li>Your work time will be recorded</li>
                  </ul>
                </div>

                {/* Check-out Button */}
                <Button
                  onClick={handleCheckOut}
                  size="lg"
                  className="w-full h-14 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-orange-500/30 transition-all duration-300 hover:scale-[1.02]"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Confirm Check Out
                </Button>

                <Button
                  onClick={() => router.push("/dashboard")}
                  variant="outline"
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </div>
            )}

          {/* Processing State */}
          {step === "processing" && (
            <div className="text-center space-y-6 py-8">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Processing Check-Out...
                </h2>
                <p className="text-slate-600">Recording your work time</p>
              </div>
            </div>
          )}

          {/* Success State */}
          {step === "success" && (
            <div className="text-center space-y-6 py-8">
              <div className="inline-flex p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl shadow-xl shadow-green-500/30">
                <CheckCircle2 className="h-16 w-16 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Check-Out Successful! 🎉
                </h2>
                <p className="text-slate-600">
                  Great work today! Have a wonderful evening.
                </p>
              </div>
              {todayAttendance && (
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div>
                      <p className="text-sm text-green-700 mb-1">
                        Total Work Time
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        {calculateDuration()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 mb-1">
                        Check-out Time
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        {new Date().toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="text-sm text-slate-500">
                Redirecting to dashboard...
              </div>
            </div>
          )}

          {/* Error State */}
          {step === "error" && (
            <div className="text-center space-y-6 py-8">
              <div className="inline-flex p-6 bg-gradient-to-br from-red-500 to-rose-600 rounded-3xl shadow-xl shadow-red-500/30">
                <AlertCircle className="h-16 w-16 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Check-Out Not Available
                </h2>
                <p className="text-red-600 font-medium">{error}</p>
              </div>
              <Button
                onClick={() => router.push("/dashboard")}
                size="lg"
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl"
              >
                Back to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
