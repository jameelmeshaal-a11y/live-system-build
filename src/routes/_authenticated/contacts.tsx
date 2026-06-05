import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Upload, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { importContacts } from "@/lib/contacts.functions";

export const Route = createFileRoute("/_authenticated/contacts")({
  ssr: false,
  component: ContactsPage,
});

function ContactsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const importFn = useServerFn(importContacts);

  const { data: contacts } = useQuery({
    queryKey: ["contacts", search],
    queryFn: async () => {
      let q = supabase.from("contacts").select("*").order("created_at", { ascending: false }).limit(200);
      if (search) {
        q = q.or(`phone.ilike.%${search}%,name.ilike.%${search}%,store_name.ilike.%${search}%,city.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as Array<Record<string, unknown>>;
      const mapped = rows.map((r) => ({
        phone: String(r.phone ?? r.Phone ?? r["رقم"] ?? r["الهاتف"] ?? ""),
        name: r.name ? String(r.name) : undefined,
        store_name: r.store_name ? String(r.store_name) : undefined,
        city: r.city ? String(r.city) : undefined,
        instagram: r.instagram ? String(r.instagram) : undefined,
        notes: r.notes ? String(r.notes) : undefined,
        source: r.source ? String(r.source) : "excel",
      }));
      const res = await importFn({ data: { rows: mapped } });
      toast.success(`تم استيراد ${res.imported}، وتجاهل ${res.skipped}`);
      qc.invalidateQueries({ queryKey: ["contacts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الاستيراد");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">جهات الاتصال</h1>
          <p className="text-muted-foreground mt-1">إجمالي: {contacts?.length ?? 0}</p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="w-4 h-4 ml-2" />
          {uploading ? "جاري..." : "رفع Excel"}
        </Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFile} />
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="ابحث برقم، اسم، متجر، مدينة..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الهاتف</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>المتجر</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="ltr font-mono text-xs">{c.phone}</TableCell>
                  <TableCell>{c.name ?? "—"}</TableCell>
                  <TableCell>{c.store_name ?? "—"}</TableCell>
                  <TableCell>{c.city ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "converted" ? "default" : "secondary"}>{c.status}</Badge>
                    {c.dnc && <Badge variant="destructive" className="mr-1">DNC</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
