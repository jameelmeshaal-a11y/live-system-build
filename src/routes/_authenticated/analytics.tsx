import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/analytics")({
  ssr: false,
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: funnel } = useQuery({
    queryKey: ["analytics-funnel"],
    queryFn: async () => {
      const stages = ["pending", "sent", "replied", "interested", "converted"];
      const out: { stage: string; count: number }[] = [];
      for (const s of stages) {
        const { count } = await supabase.from("contacts").select("*", { count: "exact", head: true }).eq("status", s);
        out.push({ stage: s, count: count ?? 0 });
      }
      return out;
    },
  });

  const { data: cities } = useQuery({
    queryKey: ["analytics-cities"],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("city").not("city", "is", null).limit(5000);
      const map = new Map<string, number>();
      for (const r of data ?? []) {
        if (!r.city) continue;
        map.set(r.city, (map.get(r.city) ?? 0) + 1);
      }
      return Array.from(map.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">التحليلات</h1>
        <p className="text-muted-foreground mt-1">قمع التحويل وتوزيع المدن</p>
      </div>

      <Card>
        <CardHeader><CardTitle>قمع التحويل</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnel ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.04 290)" />
              <XAxis dataKey="stage" stroke="oklch(0.7 0.03 285)" />
              <YAxis stroke="oklch(0.7 0.03 285)" />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.05 290)", border: "1px solid oklch(0.3 0.04 290)" }} />
              <Bar dataKey="count" fill="oklch(0.62 0.22 295)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>أعلى المدن</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cities ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.04 290)" />
              <XAxis type="number" stroke="oklch(0.7 0.03 285)" />
              <YAxis dataKey="city" type="category" stroke="oklch(0.7 0.03 285)" width={80} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.05 290)", border: "1px solid oklch(0.3 0.04 290)" }} />
              <Bar dataKey="count" fill="oklch(0.82 0.16 85)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
