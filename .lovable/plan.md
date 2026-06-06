# إكمال النظام + معالجة الملاحظات

## 1) إصلاح "Email not confirmed" (سبب عدم الانتقال للمنصة)

السبب: Supabase Auth يطلب تأكيد البريد افتراضياً. الحل:
- تفعيل **auto_confirm_email = true** عبر أداة configure_auth.
- نتيجة: أي تسجيل جديد يدخل مباشرة دون رابط تأكيد.

## 2) إنشاء حسابات جاهزة

- `admin@salasah.sa` / `Ss@2030` → دور **admin**
- `ceo@salasah.sa` / `Ss@2030` → دور **agent**

التنفيذ عبر `supabaseAdmin.auth.admin.createUser({ email_confirm: true })` ثم إدراج صف في `user_roles`. سأنفذ ذلك بسكربت يُشغّل مرة واحدة من خلال server function أو مباشرة عبر SQL + إدخال يدوي في dashboard إن لزم. الطريقة المعتمدة: استدعاء داخلي عبر `psql`/insert + سكربت Node صغير لإنشاء المستخدم في auth.

## 3) إضافة تسجيل الدخول بـ Google و Apple

- استدعاء `supabase--configure_social_auth` بـ `["google","apple"]` (مُدار من Lovable Cloud — لا حاجة لإعداد credentials).
- إنشاء `src/integrations/lovable/index.ts` تلقائياً عبر الأداة.
- تعديل `src/routes/auth.tsx`:
  - زرّان: "متابعة عبر Google" و"متابعة عبر Apple".
  - يستخدمان `lovable.auth.signInWithOAuth("google"|"apple", { redirect_uri: window.location.origin + "/auth/callback" })`.
- صفحة `/auth/callback` تستدعي `claim_admin_if_first` ثم تنتقل إلى `/dashboard`.

## 4) إصلاح "تم الدخول ولا ينتقل"

بعد إصلاح auto-confirm، `signIn` سينجح. أيضاً سأتأكد أن `afterAuth` تنتظر `getSession` قبل التنقل لتفادي سباق `_authenticated` gate.

## 5) الخطوة 12 — Checklist اختبار End-to-End

```
[ ] 1. الدخول كـ admin
[ ] 2. /contacts → استيراد ملف xlsx (عمودان: name, phone)
[ ] 3. /campaigns → إنشاء حملة + ربط جهات الاتصال
[ ] 4. الضغط "تشغيل" → يُدخل صف في message_queue
[ ] 5. /api/public/cron/dispatch (يدوياً عبر curl) → يجب أن يرسل (سيفشل بدون توكنات WA — متوقع)
[ ] 6. /settings → إدخال توكنات WA حقيقية لاحقاً
[ ] 7. محاكاة webhook: POST إلى /api/webhook/whatsapp بحمولة Meta → يجب إنشاء صف في conversations والرد عبر AI
[ ] 8. /conversations → ظهور المحادثة في الزمن الحقيقي
[ ] 9. /analytics → ظهور الإحصائيات
```

سأضيف هذه القائمة كـ `docs/E2E_CHECKLIST.md` داخل المشروع.

## 6) الخطوة 13 — pg_cron

أ. **التحقق من تفعيل pg_cron** عبر `supabase--read_query`:
```sql
SELECT extname FROM pg_extension WHERE extname IN ('pg_cron','pg_net');
```
إن لم تكن مفعّلة، سأفعّلها في migration:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

ب. **جدولة الإرسال** (سأضيفها في `docs/CRON_SETUP.md` + migration جاهز):
```sql
SELECT cron.schedule(
  'dispatch-messages',
  '* * * * *',
  $$SELECT net.http_post(
    url:='https://nor-ai.lovable.app/api/public/cron/dispatch',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  )$$
);
```

## 7) التجربة الفعلية بعد التنفيذ

- فتح المعاينة، تسجيل دخول `admin@salasah.sa` → التحقق من الانتقال إلى /dashboard.
- تسجيل دخول `ceo@salasah.sa` → التحقق.
- زر Google → التحقق أن popup يفتح بنجاح (لن أكمل تسجيل دخول حقيقي لأنه يتطلب حساب Google من المستخدم، لكن سأتحقق أن flow يبدأ بدون أخطاء).
- كتابة "تم" في نهاية الرد بعد التحقق.

---

## الملفات المتأثرة

- `supabase/migrations/*` — pg_cron + pg_net + extensions
- `src/integrations/lovable/index.ts` — يُنشأ تلقائياً
- `src/routes/auth.tsx` — أزرار Google/Apple + إصلاح afterAuth
- `src/routes/auth.callback.tsx` — جديد
- `docs/E2E_CHECKLIST.md` — جديد
- `docs/CRON_SETUP.md` — جديد
- إعدادات Auth: auto_confirm_email = true
- إنشاء مستخدمَين عبر supabaseAdmin
