import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/guide")({
  ssr: false,
  component: GuidePage,
});

function GuidePage() {
  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold">دليل استخدام المنصة</h1>
          <p className="text-muted-foreground mt-1">شرح خطوة بخطوة لكل ميزات نور AI</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 ml-2" /> طباعة
          </Button>
          <Button onClick={() => window.print()}>
            <Download className="w-4 h-4 ml-2" /> تنزيل PDF
          </Button>
        </div>
      </div>

      <div id="guide-print" className="space-y-6 print:space-y-4">
        <Card>
          <CardHeader><CardTitle>1. تسجيل الدخول</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm leading-7">
            <p>افتح صفحة الدخول، أدخل بريدك وكلمة المرور، أو سجّل عبر Google / Apple.</p>
            <p>أيقونة العين بجانب حقل كلمة المرور تتيح إظهار أو إخفاء النص.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. الإعدادات قبل البدء</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm leading-7">
            <p><strong>توكنات واتساب:</strong> ضع <code>Phone Number ID</code>, <code>Access Token</code>, <code>WABA ID</code>, <code>Verify Token</code> من Meta.</p>
            <p><strong>جدول الإرسال:</strong> حدّد ساعات الإرسال (مثل 9 ص — 9 م) لتجنب الإزعاج.</p>
            <p><strong>التسخين (Warm-up):</strong> الحد اليومي للرسائل. ابدأ بـ 50 رسالة في الأسبوع الأول ثم 100 ثم 200… الأرقام العالية مبكراً تحرق رقم واتساب.</p>
            <p><strong>شخصية الذكاء الاصطناعي:</strong> النص الذي يحدّد أسلوب الردود (لهجة، نبرة، أهداف).</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>3. جهات الاتصال</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm leading-7">
            <p>اذهب إلى <strong>جهات الاتصال</strong> ← اضغط <strong>تنزيل القالب</strong> للحصول على ملف Excel فارغ.</p>
            <p>افتح الملف وأضف الأرقام بالأعمدة: <code>phone, name, store_name, city, instagram, notes</code>.</p>
            <p>الأرقام السعودية تُقبل بأي صيغة (05x, 9665x, +9665x). يتم تحويلها تلقائياً.</p>
            <p>اضغط <strong>رفع Excel</strong> وارفع الملف؛ ستظهر رسالة تأكيد بعدد جهات الاتصال المضافة.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>4. ما هي "الحملة"؟</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm leading-7">
            <p><strong>الحملة</strong> هي مجموعة مستهدفة من جهات الاتصال يُرسَل لها نفس الرسالة التعريفية في نفس الفترة الزمنية، ويتولى الذكاء الاصطناعي المتابعة معهم.</p>
            <p>مثال: «حملة تجار العبايات في الرياض - يونيو» = 500 رقم تم رفعه، قالب رسالة افتتاحية، جدول إرسال 60 رسالة/يوم.</p>
            <p><strong>خطوات إنشاء حملة:</strong></p>
            <ol className="list-decimal pr-6 space-y-1">
              <li>اذهب إلى <strong>الحملات</strong> ← <strong>حملة جديدة</strong>.</li>
              <li>أعطها اسم واضح يصف الفئة المستهدفة.</li>
              <li>اربط جهات الاتصال (رفع Excel مع تحديد الحملة).</li>
              <li>اختر القالب المعتمد من Meta.</li>
              <li>اضغط <strong>بدء</strong> — يبدأ النظام بجدولة الرسائل ضمن حدود التسخين وساعات الإرسال.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>5. المحادثات</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm leading-7">
            <p>يردّ الذكاء الاصطناعي تلقائياً حسب حالة المحادثة (تعريف، اهتمام، إغلاق، انسحاب).</p>
            <p>يمكنك التدخل اليدوي بتفعيل <strong>استلام بشري</strong> داخل المحادثة لإيقاف الردود التلقائية والكتابة بنفسك.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>6. القوالب</CardTitle></CardHeader>
          <CardContent className="text-sm leading-7">
            <p>قوالب Meta المعتمدة المستخدمة كرسالة افتتاحية للحملات. يجب اعتمادها من Meta قبل الاستخدام.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>7. التحليلات</CardTitle></CardHeader>
          <CardContent className="text-sm leading-7">
            <p>قمع التحويل (مُرسَل ← ردّ ← مهتم ← تحوّل) وتوزيع العملاء حسب المدينة.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>8. الأدوار</CardTitle></CardHeader>
          <CardContent className="text-sm leading-7">
            <p><strong>مدير (Admin):</strong> صلاحيات كاملة. <strong>موظف (Agent):</strong> قراءة + الردّ في المحادثات.</p>
            <p>أول مستخدم يسجّل يصبح مديراً تلقائياً.</p>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          aside, .print\\:hidden { display: none !important; }
          main { overflow: visible !important; }
          .text-muted-foreground { color: #444 !important; }
          [class*="bg-"] { background: white !important; }
          [class*="text-"] { color: black !important; }
          .border, [class*="border-"] { border-color: #ccc !important; }
        }
      `}</style>
    </div>
  );
}
