## الهدف
تمكين إرسال رسائل واتساب تجريبية مجانية (نص + صور + فيديو) قبل الاعتماد الرسمي من Meta، مع دعم 3 مزودين قابلين للتبديل من شاشة الإعدادات.

## المزودون المدعومون

| المزود | مجاني؟ | API حقيقي؟ | الوسائط | ملاحظات |
|---|---|---|---|---|
| **Meta Cloud API – Test Number** | نعم (5 مستلمين) | نعم رسمي | نص/صور/فيديو/PDF | الأنسب والأرسخ |
| **Unifonic Sandbox (سعودي)** | نعم (رصيد تجريبي) | نعم REST | نص + قوالب | مزود سعودي معتمد |
| **WAWCD (إضافة بديلة)** | نعم محدود | امتداد كروم – لا API عام | يدوي عبر المتصفح | يُضاف كزر "نسخ النص + فتح واتساب ويب" فقط، لأنه ليس API |

> ملاحظة: WAWCD ليس له endpoint عام. سنضيفه كـ "وضع يدوي" (Click-to-Chat) — يفتح `https://wa.me/<phone>?text=<message>` ويمكن استخدامه مع امتداد WAWCD في متصفح المستخدم. هذا أقصى تكامل ممكن تقنياً معه.

## الخطوات

### 1) امتداد طبقة الإرسال (`src/lib/whatsapp.server.ts`)
- إضافة `provider` field في `whatsapp_config` (قيم: `meta` | `unifonic` | `manual`).
- إضافة `sendWhatsAppMedia(phone, type, mediaUrl, caption)` يدعم `image|video|document`.
- موجّه `dispatch(provider, ...)` يختار المزود بناءً على الإعدادات.
- `sendViaUnifonic()` — استدعاء `https://el.cloud.unifonic.com/rest/Messages/messages` بـ `AppSid`.

### 2) شاشة الإعدادات (`settings.tsx`)
- محدّد مزود (Radio): Meta / Unifonic / Manual (WAWCD).
- حقول ديناميكية لكل مزود (Meta: phone_number_id+token, Unifonic: AppSid+SenderID).

### 3) صفحة اختبار جديدة `/test-send`
- حقل رقم هاتف + اختيار نوع (نص/صورة/فيديو/مستند) + رفع ملف أو URL + نص.
- زر "إرسال تجريبي" → استدعاء serverFn → عرض نتيجة فورية.
- في وضع Manual: زر "فتح واتساب ويب" يفتح `wa.me` بالنص جاهز.

### 4) Storage Bucket للوسائط
- إنشاء bucket `wa-media` عام مع RLS للقراءة العامة والكتابة للمستخدمين المسجلين.

### 5) دليل الاستخدام
- تحديث `/guide` بقسم "كيف أُرسل أول رسالة تجريبية مجانية" خطوة بخطوة لكل مزود.

### 6) محاكاة التشغيل (أنا أقوم بها قبل تسليمك)
- تشغيل `stack_modern--invoke-server-function` لاستدعاء `/api/public/cron/dispatch` و `sendTestMessage` في وضع stub (بدون توكنات) للتحقق من عدم وجود أخطاء runtime.
- قراءة `server-function-logs` للتأكد من سلامة المسار.
- اختبار صفحة `/test-send` عبر معاينة المتصفح.

### 7) تعليمات التجربة الناجحة الأولى (سأرسلها لك بعد التطبيق)
سأعطيك خطوات دقيقة جداً (5 دقائق):
1. افتح `developers.facebook.com` → My Apps → Create App → Business → WhatsApp.
2. انسخ: Phone Number ID + Temporary Access Token (24h) + WABA ID.
3. أضِف رقمك الشخصي في قائمة "To" (verified recipients).
4. الصق التوكنات في `/settings` → "Meta Cloud API".
5. اذهب إلى `/test-send` → أدخل رقمك → اكتب "تجربة" → اضغط إرسال.
6. ستصلك الرسالة على واتساب خلال ثوانٍ.
7. ردّ "اهلا" → ستظهر في `/conversations` ويرد عليك AI تلقائياً.

## الملفات المتأثرة
- `src/lib/whatsapp.server.ts` (تعديل)
- `src/routes/_authenticated/settings.tsx` (تعديل)
- `src/routes/_authenticated/test-send.tsx` (جديد)
- `src/lib/test-send.functions.ts` (جديد)
- `src/routes/_authenticated/guide.tsx` (تعديل)
- `supabase/migrations/*` (storage bucket جديد)
- `src/routes/_authenticated/route.tsx` (إضافة رابط جانبي "إرسال تجريبي")

هل أتابع بهذا المخطط؟
