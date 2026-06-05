import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

const DEFAULT_PROMPT =
  "أنت نور، مستشارة مبيعات دافئة لمنصة عبايات سعودية. تحدثي بلهجة خليجية ودودة، اطرحي أسئلة قصيرة، استمعي أكثر، ولا تضغطي.";

const OPT_OUT_KEYWORDS = ["stop", "إلغاء", "لا تراسلني", "unsubscribe", "ايقاف", "إيقاف", "توقف"];
const ESCALATE_KEYWORDS = ["human", "agent", "بشري", "موظف", "ممثل"];
const POSITIVE_KEYWORDS = ["مهتم", "نعم", "اوكي", "أوكي", "yes", "interested", "تمام", "موافق"];

export function detectState(text: string): string {
  const lower = text.toLowerCase().trim();
  if (OPT_OUT_KEYWORDS.some((k) => lower.includes(k))) return "OPT_OUT";
  if (ESCALATE_KEYWORDS.some((k) => lower.includes(k))) return "ESCALATED";
  if (POSITIVE_KEYWORDS.some((k) => lower.includes(k))) return "INTERESTED";
  return "ENGAGED";
}

export type AIMessage = { role: "user" | "assistant"; content: string };

export const generateAIReply = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
      merchantMessage: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "system_prompt")
      .maybeSingle();
    const systemPrompt = (typeof row?.value === "string" ? row.value : DEFAULT_PROMPT) || DEFAULT_PROMPT;

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const { text } = await generateText({
      model,
      system: systemPrompt,
      messages: [
        ...data.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: data.merchantMessage },
      ],
      maxOutputTokens: 300,
    });

    return { reply: text, state: detectState(data.merchantMessage) };
  });
