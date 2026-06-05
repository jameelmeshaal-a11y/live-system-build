import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/conversations")({
  ssr: false,
  component: ConversationsList,
});

function ConversationsList() {
  const { data } = useQuery({
    queryKey: ["conversations-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("contact_id, message, role, created_at, contacts(phone, name, store_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      // dedupe by contact_id keeping latest
      const seen = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unique: any[] = [];
      for (const r of data ?? []) {
        if (!r.contact_id || seen.has(r.contact_id)) continue;
        seen.add(r.contact_id);
        unique.push(r);
      }
      return unique;
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">المحادثات</h1>
        <p className="text-muted-foreground mt-1">آخر المحادثات النشطة</p>
      </div>

      <div className="space-y-2">
        {data?.map((c) => (
          <Link key={c.contact_id} to="/conversations/$contactId" params={{ contactId: c.contact_id }}>
            <Card className="hover:bg-accent/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary-glow" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate">
                      {c.contacts?.name ?? c.contacts?.store_name ?? c.contacts?.phone}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("ar-SA")}</div>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    <span className="font-medium">{c.role === "agent" ? "نور:" : "التاجر:"}</span> {c.message}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!data?.length && <Card><CardContent className="p-12 text-center text-muted-foreground">لا توجد محادثات بعد</CardContent></Card>}
      </div>
    </div>
  );
}
