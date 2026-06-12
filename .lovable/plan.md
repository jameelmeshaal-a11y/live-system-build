# خطة تنفيذ أمر العمل الكامل — منصة نور AI

## P0 — الأخطاء الحرجة (يجب قبل الإطلاق)

### 1. إصلاح RLS على جدول `settings` (خطأ #2)
- مشكلة: حفظ الإعدادات يُرجع 403 → ربط واتساب مستحيل.
- الحل: migration جديدة تُفعّل RLS وتضيف سياسة كتابة:
  - `SELECT` للجميع المصادقين
  - `INSERT/UPDATE/DELETE` للمدير فقط (`has_role(auth.uid(), 'admin')`)
  - منح `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`
- التحقق: حفظ من `/settings` يعود 200.

### 2. إصلاح `HEAD → 503` في إحصائيات لوحة التحكم (خطأ #1)
- مشكلة: استدعاءات `count: 'exact', head: true` تُرجع 503 في Cloudflare/Worker.
- الحل في `src/routes/_authenticated/dashboard.tsx` (وأي ملف يستخدم نفس النمط): استبدال
  - `select('*', { count: 'exact', head: true })` بـ
  - `select('id', { count: 'exact' }).limit(1)` — يبقى GET ويعيد العدد دون تحميل بيانات.
- التحقق: الأرقام تظهر صحيحة في الداشبورد.

### 3. إصلاح زر "تشغيل الحملة" (خطأ #3 — Seroval Error)
- مشكلة: server function لتشغيل الحملة ترمي خطأ غير قابل للتسلسل، فيتحول إلى Seroval Error صامت.
- الحل في `src/lib/campaigns.functions.ts`:
  - تغليف الـ handler بـ `try/catch` يُعيد `{ ok: false, error: string }` بدل throw raw.
  - إصلاح أي `throw new Error(obj)` → `throw new Error(String(obj))`.
- الحل في `src/routes/_authenticated/campaigns.tsx`:
  - إضافة `AlertDialog` تأكيد قبل التشغيل يعرض: اسم الحملة، عدد جهات الاتصال، اسم القالب.
  - عرض `toast.error(result.error)` عند الفشل، `toast.success` عند النجاح.
  - `qc.invalidateQueries(['campaigns'])` بعد التشغيل.

## P1 — الأسبوع الأول

### 4. تعارض عدد جهات الاتصال 331 vs 200 (خطأ #4)
- في `src/routes/_authenticated/contacts.tsx`:
  - استخدام `count: 'exact'` للحصول على الإجمالي الحقيقي من DB.
  - عرض `<عدد محمّل> من <إجمالي>` في الواجهة.
  - إضافة pagination بسيطة (زر "تحميل المزيد" بحجم صفحة 200).

### 5. مسار `/login` يُرجع 404 (خطأ #5)
- إنشاء `src/routes/login.tsx` مع `beforeLoad: () => redirect({ to: '/auth' })`.

## P2 — تحسينات UX

### 6. Toast notifications لجميع حالات الخطأ
- مراجعة `settings.tsx`, `campaigns.tsx`, `contacts.tsx`, `test-send.tsx` للتأكد أن كل استدعاء async يعرض toast واضح عند الفشل.

## الملفات المتأثرة
- `supabase/migrations/*` (جديد: RLS سياسة settings)
- `src/routes/_authenticated/dashboard.tsx` (تعديل count queries)
- `src/lib/campaigns.functions.ts` (try/catch + serialization)
- `src/routes/_authenticated/campaigns.tsx` (AlertDialog + toasts)
- `src/routes/_authenticated/contacts.tsx` (إجمالي حقيقي + pagination)
- `src/routes/login.tsx` (جديد: redirect)

## التحقق النهائي
1. تشغيل `stack_modern--invoke-server-function` لاختبار `launchCampaign`.
2. قراءة `server-function-logs` للتحقق من عدم وجود Seroval errors.
3. فتح المعاينة واختبار: حفظ إعدادات → تشغيل حملة وهمية → فحص أرقام الداشبورد.

هل أتابع التنفيذ؟
