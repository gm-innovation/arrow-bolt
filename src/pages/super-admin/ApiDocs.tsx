import { useState, useEffect } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Copy, Trash2, Plus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ALL_SCOPES = [
  { id: "leads:write", label: "Criar leads e clientes" },
  { id: "opportunities:write", label: "Criar oportunidades (RFQ)" },
  { id: "catalog:read", label: "Ler catálogo de produtos/serviços" },
  { id: "crm:read", label: "Ler CRM (oportunidades, clientes)" },
  { id: "sales:read", label: "Ler vendas" },
];

interface Company { id: string; name: string }

interface Integration {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  scopes: string[];
  status: string;
  last_used_at: string | null;
  created_at: string;
}

interface LogRow {
  id: string;
  method: string;
  path: string;
  status: number;
  latency_ms: number | null;
  ip: string | null;
  created_at: string;
  error_message: string | null;
}

function NewKeyDialog({ companies, onCreated }: { companies: Company[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scopes, setScopes] = useState<string[]>(["leads:write", "opportunities:write", "catalog:read"]);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCompanyId(""); setName(""); setDescription("");
    setScopes(["leads:write", "opportunities:write", "catalog:read"]);
    setGeneratedKey(null);
  };

  const submit = async () => {
    if (!companyId) { toast.error("Selecione a empresa."); return; }
    if (!name.trim() || scopes.length === 0) {
      toast.error("Informe um nome e pelo menos um escopo.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("api-keys-manage", {
      method: "POST",
      body: { company_id: companyId, name, description, scopes },
    });
    setLoading(false);
    if (error || !data?.api_key) {
      toast.error(`Erro ao criar chave: ${error?.message ?? "tente novamente"}`);
      return;
    }
    setGeneratedKey(data.api_key);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" />Nova integração</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{generatedKey ? "Chave gerada" : "Nova API key"}</DialogTitle>
          <DialogDescription>
            {generatedKey ? "Copie agora — não será exibida novamente." : "Defina o nome e os escopos."}
          </DialogDescription>
        </DialogHeader>

        {!generatedKey ? (
          <div className="space-y-3">
            <div>
              <Label>Empresa</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Site institucional" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Escopos</Label>
              <div className="space-y-2 mt-2">
                {ALL_SCOPES.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      id={s.id}
                      checked={scopes.includes(s.id)}
                      onCheckedChange={(c) =>
                        setScopes((prev) => (c ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                      }
                    />
                    <label htmlFor={s.id} className="text-sm cursor-pointer">
                      <code className="text-xs bg-muted px-1 rounded">{s.id}</code> — {s.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs">Esta chave será mostrada apenas uma vez. Guarde-a em local seguro.</p>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={generatedKey} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success("Copiada!"); }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {!generatedKey ? (
            <Button onClick={submit} disabled={loading}>{loading ? "Gerando..." : "Gerar chave"}</Button>
          ) : (
            <Button onClick={() => setOpen(false)}>Concluído</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IntegrationsTab() {
  const [items, setItems] = useState<Integration[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filterCompany, setFilterCompany] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [logsFor, setLogsFor] = useState<Integration | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: integ, error }, { data: comp }] = await Promise.all([
      supabase.from("api_integrations").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
    ]);
    if (error) toast.error(error.message);
    setItems(integ ?? []);
    setCompanies(comp ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";
  const visible = filterCompany ? items.filter((i) => i.company_id === filterCompany) : items;

  const revoke = async (id: string) => {
    if (!confirm("Revogar esta chave? Não poderá ser usada novamente.")) return;
    const { error } = await supabase.functions.invoke(`api-keys-manage/${id}`, { method: "DELETE" });
    if (error) { toast.error(error.message); return; }
    toast.success("Chave revogada");
    load();
  };

  const showLogs = async (integ: Integration) => {
    setLogsFor(integ);
    const { data } = await supabase
      .from("api_request_logs")
      .select("id, method, path, status, latency_ms, ip, created_at, error_message")
      .eq("integration_id", integ.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs(data ?? []);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">API keys</h2>
          <p className="text-sm text-muted-foreground">Gerencie integrações que consomem a API pública.</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
          >
            <option value="">Todas as empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <NewKeyDialog companies={companies} onCreated={load} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Prefixo</TableHead>
                <TableHead>Escopos</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : visible.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma integração ainda.</TableCell></TableRow>
              ) : visible.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm">{companyName(i.company_id)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{i.name}</div>
                    {i.description && <div className="text-xs text-muted-foreground">{i.description}</div>}
                  </TableCell>
                  <TableCell><code className="text-xs">{i.key_prefix}…</code></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {i.scopes.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {i.last_used_at ? format(new Date(i.last_used_at), "dd/MM HH:mm", { locale: ptBR }) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={i.status === "active" ? "default" : "outline"}>{i.status === "active" ? "Ativa" : "Revogada"}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => showLogs(i)}>Logs</Button>
                    {i.status === "active" && (
                      <Button variant="ghost" size="icon" onClick={() => revoke(i.id)}><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!logsFor} onOpenChange={(v) => !v && setLogsFor(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Logs — {logsFor?.name}</DialogTitle>
            <DialogDescription>Últimas 100 chamadas.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Caminho</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem chamadas.</TableCell></TableRow>
                ) : logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{format(new Date(l.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}</TableCell>
                    <TableCell><code className="text-xs">{l.method}</code></TableCell>
                    <TableCell className="text-xs font-mono">{l.path}</TableCell>
                    <TableCell>
                      <Badge variant={l.status < 400 ? "default" : "destructive"}>{l.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{l.latency_ms ?? "—"}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ApiDocs() {
  const { profile } = useAuth();
  const [tab, setTab] = useState("docs");

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">API & Integrações</h1>
        <p className="text-muted-foreground">Documentação e gestão das chaves de acesso à API do Arrow.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="docs">Documentação</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
        </TabsList>
        <TabsContent value="docs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Referência da API (OpenAPI 3.1)</CardTitle>
              <CardDescription>
                Use o "Authorize" e cole sua API key no formato <code>ark_live_...</code> para testar requisições.
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-white">
              <SwaggerUI url="/api/openapi.yaml" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="integrations" className="mt-4">
          <IntegrationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
