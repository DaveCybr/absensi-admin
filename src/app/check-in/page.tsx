"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Camera,
  MapPin,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

export default function CheckInPage() {
  const [step, setStep] = useState<
    "init" | "camera" | "processing" | "success" | "error"
  >("init");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [employee, setEmployee] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadEmployee();
  }, []);

  const loadEmployee = async () => {
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
  };

  const getLocation = () => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      setStep("camera");
    } catch (err) {
      setError("Cannot access camera. Please allow camera permissions.");
      setStep("error");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const photoData = canvas.toDataURL("image/jpeg", 0.8);
    setPhoto(photoData);

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const handleCheckIn = async () => {
    if (!photo) {
      setError("Please capture your photo first");
      return;
    }

    setStep("processing");
    setError("");

    try {
      // Get location
      const loc = await getLocation();
      setLocation(loc);

      // Call check-in API
      const supabase = createClient();

      // Convert base64 to blob
      const base64Response = await fetch(photo);
      const blob = await base64Response.blob();

      // Upload photo to storage
      const fileName = `checkin-${employee.id}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("attendance-photos")
        .upload(fileName, blob);

      if (uploadError) {
        throw new Error("Failed to upload photo");
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("attendance-photos").getPublicUrl(fileName);

      // Call check-in API with face recognition
      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employee.id,
          latitude: loc.lat,
          longitude: loc.lng,
          photo_url: publicUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Check-in failed");
      }

      setStep("success");

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Check-in failed. Please try again.");
      setStep("error");
    }
  };

  const resetFlow = () => {
    setStep("init");
    setPhoto(null);
    setError("");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
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
            Check In
          </h1>
          <p className="text-lg text-slate-600">
            Hello, {employee.name}! Let's start your workday 🚀
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
          {/* Initial State */}
          {step === "init" && (
            <div className="text-center space-y-6">
              <div className="inline-flex p-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl shadow-blue-500/30">
                <Camera className="h-16 w-16 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Ready to Check In?
                </h2>
                <p className="text-slate-600">
                  We'll capture your photo and verify your location
                </p>
              </div>
              <Button
                onClick={startCamera}
                size="lg"
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02]"
              >
                <Camera className="h-5 w-5 mr-2" />
                Start Camera
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

          {/* Camera State */}
          {step === "camera" && (
            <div className="space-y-6">
              <div className="relative rounded-2xl overflow-hidden bg-slate-900">
                <video ref={videoRef} autoPlay playsInline className="w-full" />
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-2xl"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-64 h-80 border-4 border-blue-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
                <strong>📸 Position your face in the oval</strong>
                <br />
                Make sure your face is clearly visible and well-lit
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Capture Photo
                </Button>
                <Button
                  onClick={resetFlow}
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-2xl"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Photo Preview & Confirm */}
          {photo && step !== "processing" && step !== "success" && (
            <div className="space-y-6">
              <div className="rounded-2xl overflow-hidden">
                <img src={photo} alt="Captured" className="w-full" />
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-sm text-green-700">
                <strong>✓ Photo captured successfully!</strong>
                <br />
                Click confirm to complete check-in
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleCheckIn}
                  size="lg"
                  className="flex-1 h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-2xl shadow-lg"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Confirm Check In
                </Button>
                <Button
                  onClick={resetFlow}
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-2xl"
                >
                  Retake
                </Button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {step === "processing" && (
            <div className="text-center space-y-6 py-8">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Processing Check-In...
                </h2>
                <p className="text-slate-600">
                  Verifying your identity and location
                </p>
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
                  Check-In Successful! 🎉
                </h2>
                <p className="text-slate-600">Have a productive day at work!</p>
              </div>
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
                  Check-In Failed
                </h2>
                <p className="text-red-600 font-medium">{error}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={resetFlow}
                  size="lg"
                  className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => router.push("/dashboard")}
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-2xl"
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
