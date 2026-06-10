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

  const [waForm, setWaForm] = useState({
    provider: "meta" as "meta" | "unifonic" | "manual",
    phone_number_id: "",
    access_token: "",
    waba_id: "",
    verify_token: "",
    api_version: "v20.0",
    unifonic_app_sid: "",
    unifonic_sender_id: "",
  });
  const [schedForm, setSchedForm] = useState({ start_hour: 9, end_hour: 21, timezone: "Asia/Riyadh" });
  const [warmForm, setWarmForm] = useState({ daily_limit: 50, week: 1 });
  const [promptText, setPromptText] = useState("");

  useEffect(() => { if (wa.data) setWaForm({ ...waForm, ...(wa.data as object) }); /* eslint-disable-next-line */ }, [wa.data]);
  useEffect(() => { if (sched.data) setSchedForm({ ...schedForm, ...(sched.data as object) }); /* eslint-disable-next-line */ }, [sched.data]);
  useEffect(() => { if (warm.data) setWarmForm({ ...warmForm, ...(warm.data as object) }); /* eslint-disable-next-line */ }, [warm.data]);
  useEffect(() => { if (typeof prompt.data === "string") setPromptText(prompt.data); }, [prompt.data]);

  async function save(key: string, value: unknown) {
    const { error } = await supabase
      .from("settings")
      .upsert({ key, value: value as never, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) {
      console.error("settings save failed", key, error);
      const msg = error.message?.includes("row-level security")
        ? "ليس لديك صلاحية حفظ الإعدادات (يتطلب دور مدير)"
        : error.message || "تعذّر الحفظ";
      return toast.error(msg);
    }
    toast.success("تم الحفظ بنجاح ✅", { description: `تم تحديث ${key}` });
    qc.invalidateQueries({ queryKey: ["settings", key] });
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">تكوين النظام</p>
      </div>

      <Card>
        <CardHeader><CardTitle>مزوّد واتساب</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>اختر المزوّد</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(["meta", "unifonic", "manual"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setWaForm({ ...waForm, provider: p })}
                  className={`px-3 py-2 rounded-md border text-sm transition ${
                    waForm.provider === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {p === "meta" ? "Meta (رسمي)" : p === "unifonic" ? "Unifonic (سعودي)" : "يدوي (WAWCD)"}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {waForm.provider === "meta" && "رسمي من Meta. يدعم رقم تجريبي مجاني (5 مستلمين)."}
              {waForm.provider === "unifonic" && "مزود سعودي معتمد، Sandbox مجاني."}
              {waForm.provider === "manual" && "يفتح wa.me في المتصفح. استخدمه مع امتداد WAWCD على Chrome."}
            </p>
          </div>

          {waForm.provider === "meta" && (
            <>
              <div><Label>Phone Number ID</Label><Input className="ltr" value={waForm.phone_number_id} onChange={(e) => setWaForm({ ...waForm, phone_number_id: e.target.value })} /></div>
              <div><Label>Access Token</Label><Input className="ltr" type="password" value={waForm.access_token} onChange={(e) => setWaForm({ ...waForm, access_token: e.target.value })} /></div>
              <div><Label>WABA ID</Label><Input className="ltr" value={waForm.waba_id} onChange={(e) => setWaForm({ ...waForm, waba_id: e.target.value })} /></div>
              <div><Label>Verify Token (للـ webhook)</Label><Input className="ltr" value={waForm.verify_token} onChange={(e) => setWaForm({ ...waForm, verify_token: e.target.value })} /></div>
            </>
          )}

          {waForm.provider === "unifonic" && (
            <>
              <div><Label>App SID</Label><Input className="ltr" type="password" value={waForm.unifonic_app_sid} onChange={(e) => setWaForm({ ...waForm, unifonic_app_sid: e.target.value })} /></div>
              <div><Label>Sender ID</Label><Input className="ltr" value={waForm.unifonic_sender_id} onChange={(e) => setWaForm({ ...waForm, unifonic_sender_id: e.target.value })} /></div>
            </>
          )}

          {waForm.provider === "manual" && (
            <p className="text-sm bg-muted/50 p-3 rounded-md">
              لا توجد توكنات. الرسائل ستفتح في واتساب ويب يدوياً عبر صفحة "إرسال تجريبي".
            </p>
          )}

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
