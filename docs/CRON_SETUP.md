# جدولة إرسال الرسائل عبر pg_cron

## 1. تأكد من تفعيل الإضافات (تم تلقائياً عبر migration):

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

تحقق:
```sql
SELECT extname FROM pg_extension WHERE extname IN ('pg_cron','pg_net');
```

## 2. جدولة الإرسال كل دقيقة

شغّل هذا SQL مرة واحدة في Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'dispatch-messages',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://nor-ai.lovable.app/api/public/cron/dispatch',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  )
  $$
);
```

> ملاحظة: إذا كنت تختبر على بيئة المعاينة استخدم:
> `https://project--b6303190-885f-45f5-a6fc-0a6a3a6aea6e-dev.lovable.app/api/public/cron/dispatch`

## 3. مراقبة المهام

```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

## 4. إيقاف الجدولة

```sql
SELECT cron.unschedule('dispatch-messages');
```

## ملاحظات

- الـ endpoint يحترم ساعات الإرسال (start_hour..end_hour) من جدول `settings`.
- يحترم حد التسخين اليومي (`warm_up.daily_limit`).
- يرسل رسالة واحدة كل دقيقة (لتجنب الحظر). للزيادة بعد التسخين، عدّل الجدول إلى كل 30 ثانية.
