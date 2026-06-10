import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendTestMessage } from "@/lib/test-send.functions";

export const Route = createFileRoute("/_authenticated/test-send")({
  ssr: false,
  component: TestSendPage,
});

function TestSendPage() {
  const send = useServerFn(sendTestMessage);
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"text" | "image" | "video" | "document">("text");
  const [message, setMessage] = useState("مرحباً 👋 هذه رسالة تجريبية من منصة نور AI.");
  const [mediaUrl, setMediaUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  async function onSend() {
    if (!phone) return toast.error("أدخل رقم الهاتف");
    setBusy(true);
    setLastLink(null);
    try {
      const res = await send({
        data: { phone, type, message: message || undefined, mediaUrl: mediaUrl || undefined },
      });
      if (!res.ok) {
        toast.error("فشل الإرسال", { description: res.error });
      } else if (res.manualLink) {
        setLastLink(res.manualLink);
        toast.success("جاهز للإرسال اليدوي", {
          description: "اضغط الزر أدناه لفتح واتساب ويب",
        });
      } else {
        toast.success("تم الإرسال بنجاح ✅", { description: `عبر مزود: ${res.provider}` });
      }
    } catch (e) {
      toast.error("خطأ", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">إرسال تجريبي</h1>
        <p className="text-muted-foreground mt-1">
          جرّب إرسال رسالة واحدة قبل تشغيل الحملات. يستخدم المزوّد المختار في
          الإعدادات (Meta / Unifonic / يدوي WAWCD).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>رسالة جديدة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>رقم الهاتف (السعودية أي صيغة)</Label>
            <Input
              className="ltr"
              placeholder="05XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <Label>نوع الرسالة</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">نص</SelectItem>
                <SelectItem value="image">صورة</SelectItem>
                <SelectItem value="video">فيديو</SelectItem>
                <SelectItem value="document">مستند (PDF)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type !== "text" && (
            <div>
              <Label>رابط الملف (URL مباشر)</Label>
              <Input
                className="ltr"
                placeholder="https://example.com/file.jpg"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                الملف يجب أن يكون متاحاً عبر رابط عام (HTTPS).
              </p>
            </div>
          )}

          <div>
            <Label>{type === "text" ? "النص" : "تعليق (اختياري)"}</Label>
            <Textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <Button onClick={onSend} disabled={busy} className="w-full">
            <Send className="w-4 h-4 ml-2" />
            {busy ? "جاري الإرسال..." : "إرسال تجريبي"}
          </Button>

          {lastLink && (
            <a
              href={lastLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md border border-primary text-primary hover:bg-primary/5"
            >
              <ExternalLink className="w-4 h-4" />
              فتح واتساب ويب لإرسال الرسالة
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>كيف أحصل على رقم تجريبي مجاني؟</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 leading-7">
          <p>
            <strong>المسار الأسرع — Meta Test Number (5 مستلمين مجاناً):</strong>
          </p>
          <ol className="list-decimal pr-6 space-y-1">
            <li>افتح <code>developers.facebook.com</code> ← My Apps ← Create App ← Business.</li>
            <li>أضف منتج WhatsApp ← ستحصل على رقم تجريبي + Phone Number ID + Access Token (24h).</li>
            <li>أضف رقمك الشخصي في قائمة "To" (Verified recipients).</li>
            <li>الصق التوكنات في <strong>الإعدادات</strong> ← اختر المزوّد <strong>Meta</strong>.</li>
            <li>ارجع لهنا وأرسل رسالتك الأولى.</li>
          </ol>
          <p className="pt-2">
            <strong>بديل سعودي — Unifonic:</strong> سجّل في <code>unifonic.com</code> ← Sandbox ←
            انسخ AppSid ← الصقه في الإعدادات.
          </p>
          <p>
            <strong>وضع يدوي — WAWCD:</strong> ثبّت امتداد WAWCD على Chrome، اختر مزوّد
            <strong> يدوي</strong> في الإعدادات، اضغط إرسال هنا ثم افتح الرابط في واتساب ويب.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
