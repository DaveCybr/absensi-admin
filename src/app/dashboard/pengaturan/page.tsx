"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings,
  MapPin,
  Clock,
  Save,
  AlertCircle,
  CheckCircle,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SettingsData = {
  id?: string;
  office_name: string;
  office_address: string;
  office_latitude: number;
  office_longitude: number;
  attendance_radius: number;
  work_start_time: string;
  work_end_time: string;
  late_tolerance_minutes: number;
  created_at?: string;
  updated_at?: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    office_name: "",
    office_address: "",
    office_latitude: -8.1667,
    office_longitude: 113.7,
    attendance_radius: 100,
    work_start_time: "08:00",
    work_end_time: "17:00",
    late_tolerance_minutes: 15,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.log("No settings found, using defaults");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .single();

      let result;
      if (existing) {
        // Update existing
        result = await supabase
          .from("settings")
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        // Insert new
        result = await supabase.from("settings").insert({
          ...settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      if (result.error) throw result.error;

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentLocation({ lat, lng });
          setSettings({
            ...settings,
            office_latitude: lat,
            office_longitude: lng,
          });
        },
        (error) => {
          alert("❌ Tidak dapat mengakses lokasi. Pastikan GPS aktif.");
        },
      );
    } else {
      alert("❌ Browser tidak support geolocation");
    }
  };

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${settings.office_latitude},${settings.office_longitude}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Pengaturan Sistem
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Konfigurasi lokasi kantor, radius absensi, dan jam kerja
        </p>
      </div>

      {/* Save Status Banner */}
      {saveStatus === "success" && (
        <Card className="bg-gradient-to-r from-green-500 to-green-600 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6" />
              <div>
                <p className="font-semibold">Berhasil Disimpan!</p>
                <p className="text-sm opacity-90">Pengaturan telah diupdate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {saveStatus === "error" && (
        <Card className="bg-gradient-to-r from-red-500 to-red-600 border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              <div>
                <p className="font-semibold">Gagal Menyimpan</p>
                <p className="text-sm opacity-90">Silakan coba lagi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card className="bg-white dark:bg-slate-900">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-4 text-slate-500">Memuat pengaturan...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Office Location Settings */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Lokasi Kantor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Office Name */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nama Kantor
                </Label>
                <Input
                  type="text"
                  value={settings.office_name}
                  onChange={(e) =>
                    setSettings({ ...settings, office_name: e.target.value })
                  }
                  placeholder="PT Nano Indonesia Sakti"
                  className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 h-12"
                />
              </div>

              {/* Office Address */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Alamat Lengkap
                </Label>
                <textarea
                  value={settings.office_address}
                  onChange={(e) =>
                    setSettings({ ...settings, office_address: e.target.value })
                  }
                  placeholder="Jl. Example No. 123, Jember"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-white resize-none"
                  rows={3}
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Latitude
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={settings.office_latitude}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        office_latitude: parseFloat(e.target.value),
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Longitude
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={settings.office_longitude}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        office_longitude: parseFloat(e.target.value),
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 h-12"
                  />
                </div>
              </div>

              {/* GPS Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  className="flex-1 h-12 border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Gunakan Lokasi Saat Ini
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openGoogleMaps}
                  className="flex-1 h-12 border-2 border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Lihat di Maps
                </Button>
              </div>

              {/* Current Location Display */}
              {currentLocation && (
                <div className="bg-green-50 dark:bg-green-950 border-2 border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                    ✓ Lokasi berhasil diambil: {currentLocation.lat.toFixed(6)},{" "}
                    {currentLocation.lng.toFixed(6)}
                  </p>
                </div>
              )}

              {/* Attendance Radius */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Radius Absensi (meter)
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={settings.attendance_radius}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attendance_radius: parseInt(e.target.value),
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 h-12 flex-1"
                  />
                  <Badge className="bg-indigo-600 text-white px-4 py-2 text-sm">
                    {settings.attendance_radius}m
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Karyawan harus berada dalam radius ini untuk absen
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Work Hours Settings */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                Jam Kerja & Toleransi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Work Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Jam Mulai
                  </Label>
                  <Input
                    type="time"
                    value={settings.work_start_time}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        work_start_time: e.target.value,
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 h-12 text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Jam Selesai
                  </Label>
                  <Input
                    type="time"
                    value={settings.work_end_time}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        work_end_time: e.target.value,
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 h-12 text-lg font-bold"
                  />
                </div>
              </div>

              {/* Late Tolerance */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Toleransi Keterlambatan (menit)
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={settings.late_tolerance_minutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        late_tolerance_minutes: parseInt(e.target.value),
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 h-12 flex-1"
                  />
                  <Badge className="bg-orange-600 text-white px-4 py-2 text-sm">
                    {settings.late_tolerance_minutes} menit
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Keterlambatan dibawah ini tidak dihitung terlambat
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-semibold mb-2">Contoh Perhitungan:</p>
                    <ul className="space-y-1 text-xs">
                      <li>
                        • Jam kerja: {settings.work_start_time} -{" "}
                        {settings.work_end_time}
                      </li>
                      <li>
                        • Toleransi: {settings.late_tolerance_minutes} menit
                      </li>
                      <li>
                        • Check in 08:
                        {settings.late_tolerance_minutes
                          .toString()
                          .padStart(2, "0")}{" "}
                        = Tepat waktu ✓
                      </li>
                      <li>
                        • Check in 08:
                        {(settings.late_tolerance_minutes + 1)
                          .toString()
                          .padStart(2, "0")}{" "}
                        = Terlambat 1 menit ✗
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Preview Card */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-300 dark:border-green-700 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-900 dark:text-green-200 mb-2 uppercase tracking-wide">
                  Preview Jam Kerja
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {settings.work_start_time}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Jam Masuk
                    </p>
                  </div>
                  <div className="text-green-600 dark:text-green-400">
                    <div className="w-12 h-0.5 bg-green-400 dark:bg-green-600"></div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {settings.work_end_time}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Jam Pulang
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Button */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Simpan Perubahan
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Perubahan akan langsung diterapkan ke sistem
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 text-base font-semibold"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Menyimpan...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Simpan Pengaturan
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-8 h-8 text-purple-600 dark:text-purple-400 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-purple-900 dark:text-purple-100 mb-1">
                  GPS Tracking
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Sistem akan validasi lokasi karyawan saat absen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-orange-900 dark:text-orange-100 mb-1">
                  Auto Calculate
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Keterlambatan dihitung otomatis berdasarkan jam kerja
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                  Flexible Config
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Sesuaikan pengaturan kapan saja sesuai kebutuhan
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
