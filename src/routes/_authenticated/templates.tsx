import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/templates")({
  ssr: false,
  component: TemplatesPage,
});

function TemplatesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", language: "ar", body: "" });

  const { data: templates } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data } = await supabase.from("templates").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function save() {
    const { error } = await supabase.from("templates").insert(form);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    setOpen(false);
    setForm({ name: "", language: "ar", body: "" });
    qc.invalidateQueries({ queryKey: ["templates"] });
  }

  async function remove(id: string) {
    await supabase.from("templates").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["templates"] });
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">قوالب واتساب</h1>
          <p className="text-muted-foreground mt-1">قوالب HSM المعتمدة من Meta</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 ml-2" />قالب جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>قالب جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>الاسم (يطابق Meta)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="abayas_intro_v1" className="ltr" /></div>
              <div><Label>اللغة</Label><Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="ltr" /></div>
              <div><Label>النص</Label><Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <Button onClick={save} disabled={!form.name || !form.body} className="w-full">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates?.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="ltr text-base">{t.name}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge>{t.language}</Badge>
                  <Badge variant={t.status === "approved" ? "default" : "secondary"}>{t.status}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap">{t.body}</p></CardContent>
          </Card>
        ))}
        {!templates?.length && <Card><CardContent className="p-12 text-center text-muted-foreground">لا توجد قوالب</CardContent></Card>}
      </div>
    </div>
  );
}
