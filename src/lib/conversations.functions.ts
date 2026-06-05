import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendManualMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ contactId: z.string().uuid(), message: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: contact } = await sb.from("contacts").select("phone").eq("id", data.contactId).maybeSingle();
    if (!contact) throw new Error("جهة الاتصال غير موجودة");

    const { sendWhatsAppMessage } = await import("@/lib/whatsapp.server");
    await sendWhatsAppMessage(contact.phone, data.message);

    await sb.from("conversations").insert({
      contact_id: data.contactId,
      role: "agent",
      message: data.message,
      state: "MANUAL",
    });

    return { ok: true };
  });
