import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

function useSettings(key: string) {
  return useQuery({
    queryKey: ["settings", key],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
      return data?.value ?? null;
    },
  });
}

function SettingsPage() {
  const qc = useQueryClient();
  const wa = useSettings("whatsapp_config");
  const sched = useSettings("sending_schedule");
  const warm = useSettings("warm_up");
  const prompt = useSettings("system_prompt");

  const [waForm, setWaForm] = useState({ phone_number_id: "", access_token: "", waba_id: "", verify_token: "", api_version: "v20.0" });
  const [schedForm, setSchedForm] = useState({ start_hour: 9, end_hour: 21, timezone: "Asia/Riyadh" });
  const [warmForm, setWarmForm] = useState({ daily_limit: 50, week: 1 });
  const [promptText, setPromptText] = useState("");

  useEffect(() => { if (wa.data) setWaForm({ ...waForm, ...(wa.data as object) }); /* eslint-disable-next-line */ }, [wa.data]);
  useEffect(() => { if (sched.data) setSchedForm({ ...schedForm, ...(sched.data as object) }); /* eslint-disable-next-line */ }, [sched.data]);
  useEffect(() => { if (warm.data) setWarmForm({ ...warmForm, ...(warm.data as object) }); /* eslint-disable-next-line */ }, [warm.data]);
  useEffect(() => { if (typeof prompt.data === "string") setPromptText(prompt.data); }, [prompt.data]);

  async function save(key: string, value: unknown) {
    const { error } = await supabase.from("settings").upsert({ key, value: value as never, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["settings", key] });
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">تكوين النظام</p>
      </div>

      <Card>
        <CardHeader><CardTitle>توكنات واتساب (Meta Cloud API)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Phone Number ID</Label><Input className="ltr" value={waForm.phone_number_id} onChange={(e) => setWaForm({ ...waForm, phone_number_id: e.target.value })} /></div>
          <div><Label>Access Token</Label><Input className="ltr" type="password" value={waForm.access_token} onChange={(e) => setWaForm({ ...waForm, access_token: e.target.value })} /></div>
          <div><Label>WABA ID</Label><Input className="ltr" value={waForm.waba_id} onChange={(e) => setWaForm({ ...waForm, waba_id: e.target.value })} /></div>
          <div><Label>Verify Token (للـ webhook)</Label><Input className="ltr" value={waForm.verify_token} onChange={(e) => setWaForm({ ...waForm, verify_token: e.target.value })} /></div>
          <Button onClick={() => save("whatsapp_config", waForm)}>حفظ</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>جدول الإرسال</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>من ساعة</Label><Input type="number" min={0} max={23} value={schedForm.start_hour} onChange={(e) => setSchedForm({ ...schedForm, start_hour: Number(e.target.value) })} /></div>
            <div><Label>إلى ساعة</Label><Input type="number" min={0} max={23} value={schedForm.end_hour} onChange={(e) => setSchedForm({ ...schedForm, end_hour: Number(e.target.value) })} /></div>
          </div>
          <Button onClick={() => save("sending_schedule", schedForm)}>حفظ</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>التسخين (Warm-up)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>الحد اليومي للرسائل</Label><Input type="number" min={1} value={warmForm.daily_limit} onChange={(e) => setWarmForm({ ...warmForm, daily_limit: Number(e.target.value) })} /></div>
          <p className="text-xs text-muted-foreground">ابدأ بـ 50 لمدة أسبوع، ثم 100، ثم 200... الرقم العالي مبكراً يحرق الرقم.</p>
          <Button onClick={() => save("warm_up", warmForm)}>حفظ</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>شخصية الذكاء الاصطناعي</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={8} value={promptText} onChange={(e) => setPromptText(e.target.value)} />
          <Button onClick={() => save("system_prompt", promptText)}>حفظ</Button>
        </CardContent>
      </Card>
    </div>
  );
}
