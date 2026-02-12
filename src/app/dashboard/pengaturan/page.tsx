"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OfficeSetting = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
};

export default function PengaturanPage() {
  const [setting, setSetting] = useState<OfficeSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius_meters: "",
  });
  const supabase = createClient();

  useEffect(() => {
    loadSetting();
  }, []);

  const loadSetting = async () => {
    const { data } = await supabase
      .from("office_settings")
      .select("*")
      .maybeSingle();

    if (data) {
      setSetting(data);
      setForm({
        name: data.name,
        latitude: String(data.latitude),
        longitude: String(data.longitude),
        radius_meters: String(data.radius_meters),
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (
      !form.name ||
      !form.latitude ||
      !form.longitude ||
      !form.radius_meters
    ) {
      return;
    }

    setIsSaving(true);
    setSuccess(false);

    const payload = {
      name: form.name,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      radius_meters: parseInt(form.radius_meters),
      updated_at: new Date().toISOString(),
    };

    if (setting) {
      await supabase
        .from("office_settings")
        .update(payload)
        .eq("id", setting.id);
    } else {
      await supabase.from("office_settings").insert(payload);
    }

    setSuccess(true);
    setIsSaving(false);
    loadSetting();
  };

  if (isLoading) {
    return <div className="p-8 text-slate-400 text-center">Memuat...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold">Pengaturan</h1>
        <p className="text-slate-400 text-sm mt-1">
          Konfigurasi lokasi dan radius absensi
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800 max-w-lg">
        <CardHeader>
          <CardTitle className="text-white text-lg">Lokasi Kantor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-green-400 text-sm">
                Pengaturan berhasil disimpan
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-slate-300">Nama Kantor</Label>
            <Input
              placeholder="Kantor Pusat"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Latitude</Label>
              <Input
                placeholder="-7.123456"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Longitude</Label>
              <Input
                placeholder="112.123456"
                value={form.longitude}
                onChange={(e) =>
                  setForm({ ...form, longitude: e.target.value })
                }
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Radius (meter)</Label>
            <Input
              type="number"
              placeholder="100"
              value={form.radius_meters}
              onChange={(e) =>
                setForm({ ...form, radius_meters: e.target.value })
              }
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
            <p className="text-slate-500 text-xs">
              Karyawan harus berada dalam radius ini untuk absen
            </p>
          </div>

          <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400">
            💡 Cara dapat koordinat: buka Google Maps, klik lokasi kantor,
            koordinat muncul di bagian bawah layar
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
