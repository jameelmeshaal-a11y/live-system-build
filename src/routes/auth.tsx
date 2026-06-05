import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — نور AI" },
      { name: "description", content: "ادخل إلى لوحة تحكم نور AI" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function afterAuth() {
    try {
      // Claim admin role if no admin exists yet, otherwise assign 'agent'
      // @ts-expect-error rpc name not yet in generated types
      await supabase.rpc("claim_admin_if_first");
    } catch (e) {
      console.warn("claim_admin_if_first failed:", e);
    }
    navigate({ to: "/dashboard" });
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("مرحباً بعودتك");
    await afterAuth();
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء الحساب");
    await afterAuth();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-[#1a0f2e] to-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-[var(--shadow-glow)] mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gold to-primary-glow bg-clip-text text-transparent">
            نور AI
          </h1>
          <p className="text-sm text-muted-foreground mt-2">منصة استحواذ تجار العبايات</p>
        </div>

        <Card className="border-border/50 backdrop-blur">
          <CardHeader>
            <CardTitle>مرحباً</CardTitle>
            <CardDescription>سجّل دخولك أو أنشئ حساباً جديداً</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور</Label>
                    <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="ltr" />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow">
                    {loading ? "جاري..." : "تسجيل الدخول"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email2">البريد الإلكتروني</Label>
                    <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password2">كلمة المرور</Label>
                    <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="ltr" />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow">
                    {loading ? "جاري..." : "إنشاء حساب"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    أول مستخدم يصبح مديراً تلقائياً
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
