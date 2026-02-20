"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email,
        password,
      },
    );

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Check if employee exists
    const { data: employee } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

    if (!employee) {
      setError("Employee profile not found. Please contact administrator.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // Success - redirect to dashboard
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mb-4 shadow-xl shadow-blue-500/30">
              <Calendar className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h1>
            <p className="text-slate-600 text-lg">
              Sign in to continue to Attendance App
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-12 h-14 rounded-2xl border-2 border-slate-200 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-12 h-14 rounded-2xl border-2 border-slate-200 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-100 border-2 border-red-300 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Sign In</span>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Forgot Password?
              </button>
            </div>
          </div>

          {/* Bottom Text */}
          <p className="text-center text-sm text-slate-600 mt-6">
            Need help? Contact your administrator
          </p>
        </div>
      </div>

      {/* Right Side - Hero Image/Graphics */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-300 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-white max-w-xl">
          <h2 className="text-5xl font-black mb-6">
            Modern Attendance Management
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Track attendance with face recognition, GPS validation, and
            real-time analytics.
          </p>

          {/* Features List */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="p-2 bg-white/20 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Real-time Tracking</h3>
                <p className="text-blue-100 text-sm">
                  Monitor attendance as it happens
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="p-2 bg-white/20 rounded-xl">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Secure & Accurate</h3>
                <p className="text-blue-100 text-sm">
                  Face recognition + GPS verification
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="p-2 bg-white/20 rounded-xl">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Analytics Dashboard</h3>
                <p className="text-blue-100 text-sm">
                  Insights and reports at your fingertips
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
