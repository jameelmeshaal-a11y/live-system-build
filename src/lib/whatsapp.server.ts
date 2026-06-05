// Server-only WhatsApp Cloud API helpers. Reads tokens from the settings table
// so they can be edited from the UI. Falls back to "stub mode" (log + skip)
// when tokens are missing — useful for development.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface WAConfig {
  phone_number_id: string;
  access_token: string;
  waba_id: string;
  verify_token: string;
  api_version: string;
}

export async function getWAConfig(): Promise<WAConfig | null> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "whatsapp_config")
    .maybeSingle();
  if (error || !data) return null;
  const v = data.value as Partial<WAConfig>;
  if (!v.phone_number_id || !v.access_token) return null;
  return {
    phone_number_id: v.phone_number_id,
    access_token: v.access_token,
    waba_id: v.waba_id ?? "",
    verify_token: v.verify_token ?? "",
    api_version: v.api_version ?? "v20.0",
  };
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const cfg = await getWAConfig();
  if (!cfg) {
    console.warn(`[wa:stub] would send to ${phone}: ${message.slice(0, 80)}`);
    return;
  }
  const url = `https://graph.facebook.com/${cfg.api_version}/${cfg.phone_number_id}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.replace(/^\+/, ""),
      type: "text",
      text: { body: message },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WA send failed (${res.status}): ${err}`);
  }
}

export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  language = "ar",
  components: unknown[] = [],
): Promise<void> {
  const cfg = await getWAConfig();
  if (!cfg) {
    console.warn(`[wa:stub] would send template ${templateName} to ${phone}`);
    return;
  }
  const url = `https://graph.facebook.com/${cfg.api_version}/${cfg.phone_number_id}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.replace(/^\+/, ""),
      type: "template",
      template: { name: templateName, language: { code: language }, components },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WA template failed (${res.status}): ${err}`);
  }
}
