import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function normalizePhone(p: string): string {
  let c = p.replace(/[\s\-().+]/g, "");
  if (c.startsWith("00")) c = c.slice(2);
  if (c.startsWith("966") && c.length === 12) return "+" + c;
  if (c.startsWith("05") && c.length === 10) return "+966" + c.slice(1);
  if (c.startsWith("5") && c.length === 9) return "+9665" + c.slice(1);
  return "+" + c;
}

function isValidPhone(p: string): boolean {
  return /^\+\d{10,15}$/.test(p);
}

export const importContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      campaignId: z.string().uuid().optional(),
      rows: z.array(
        z.object({
          phone: z.string(),
          name: z.string().optional(),
          store_name: z.string().optional(),
          city: z.string().optional(),
          instagram: z.string().optional(),
          notes: z.string().optional(),
          source: z.string().optional(),
        }),
      ),
    }),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const r of data.rows) {
      const phone = normalizePhone(r.phone ?? "");
      if (!isValidPhone(phone)) {
        skipped++;
        errors.push(`Invalid phone: ${r.phone}`);
        continue;
      }
      const { error } = await sb.from("contacts").upsert(
        {
          phone,
          name: r.name ?? null,
          store_name: r.store_name ?? null,
          city: r.city ?? null,
          instagram: r.instagram ?? null,
          notes: r.notes ?? null,
          source: r.source ?? "import",
        },
        { onConflict: "phone" },
      );
      if (error) {
        skipped++;
        errors.push(error.message);
        continue;
      }
      imported++;
      if (data.campaignId) {
        const { data: c } = await sb.from("contacts").select("id").eq("phone", phone).maybeSingle();
        if (c) {
          await sb.from("campaign_contacts").upsert(
            { campaign_id: data.campaignId, contact_id: c.id },
            { onConflict: "campaign_id,contact_id" },
          );
        }
      }
    }

    if (data.campaignId) {
      const { count } = await sb
        .from("campaign_contacts")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", data.campaignId);
      await sb.from("campaigns").update({ total: count ?? 0 }).eq("id", data.campaignId);
    }

    return { imported, skipped, errors: errors.slice(0, 20) };
  });
