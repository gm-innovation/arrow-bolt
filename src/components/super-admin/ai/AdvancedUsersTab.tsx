import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ShieldCheck, Trash2, Wifi } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useMarinaEnginePing } from "@/hooks/useMarina";

interface AdvancedRow {
  id: string;
  user_id: string;
  note: string | null;
  created_at: string;
}

export function AdvancedUsersTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const ping = useMarinaEnginePing();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["ai-advanced-users"],
    queryFn: async (): Promise<AdvancedRow[]> => {
      const { data, error } = await supabase
        .from("ai_advanced_users")
        .select("id, user_id, note, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdvancedRow[];
    },
  });

  const { data: people } = useQuery({
    queryKey: ["ai-advanced-people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, company_id")
        .order("full_name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const grant = useMutation({
    mutationFn: async (person: any) => {
      const { error } = await supabase.from("ai_advanced_users").insert({
        user_id: person.id,
        company_id: person.company_id,
        granted_by: user?.id ?? null,
        note: person.full_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Acesso avançado liberado" });
      qc.invalidateQueries({ queryKey: ["ai-advanced-users"] });
    },
    onError: (e) => toast({ title: "Não foi possível liberar", description: (e as Error).message, variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_advanced_users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Acesso avançado retirado" });
      qc.invalidateQueries({ queryKey: ["ai-advanced-users"] });
    },
  });

  const granted = new Set((rows ?? []).map((r) => r.user_id));
  const candidates = (people ?? []).filter(
    (p: any) =>
      !granted.has(p.id) &&
      search.trim().length > 1 &&
      `${p.full_name ?? ""} ${p.email ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const nameOf = (userId: string) => (people ?? []).find((p: any) => p.id === userId)?.full_name ?? "Colaborador";

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Motor do Copiloto</h3>
            <p className="text-xs text-muted-foreground">Teste a conexão do motor que atende a tela da Marina.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              ping.mutate(undefined, {
                onSuccess: (r) =>
                  toast({
                    title: r.ok ? "Conexão ok" : "Conexão indisponível",
                    description: r.ok ? `Resposta em ${r.latency_ms} ms` : `Status ${r.status ?? "—"}`,
                    variant: r.ok ? "default" : "destructive",
                  }),
                onError: (e) => toast({ title: "Falha no teste", description: (e as Error).message, variant: "destructive" }),
              })
            }
            disabled={ping.isPending}
          >
            <Wifi className="mr-1 h-3 w-3" /> Testar conexão
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-1 text-sm font-semibold">Usuários avançados de IA</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Quem tem essa liberação pode criar habilidades, cadastrar conexões e pedir execuções mais poderosas à Marina.
        </p>

        <div className="mb-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar colaborador por nome ou e-mail" />
          {candidates.length > 0 && (
            <div className="mt-2 space-y-1 rounded-md border border-border p-2">
              {candidates.slice(0, 8).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {p.full_name} <span className="text-xs text-muted-foreground">{p.email}</span>
                  </span>
                  <Button size="sm" variant="outline" onClick={() => grant.mutate(p)} disabled={grant.isPending}>
                    <Plus className="mr-1 h-3 w-3" /> Liberar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {isLoading && <Skeleton className="h-20 w-full" />}
        <div className="space-y-2">
          {(rows ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
              <span className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" /> {r.note || nameOf(r.user_id)}
                <Badge variant="secondary" className="text-[10px]">avançado</Badge>
              </span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => revoke.mutate(r.id)} aria-label="Retirar acesso">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {!isLoading && (rows ?? []).length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nenhum usuário avançado ainda — super admins já têm esse acesso por padrão.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
