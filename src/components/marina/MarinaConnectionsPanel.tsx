import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plug, Plus, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Connector {
  id: string;
  name: string;
  label: string;
  kind: string;
  base_url: string;
  description: string | null;
  secret_name: string | null;
  is_active: boolean;
}

export function MarinaConnectionsPanel() {
  const { profile } = useAuth() as any;
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ label: "", base_url: "", description: "", secret_name: "" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["marina-connectors"],
    queryFn: async (): Promise<Connector[]> => {
      const { data, error } = await supabase
        .from("ai_external_connectors")
        .select("id, name, label, kind, base_url, description, secret_name, is_active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Connector[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const slug = form.label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const { error } = await supabase.from("ai_external_connectors").insert({
        company_id: profile?.company_id,
        name: slug || "conexao",
        label: form.label,
        kind: "rest",
        base_url: form.base_url,
        description: form.description || null,
        secret_name: form.secret_name || null,
        auth_scheme: form.secret_name ? "bearer" : "none",
        actions: [],
        allowed_roles: ["super_admin", "director"],
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Conexão cadastrada" });
      setCreating(false);
      setForm({ label: "", base_url: "", description: "", secret_name: "" });
      qc.invalidateQueries({ queryKey: ["marina-connectors"] });
    },
    onError: (e) => toast({ title: "Não foi possível cadastrar", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Conexões externas</h3>
            <p className="text-xs text-muted-foreground">
              Serviços que a Marina pode usar. Credenciais ficam guardadas nos segredos do backend — nunca aqui.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreating((v) => !v)}>
            <Plus className="mr-1 h-3 w-3" /> Nova conexão
          </Button>
        </div>

        {creating && (
          <div className="mb-4 grid gap-3 rounded-lg border border-border p-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex.: Mailchimp" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Endereço base</label>
              <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.exemplo.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome do segredo (opcional)</label>
              <Input value={form.secret_name} onChange={(e) => setForm({ ...form, secret_name: e.target.value })} placeholder="MAILCHIMP_API_KEY" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Para que serve</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => create.mutate()} disabled={!form.label || !form.base_url || create.isPending}>
                <Save className="mr-1 h-4 w-4" /> Salvar conexão
              </Button>
            </div>
          </div>
        )}

        {isLoading && <Skeleton className="h-20 w-full" />}
        {error && <p className="text-xs text-destructive">Você não tem acesso às conexões desta empresa.</p>}
        <div className="space-y-2">
          {(data ?? []).map((c) => (
            <div key={c.id} className="flex items-start gap-3 rounded-md border border-border p-3">
              <Plug className="mt-0.5 h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {c.label} {!c.is_active && <Badge variant="outline" className="ml-1 text-[10px]">inativa</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">{c.base_url}</p>
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              </div>
              {c.secret_name && <Badge variant="secondary" className="text-[10px]">credencial protegida</Badge>}
            </div>
          ))}
          {!isLoading && (data ?? []).length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma conexão cadastrada ainda.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
