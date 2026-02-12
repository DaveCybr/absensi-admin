import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: totalKaryawan } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: checkInHariIni } = await supabase
    .from("attendances")
    .select("*", { count: "exact", head: true })
    .eq("type", "check_in")
    .gte("created_at", today.toISOString());

  const { count: checkOutHariIni } = await supabase
    .from("attendances")
    .select("*", { count: "exact", head: true })
    .eq("type", "check_out")
    .gte("created_at", today.toISOString());

  const stats = [
    {
      title: "Total Karyawan",
      value: totalKaryawan ?? 0,
      icon: "👥",
      color: "text-blue-400",
    },
    {
      title: "Check In Hari Ini",
      value: checkInHariIni ?? 0,
      icon: "✅",
      color: "text-green-400",
    },
    {
      title: "Check Out Hari Ini",
      value: checkOutHariIni ?? 0,
      icon: "🏃",
      color: "text-orange-400",
    },
    {
      title: "Belum Check Out",
      value: (checkInHariIni ?? 0) - (checkOutHariIni ?? 0),
      icon: "⏳",
      color: "text-yellow-400",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-400 text-sm font-normal">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{stat.icon}</span>
                <span className={`text-4xl font-bold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
