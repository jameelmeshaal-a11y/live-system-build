import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Send, User, Bot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendManualMessage } from "@/lib/conversations.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/conversations/$contactId")({
  ssr: false,
  component: ChatViewer,
});

function ChatViewer() {
  const { contactId } = Route.useParams();
  const qc = useQueryClient();
  const sendFn = useServerFn(sendManualMessage);
  const [input, setInput] = useState("");
  const [humanMode, setHumanMode] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: contact } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("*").eq("id", contactId).maybeSingle();
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", contactId],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    supabase
      .from("human_takeover")
      .select("contact_id")
      .eq("contact_id", contactId)
      .maybeSingle()
      .then(({ data }) => setHumanMode(!!data));
  }, [contactId]);

  useEffect(() => {
    const ch = supabase
      .channel(`conv:${contactId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations", filter: `contact_id=eq.${contactId}` },
        () => qc.invalidateQueries({ queryKey: ["messages", contactId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [contactId, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function toggleTakeover(checked: boolean) {
    if (checked) {
      await supabase.from("human_takeover").upsert({ contact_id: contactId });
    } else {
      await supabase.from("human_takeover").delete().eq("contact_id", contactId);
    }
    setHumanMode(checked);
    toast.success(checked ? "تم إيقاف الـ AI" : "تم استئناف الـ AI");
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await sendFn({ data: { contactId, message: input } });
      setInput("");
      qc.invalidateQueries({ queryKey: ["messages", contactId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الإرسال");
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/conversations"><Button variant="ghost" size="icon"><ArrowRight className="w-4 h-4" /></Button></Link>
          <div>
            <div className="font-bold">{contact?.name ?? contact?.store_name ?? "—"}</div>
            <div className="text-xs text-muted-foreground ltr">{contact?.phone}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="takeover" className="text-sm">تدخل بشري</Label>
          <Switch id="takeover" checked={humanMode} onCheckedChange={toggleTakeover} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gradient-to-b from-background to-[#0d0a1a]">
        {messages?.map((m) => {
          const isAgent = m.role === "agent";
          return (
            <div key={m.id} className={cn("flex gap-2", isAgent ? "justify-end" : "justify-start")}>
              {!isAgent && <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><User className="w-4 h-4" /></div>}
              <Card className={cn("max-w-md p-3", isAgent ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground" : "bg-card")}>
                <div className="text-sm whitespace-pre-wrap">{m.message}</div>
                <div className={cn("text-[10px] mt-1", isAgent ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {new Date(m.created_at).toLocaleTimeString("ar-SA")}
                </div>
              </Card>
              {isAgent && <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center"><Bot className="w-4 h-4 text-primary-glow" /></div>}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-border p-4 flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب رداً يدوياً..." />
        <Button type="submit" disabled={!input.trim()}><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  );
}
