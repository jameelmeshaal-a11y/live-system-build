# قائمة اختبار End-to-End

## الحسابات الجاهزة
- **Admin**: `admin@salasah.sa` / `Ss@2030`
- **Business (Agent)**: `ceo@salasah.sa` / `Ss@2030`

## الخطوات

- [ ] 1. تسجيل الدخول كـ admin → التحقق من الانتقال إلى `/dashboard`.
- [ ] 2. `/contacts` → استيراد ملف `.xlsx` (أعمدة: name, phone, city, store_name, instagram).
- [ ] 3. التحقق من تطبيع أرقام الهاتف السعودية (يبدأ بـ `966`).
- [ ] 4. `/campaigns` → إنشاء حملة + ربط جهات الاتصال.
- [ ] 5. الضغط على "تشغيل الحملة" → يُدخل صفوف في `message_queue` بحالة `queued`.
- [ ] 6. (بدون توكنات WA) — استدعاء يدوي للـ dispatcher:
  ```bash
  curl -X POST https://nor-ai.lovable.app/api/public/cron/dispatch
  ```
  يُتوقع `200` مع `{"error": "WhatsApp not configured"}` لأن التوكنات غير مدخلة.
- [ ] 7. `/settings` → إدخال توكنات Meta الحقيقية (Phone Number ID, Access Token, WABA ID, Verify Token).
- [ ] 8. ربط Meta Webhook URL: `https://nor-ai.lovable.app/api/webhook/whatsapp` بنفس Verify Token.
- [ ] 9. محاكاة رسالة واردة:
  ```bash
  curl -X POST https://nor-ai.lovable.app/api/webhook/whatsapp \
    -H "Content-Type: application/json" \
    -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"966500000000","text":{"body":"اهلا"}}]}}]}]}'
  ```
- [ ] 10. `/conversations` → ظهور المحادثة + رد AI تلقائي.
- [ ] 11. اختبار كلمات opt-out: إرسال "stop" → تغيير الحالة إلى `OPT_OUT` و `dnc=true`.
- [ ] 12. اختبار human takeover: إرسال "human" → ظهور في human_takeover ووقف AI.
- [ ] 13. `/analytics` → ظهور القمع والمخططات.
- [ ] 14. تشغيل pg_cron (راجع `CRON_SETUP.md`) → الإرسال التلقائي ضمن ساعات العمل.
