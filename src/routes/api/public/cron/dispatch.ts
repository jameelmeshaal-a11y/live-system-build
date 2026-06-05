import { createFileRoute } from "@tanstack/react-router";

// Called every minute by pg_cron. Honors sending hours + warm-up daily limit.
export const Route = createFileRoute("/api/public/cron/dispatch")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendWhatsAppMessage, sendWhatsAppTemplate } = await import("@/lib/whatsapp.server");

        const { data: schedRow } = await supabaseAdmin
          .from("settings")
          .select("value")
          .eq("key", "sending_schedule")
          .maybeSingle();
        const { data: warmRow } = await supabaseAdmin
          .from("settings")
          .select("value")
          .eq("key", "warm_up")
          .maybeSingle();

        const sched = (schedRow?.value as { start_hour: number; end_hour: number }) ?? {
          start_hour: 9,
          end_hour: 21,
        };
        const warm = (warmRow?.value as { daily_limit: number }) ?? { daily_limit: 50 };

        const nowRiyadh = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
        const hour = nowRiyadh.getHours();
        if (hour < sched.start_hour || hour >= sched.end_hour) {
          return Response.json({ skipped: "outside_hours", hour });
        }

        const todayStart = new Date(nowRiyadh);
        todayStart.setHours(0, 0, 0, 0);
        const { count: sentToday } = await supabaseAdmin
          .from("message_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "sent")
          .gte("created_at", todayStart.toISOString());

        if ((sentToday ?? 0) >= warm.daily_limit) {
          return Response.json({ skipped: "daily_limit_reached", sentToday });
        }

        const { data: job } = await supabaseAdmin
          .from("message_queue")
          .select("*, contacts(id, phone, name, dnc)")
          .eq("status", "queued")
          .lte("scheduled_for", new Date().toISOString())
          .order("scheduled_for", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!job) return Response.json({ skipped: "no_jobs" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contact: any = job.contacts;
        if (!contact || contact.dnc) {
          await supabaseAdmin.from("message_queue").update({ status: "cancelled" }).eq("id", job.id);
          return Response.json({ skipped: "dnc_or_missing" });
        }

        await supabaseAdmin
          .from("message_queue")
          .update({ status: "sending", attempts: (job.attempts ?? 0) + 1 })
          .eq("id", job.id);

        try {
          if (job.template_name) {
            await sendWhatsAppTemplate(contact.phone, job.template_name, "ar", []);
          } else {
            const intro = `مرحباً ${contact.name ?? ""} 🌹 أنا نور من منصة العبايات. أتواصل معك بخصوص فرصة ربحية مميزة لمتجرك.`;
            await sendWhatsAppMessage(contact.phone, intro);
          }
          await supabaseAdmin.from("message_queue").update({ status: "sent" }).eq("id", job.id);
          await supabaseAdmin.from("contacts").update({ status: "sent" }).eq("id", contact.id);
          await supabaseAdmin.from("conversations").insert({
            contact_id: contact.id,
            campaign_id: job.campaign_id,
            role: "agent",
            message: job.template_name ? `[template:${job.template_name}]` : "intro",
            state: "SENT",
          });
          if (job.campaign_id) {
            // increment sent counter
            const { data: camp } = await supabaseAdmin
              .from("campaigns")
              .select("sent")
              .eq("id", job.campaign_id)
              .maybeSingle();
            if (camp) {
              await supabaseAdmin
                .from("campaigns")
                .update({ sent: (camp.sent ?? 0) + 1 })
                .eq("id", job.campaign_id);
            }
          }
          return Response.json({ sent: contact.phone });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await supabaseAdmin
            .from("message_queue")
            .update({ status: "failed", last_error: msg })
            .eq("id", job.id);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
