import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ campaignId: z.string().uuid(), templateName: z.string().optional() }))
  .handler(async ({ data, context }) => {
    try {
      const sb = context.supabase;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: links, error: linkErr } = await sb
        .from("campaign_contacts")
        .select("contact_id, contacts!inner(id, phone, dnc, status)")
        .eq("campaign_id", data.campaignId);

      if (linkErr) return { ok: false as const, queued: 0, error: linkErr.message };
      if (!links?.length) return { ok: false as const, queued: 0, error: "لا توجد جهات اتصال مرتبطة بالحملة" };

      let offset = 0;
      let queued = 0;
      for (const link of links) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c: any = link.contacts;
        if (!c || c.dnc || c.status === "opted_out") continue;
        const scheduled = new Date(Date.now() + offset * 1000).toISOString();
        const { error } = await supabaseAdmin.from("message_queue").insert({
          contact_id: c.id,
          campaign_id: data.campaignId,
          template_name: data.templateName ?? null,
          payload: { type: "template_intro" },
          scheduled_for: scheduled,
          status: "queued",
        });
        if (!error) {
          queued++;
          offset += 60 + Math.floor(Math.random() * 30);
        }
      }

      await sb.from("campaigns").update({ status: "running" }).eq("id", data.campaignId);

      return { ok: true as const, queued };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false as const, queued: 0, error: message };
    }
  });

export const pauseCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ campaignId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await context.supabase.from("campaigns").update({ status: "paused" }).eq("id", data.campaignId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("message_queue")
      .update({ status: "cancelled" })
      .eq("campaign_id", data.campaignId)
      .eq("status", "queued");
    return { ok: true };
  });
