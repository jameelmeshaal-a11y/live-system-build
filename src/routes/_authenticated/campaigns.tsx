import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { startCampaign, pauseCampaign } from "@/lib/campaigns.functions";

export const Route = createFileRoute("/_authenticated/campaigns")({
  ssr: false,
  component: CampaignsPage,
});

function CampaignsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [linkAll, setLinkAll] = useState(true);
  const startFn = useServerFn(startCampaign);
  const pauseFn = useServerFn(pauseCampaign);

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function createCampaign() {
    const { data: user } = await supabase.auth.getUser();
    const { data: camp, error } = await supabase
      .from("campaigns")
      .insert({ name, created_by: user.user?.id })
      .select("id")
      .single();
    if (error) return toast.error(error.message);

    if (linkAll && camp) {
      const { data: contacts } = await supabase.from("contacts").select("id").eq("dnc", false).limit(10000);
      if (contacts?.length) {
        await supabase.from("campaign_contacts").insert(
          contacts.map((c) => ({ campaign_id: camp.id, contact_id: c.id })),
        );
        await supabase.from("campaigns").update({ total: contacts.length }).eq("id", camp.id);
      }
    }

    toast.success("تم إنشاء الحملة");
    setOpen(false);
    setName("");
    qc.invalidateQueries({ queryKey: ["campaigns"] });
  }

  async function handleStart(id: string) {
    try {
      const res = await startFn({ data: { campaignId: id } });
      toast.success(`تم جدولة ${res.queued} رسالة`);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل");
    }
  }

  async function handlePause(id: string) {
    await pauseFn({ data: { campaignId: id } });
    toast.success("تم الإيقاف");
    qc.invalidateQueries({ queryKey: ["campaigns"] });
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الحملات</h1>
          <p className="text-muted-foreground mt-1">إدارة حملات التواصل</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 ml-2" />حملة جديدة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء حملة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
                <b className="text-foreground">ما هي الحملة؟</b> مجموعة من الرسائل الأولى تُرسَل تلقائياً عبر واتساب لقائمة من جهات الاتصال خلال فترة محددة، يتولى نور AI الردود ويتابع المهتمين.
              </div>

              <div>
                <Label>اسم الحملة</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="حملة الرياض - يناير" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">أمثلة جاهزة (انقر لتعبئة الاسم):</Label>
                {[
                  { n: "حملة الرياض — يناير 2026", d: "استهداف تجار العبايات في الرياض · معدل رد متوقع 18-25%" },
                  { n: "إعادة تفعيل العملاء الصامتين", d: "تواصل مع من لم يرد منذ 30 يوم · معدل تحويل 8-12%" },
                  { n: "إطلاق مجموعة رمضان", d: "قبل رمضان بأسبوعين · أعلى معدل تفاعل في السنة 30%+" },
                ].map((ex) => (
                  <button
                    key={ex.n}
                    type="button"
                    onClick={() => setName(ex.n)}
                    className="w-full text-right p-2 rounded-md border border-border hover:bg-accent transition-colors text-sm"
                  >
                    <div className="font-medium">{ex.n}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{ex.d}</div>
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={linkAll} onChange={(e) => setLinkAll(e.target.checked)} />
                إضافة جميع جهات الاتصال (غير المحظورة)
              </label>
              <Button onClick={createCampaign} disabled={!name} className="w-full">إنشاء الحملة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {campaigns?.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{c.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge>{c.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {c.sent} / {c.total} مُرسلة · {c.replied} ردود · {c.converted} تحويل
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {c.status !== "running" ? (
                  <Button size="sm" onClick={() => handleStart(c.id)} disabled={!c.total}>
                    <Play className="w-4 h-4 ml-1" />تشغيل
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handlePause(c.id)}>
                    <Pause className="w-4 h-4 ml-1" />إيقاف
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={c.total ? (c.sent / c.total) * 100 : 0} />
            </CardContent>
          </Card>
        ))}
        {!campaigns?.length && (
          <Card><CardContent className="p-12 text-center text-muted-foreground">لا توجد حملات بعد</CardContent></Card>
        )}
      </div>
    </div>
  );
}
