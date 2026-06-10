import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  phone: z.string().min(7),
  type: z.enum(["text", "image", "video", "document"]),
  message: z.string().optional(),
  mediaUrl: z.string().url().optional(),
});

export const sendTestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const { sendWhatsAppMessage, sendWhatsAppMedia, getWAConfig, manualChatLink } = await import(
      "@/lib/whatsapp.server"
    );
    const cfg = await getWAConfig();
    const provider = cfg?.provider ?? "meta";

    // Manual provider returns a click-to-chat link instead of sending
    if (provider === "manual") {
      return {
        ok: true,
        provider,
        manualLink: manualChatLink(data.phone, data.message ?? data.mediaUrl ?? ""),
      };
    }

    try {
      if (data.type === "text") {
        if (!data.message) throw new Error("النص مطلوب");
        await sendWhatsAppMessage(data.phone, data.message);
      } else {
        if (!data.mediaUrl) throw new Error("رابط الوسائط مطلوب");
        await sendWhatsAppMedia(data.phone, data.type, data.mediaUrl, data.message);
      }
      return { ok: true, provider };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, provider, error: msg };
    }
  });
