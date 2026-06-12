import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageSquare, CheckCircle2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number | string; color: string }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [contacts, sent, replied, converted] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact" }).limit(1),
        supabase.from("contacts").select("id", { count: "exact" }).in("status", ["sent", "replied", "interested", "converted"]).limit(1),
        supabase.from("contacts").select("id", { count: "exact" }).in("status", ["replied", "interested", "converted"]).limit(1),
        supabase.from("contacts").select("id", { count: "exact" }).eq("status", "converted").limit(1),
      ]);
      return {
        total: contacts.count ?? 0,
        sent: sent.count ?? 0,
        replied: replied.count ?? 0,
        converted: converted.count ?? 0,
      };
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-1">نظرة عامة على أداء حملاتك</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="إجمالي جهات الاتصال" value={data?.total ?? "—"} color="bg-primary/20 text-primary-glow" />
        <StatCard icon={Send} label="رسائل مُرسلة" value={data?.sent ?? "—"} color="bg-chart-4/20 text-chart-4" />
        <StatCard icon={MessageSquare} label="ردود" value={data?.replied ?? "—"} color="bg-gold/20 text-gold" />
        <StatCard icon={CheckCircle2} label="تحويلات" value={data?.converted ?? "—"} color="bg-success/20 text-success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>كيف تبدأ</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>١. أدخل توكنات واتساب في صفحة <b className="text-foreground">الإعدادات</b>.</p>
          <p>٢. ارفع ملف Excel بجهات الاتصال من صفحة <b className="text-foreground">جهات الاتصال</b>.</p>
          <p>٣. أنشئ <b className="text-foreground">حملة</b> جديدة وأطلقها.</p>
          <p>٤. سيتولى الذكاء الاصطناعي الردود تلقائياً عبر <b className="text-foreground">المحادثات</b>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
