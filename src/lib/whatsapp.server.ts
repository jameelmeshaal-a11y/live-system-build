// Server-only WhatsApp helpers. Supports 3 providers selectable from settings:
//   - meta     → Meta Cloud API (official, supports test number with 5 free recipients)
//   - unifonic → Unifonic REST (Saudi provider, sandbox available)
//   - manual   → wa.me click-to-chat link (used with WAWCD browser extension)
//
// Tokens are stored in the `settings` table under key `whatsapp_config`.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type WAProvider = "meta" | "unifonic" | "manual";

export interface WAConfig {
  provider: WAProvider;
  // Meta
  phone_number_id?: string;
  access_token?: string;
  waba_id?: string;
  verify_token?: string;
  api_version?: string;
  // Unifonic
  unifonic_app_sid?: string;
  unifonic_sender_id?: string;
}

export type WAMediaType = "text" | "image" | "video" | "document";

export async function getWAConfig(): Promise<WAConfig | null> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "whatsapp_config")
    .maybeSingle();
  if (error || !data) return null;
  const v = (data.value as Partial<WAConfig>) ?? {};
  return {
    provider: (v.provider as WAProvider) ?? "meta",
    phone_number_id: v.phone_number_id,
    access_token: v.access_token,
    waba_id: v.waba_id,
    verify_token: v.verify_token,
    api_version: v.api_version ?? "v20.0",
    unifonic_app_sid: v.unifonic_app_sid,
    unifonic_sender_id: v.unifonic_sender_id,
  };
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/[^\d+]/g, "");
  p = p.replace(/^\+/, "");
  if (p.startsWith("05")) p = "966" + p.slice(1);
  if (p.startsWith("5") && p.length === 9) p = "966" + p;
  return p;
}

// ─── Meta Cloud API ──────────────────────────────────────────────────────────

async function metaSend(cfg: WAConfig, payload: Record<string, unknown>): Promise<void> {
  if (!cfg.phone_number_id || !cfg.access_token) {
    throw new Error("Meta: phone_number_id و access_token مطلوبان (راجع الإعدادات)");
  }
  const url = `https://graph.facebook.com/${cfg.api_version}/${cfg.phone_number_id}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta send failed (${res.status}): ${err}`);
  }
}

// ─── Unifonic ────────────────────────────────────────────────────────────────

async function unifonicSendText(cfg: WAConfig, phone: string, message: string): Promise<void> {
  if (!cfg.unifonic_app_sid) {
    throw new Error("Unifonic: AppSid مطلوب");
  }
  // Unifonic WhatsApp endpoint
  const url = "https://el.cloud.unifonic.com/rest/WhatsApp/messages";
  const body = new URLSearchParams({
    AppSid: cfg.unifonic_app_sid,
    Recipient: phone,
    Body: message,
    SenderID: cfg.unifonic_sender_id ?? "",
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Unifonic send failed (${res.status}): ${err}`);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const cfg = await getWAConfig();
  const to = normalizePhone(phone);
  if (!cfg) {
    console.warn(`[wa:stub] would send to ${to}: ${message.slice(0, 80)}`);
    return;
  }
  if (cfg.provider === "manual") {
    console.warn(`[wa:manual] click-to-chat: https://wa.me/${to}?text=${encodeURIComponent(message)}`);
    return;
  }
  if (cfg.provider === "unifonic") {
    return unifonicSendText(cfg, to, message);
  }
  return metaSend(cfg, { to, type: "text", text: { body: message } });
}

export async function sendWhatsAppMedia(
  phone: string,
  type: Exclude<WAMediaType, "text">,
  mediaUrl: string,
  caption?: string,
): Promise<void> {
  const cfg = await getWAConfig();
  const to = normalizePhone(phone);
  if (!cfg || cfg.provider === "manual") {
    console.warn(`[wa:stub/manual] media ${type} to ${to}: ${mediaUrl}`);
    return;
  }
  if (cfg.provider === "unifonic") {
    // Unifonic WhatsApp media support varies; fallback to caption-as-text for sandbox.
    return unifonicSendText(cfg, to, `${caption ?? ""}\n${mediaUrl}`);
  }
  const mediaObj: Record<string, unknown> = { link: mediaUrl };
  if (caption && (type === "image" || type === "video" || type === "document")) {
    mediaObj.caption = caption;
  }
  return metaSend(cfg, { to, type, [type]: mediaObj });
}

export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  language = "ar",
  components: unknown[] = [],
): Promise<void> {
  const cfg = await getWAConfig();
  const to = normalizePhone(phone);
  if (!cfg || cfg.provider !== "meta") {
    console.warn(`[wa:stub] template ${templateName} to ${to}`);
    return;
  }
  return metaSend(cfg, {
    to,
    type: "template",
    template: { name: templateName, language: { code: language }, components },
  });
}

export function manualChatLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}
