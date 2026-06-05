import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhook/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const { data } = await supabaseAdmin
          .from("settings")
          .select("value")
          .eq("key", "whatsapp_config")
          .maybeSingle();
        const verifyToken = (data?.value as { verify_token?: string } | null)?.verify_token;

        if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { detectState } = await import("@/lib/ai.functions");
        const { sendWhatsAppMessage } = await import("@/lib/whatsapp.server");
        const { generateText } = await import("ai");
        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");

        const body = await request.json().catch(() => ({}));

        try {
          // Walk Meta webhook envelope
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entries: any[] = body?.entry ?? [];
          for (const entry of entries) {
            for (const change of entry.changes ?? []) {
              const messages = change?.value?.messages ?? [];
              for (const msg of messages) {
                const from = msg.from as string;
                const text: string = msg?.text?.body ?? "";
                if (!from || !text) continue;
                const phone = "+" + from.replace(/^\+/, "");

                // Find or create contact
                let { data: contact } = await supabaseAdmin
                  .from("contacts")
                  .select("id, dnc, status")
                  .eq("phone", phone)
                  .maybeSingle();
                if (!contact) {
                  const { data: created } = await supabaseAdmin
                    .from("contacts")
                    .insert({ phone, status: "replied", source: "webhook" })
                    .select("id, dnc, status")
                    .single();
                  contact = created;
                }
                if (!contact || contact.dnc) continue;

                const state = detectState(text);

                // Save merchant message
                await supabaseAdmin.from("conversations").insert({
                  contact_id: contact.id,
                  role: "merchant",
                  message: text,
                  state,
                });

                // Opt-out
                if (state === "OPT_OUT") {
                  await supabaseAdmin
                    .from("contacts")
                    .update({ status: "opted_out", dnc: true })
                    .eq("id", contact.id);
                  await sendWhatsAppMessage(phone, "تم. لن تصلك أي رسائل بعد الآن. شكراً لك 🌹");
                  continue;
                }

                // Escalation
                if (state === "ESCALATED") {
                  await supabaseAdmin.from("human_takeover").upsert({ contact_id: contact.id });
                  await supabaseAdmin.from("contacts").update({ status: "escalated" }).eq("id", contact.id);
                  continue;
                }

                // Check human takeover
                const { data: takeover } = await supabaseAdmin
                  .from("human_takeover")
                  .select("contact_id")
                  .eq("contact_id", contact.id)
                  .maybeSingle();
                if (takeover) continue;

                // Build history + AI reply
                const { data: history } = await supabaseAdmin
                  .from("conversations")
                  .select("role, message")
                  .eq("contact_id", contact.id)
                  .order("created_at", { ascending: true })
                  .limit(20);

                const { data: promptRow } = await supabaseAdmin
                  .from("settings")
                  .select("value")
                  .eq("key", "system_prompt")
                  .maybeSingle();
                const systemPrompt =
                  (typeof promptRow?.value === "string"
                    ? promptRow.value
                    : "أنت نور، مستشارة مبيعات لمنصة عبايات سعودية.") || "";

                const apiKey = process.env.LOVABLE_API_KEY;
                if (apiKey) {
                  const gateway = createLovableAiGatewayProvider(apiKey);
                  const messagesForAi = (history ?? []).map((h) => ({
                    role: h.role === "merchant" ? ("user" as const) : ("assistant" as const),
                    content: h.message,
                  }));
                  const { text: reply } = await generateText({
                    model: gateway("google/gemini-3-flash-preview"),
                    system: systemPrompt,
                    messages: messagesForAi,
                    maxOutputTokens: 300,
                  });

                  await sendWhatsAppMessage(phone, reply);
                  await supabaseAdmin.from("conversations").insert({
                    contact_id: contact.id,
                    role: "agent",
                    message: reply,
                    state: "AI_REPLY",
                  });
                }

                if (state === "INTERESTED") {
                  await supabaseAdmin.from("contacts").update({ status: "interested" }).eq("id", contact.id);
                }
              }
            }
          }
        } catch (err) {
          console.error("[webhook] error:", err);
        }

        // Always 200 — Meta retries otherwise
        return new Response("ok", { status: 200 });
      },
    },
  },
});
