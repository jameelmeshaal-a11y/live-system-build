# خطة الإصلاحات

## 1) إصلاح تكرار شاشة تسجيل الدخول (الوميض اللانهائي)

**السبب الجذري:**
- `src/routes/_authenticated/route.tsx` يستخدم `supabase.auth.getUser()` داخل `beforeLoad` (يقوم بطلب شبكة `/user`). عند أي فشل شبكة مؤقت يُعاد التوجيه إلى `/auth`، ثم `onAuthStateChange` في صفحة `/auth` يعيد التوجيه إلى `/dashboard` فوراً، فيتكرر اللوب (نرى في الكونسول عشرات أخطاء `NetworkError when attempting to fetch resource`).
- `useEffect` في `/auth` يضع `navigate` في قائمة التبعيات، ويستدعي `navigate` من داخل `getSession` و`onAuthStateChange` معاً → استدعاءان متتاليان.

**الإصلاح:**
- في `_authenticated/route.tsx`: استبدال `supabase.auth.getUser()` بـ `supabase.auth.getSession()` (قراءة محلية من التخزين، بدون طلب شبكة)، وإن لم توجد جلسة → redirect إلى `/auth`. لا يزال آمنًا لأن RLS تتحقق من الـ JWT في الطلبات اللاحقة.
- في `src/routes/auth.tsx`: حذف `navigate` من deps الـ `useEffect`، استخدام `ref` لمنع تكرار التوجيه، الاكتفاء بـ listener واحد (`onAuthStateChange` مع `INITIAL_SESSION`/`SIGNED_IN`)، وإزالة الاستدعاء المزدوج لـ `claim_admin_if_first` و`afterAuth`.

## 2) إصلاح خطأ حفظ "الحد اليومي" و"شخصية الذكاء الاصطناعي"

**السبب الجذري:**
- استدعاء `upsert` بدون `onConflict: "key"`، فيُعامَل كـ INSERT ويُصطدم بقيد PK على `key` (موجود مسبقًا) → خطأ.
- `warm_up` يحفظ حقل `week` غير موجود في الـ defaults الافتراضية، لا يضر ولكن سنبسطه.

**الإصلاح في `src/routes/_authenticated/settings.tsx`:**
- تعديل `save()` لاستخدام `.upsert(..., { onConflict: "key" })`.
- إظهار رسالة الخطأ الفعلية من Supabase بشكل واضح (مع `console.error` للتشخيص).
- إضافة تحقق: إذا لم يكن المستخدم admin → عرض تنبيه واضح بدل خطأ RLS غامض (CEO حاليًا دور `agent` → سنبقي الـ RLS كما هي لأن الإعدادات يجب أن تكون للأدمن فقط، فقط نوضح الرسالة).

## 3) تحسين رسائل تأكيد الرفع

- في `contacts.tsx`: الرسالة موجودة بالفعل. سنضيف:
  - عند فشل صفوف معينة (phone فارغ): إظهار العدد المُتجاهل بسبب رقم غير صالح.
  - تحويل toast إلى `toast.success(...)` مع وصف ثانوي (description) فيه التفاصيل.
  - بعد الرفع: تحديث عداد "الإجمالي" فورًا.

## 4) إضافة أمثلة حملات ناجحة

في `campaigns.tsx`، داخل نافذة "حملة جديدة":
- إضافة كرت "أمثلة جاهزة" يحتوي 3 أمثلة قابلة للنقر تملأ اسم الحملة:
  1. **"حملة الرياض — يناير 2026"** — استهداف تجار العبايات في الرياض.
  2. **"إعادة تفعيل العملاء الصامتين"** — لمن لم يرد منذ 30 يوم.
  3. **"إطلاق مجموعة رمضان"** — حملة موسمية قبل رمضان بأسبوعين.
- أسفل كل مثال شرح قصير (سطر واحد) للغرض ومتوسط معدل النجاح المتوقع.
- إضافة شرح "ما هي الحملة؟" مختصر داخل النافذة + رابط لدليل الاستخدام `/guide`.

## الملفات المعدّلة

- `src/routes/_authenticated/route.tsx` — استبدال getUser بـ getSession في beforeLoad
- `src/routes/auth.tsx` — تنظيف useEffect ومنع التوجيه المزدوج
- `src/routes/_authenticated/settings.tsx` — upsert بـ onConflict + رسائل خطأ واضحة
- `src/routes/_authenticated/contacts.tsx` — تحسين توست الرفع
- `src/routes/_authenticated/campaigns.tsx` — أمثلة جاهزة + شرح
