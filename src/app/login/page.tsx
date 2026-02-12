"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email dan password tidak boleh kosong");
      return;
    }

    setIsLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Login gagal, periksa email & password");
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-white text-2xl">👁</span>
          </div>
          <CardTitle className="text-white text-2xl">Absensi Admin</CardTitle>
          <p className="text-slate-400 text-sm">Masuk ke panel admin</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-slate-300">Email</Label>
            <Input
              type="email"
              placeholder="admin@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? "Memproses..." : "Masuk"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
