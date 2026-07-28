import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AIAgent } from "@/hooks/useAIAgents";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Upload, RefreshCw, FileText, Plus, Globe, Users, Layers, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useMemo } from "react";

interface Props { agent: AIAgent; }

// =========================================================
// Escopo — vocabulário compartilhado
// =========================================================
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "director", label: "Diretor" },
  { value: "coordinator", label: "Coordenador / Admin" },
  { value: "technician", label: "Técnico" },
  { value: "hr", label: "RH" },
  { value: "commercial", label: "Comercial" },
  { value: "financeiro", label: "Financeiro" },
  { value: "qualidade", label: "Qualidade" },
  { value: "compras", label: "Compras" },
  { value: "marketing", label: "Marketing" },
];

const MODULE_OPTIONS: { value: string; label: string }[] = [
  { value: "operations", label: "Operações (OS/Escalas)" },
  { value: "hr", label: "RH / DP" },
  { value: "quality", label: "Qualidade (SGQ)" },
  { value: "crm", label: "CRM / Comercial" },
  { value: "finance", label: "Financeiro" },
  { value: "supplies", label: "Suprimentos" },
  { value: "corp", label: "Corporativo" },
  { value: "pm", label: "PM / Roadmap" },
  { value: "ai", label: "IA / Marina" },
];

type ScopeValue = { roles: string[]; modules: string[] };
type ScopeMode = "global" | "roles" | "modules" | "both";

function scopeFromRow(row: { scope?: any; tags?: string[] | null }): ScopeValue {
  const scope = row?.scope ?? {};
  const fromScope = {
    roles: Array.isArray(scope.roles) ? scope.roles.filter(Boolean) : [],
    modules: Array.isArray(scope.modules) ? scope.modules.filter(Boolean) : [],
  };
  if (fromScope.roles.length || fromScope.modules.length) return fromScope;
  // Fallback: derivar de tags (para exemplos few-shot que só têm tags[])
  const tags = Array.isArray(row?.tags) ? row.tags : [];
  return {
    roles: tags.filter((t: string) => t.startsWith("role:")).map((t: string) => t.slice(5)),
    modules: tags.filter((t: string) => t.startsWith("module:")).map((t: string) => t.slice(7)),
  };
}

function scopeToTags(s: ScopeValue): string[] {
  return [...s.roles.map(r => `role:${r}`), ...s.modules.map(m => `module:${m}`)];
}

function scopeLabel(s: ScopeValue) {
  if (!s.roles.length && !s.modules.length) return { icon: Globe, text: "Global", tone: "default" as const };
  const parts: string[] = [];
  if (s.roles.length) parts.push(`Papéis: ${s.roles.map(r => ROLE_OPTIONS.find(o => o.value === r)?.label ?? r).join(", ")}`);
  if (s.modules.length) parts.push(`Módulos: ${s.modules.map(m => MODULE_OPTIONS.find(o => o.value === m)?.label ?? m).join(", ")}`);
  return { icon: s.roles.length ? Users : Layers, text: parts.join(" • "), tone: "secondary" as const };
}

function ScopeChip({ value }: { value: ScopeValue }) {
  const { icon: Icon, text, tone } = scopeLabel(value);
  return (
    <Badge variant={tone === "default" ? "outline" : "secondary"} className="gap-1 text-xs font-normal">
      <Icon className="h-3 w-3" /> {text}
    </Badge>
  );
}

// Editor de escopo — usado no formulário e no popover de edição inline
function ScopeEditor({ value, onChange }: { value: ScopeValue; onChange: (v: ScopeValue) => void }) {
  const initialMode: ScopeMode = (() => {
    const r = value.roles.length > 0;
    const m = value.modules.length > 0;
    if (r && m) return "both";
    if (r) return "roles";
    if (m) return "modules";
    return "global";
  })();
  const [mode, setMode] = useState<ScopeMode>(initialMode);

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter(x => x !== v) : [...list, v];

  return (
    <div className="space-y-3">
      <RadioGroup
        value={mode}
        onValueChange={(m: ScopeMode) => {
          setMode(m);
          if (m === "global") onChange({ roles: [], modules: [] });
          else if (m === "roles") onChange({ roles: value.roles, modules: [] });
          else if (m === "modules") onChange({ roles: [], modules: value.modules });
          else onChange({ roles: value.roles, modules: value.modules });
        }}
        className="grid grid-cols-2 md:grid-cols-4 gap-2"
      >
        <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer text-sm">
          <RadioGroupItem value="global" /> <Globe className="h-3.5 w-3.5" /> Global
        </label>
        <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer text-sm">
          <RadioGroupItem value="roles" /> <Users className="h-3.5 w-3.5" /> Por papel
        </label>
        <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer text-sm">
          <RadioGroupItem value="modules" /> <Layers className="h-3.5 w-3.5" /> Por módulo
        </label>
        <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer text-sm">
          <RadioGroupItem value="both" /> Papel + Módulo
        </label>
      </RadioGroup>

      {(mode === "roles" || mode === "both") && (
        <div>
          <Label className="text-xs text-muted-foreground">Papéis autorizados</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ROLE_OPTIONS.map(r => (
              <Badge
                key={r.value}
                variant={value.roles.includes(r.value) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => onChange({ ...value, roles: toggle(value.roles, r.value) })}
              >
                {r.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {(mode === "modules" || mode === "both") && (
        <div>
          <Label className="text-xs text-muted-foreground">Módulos onde este conteúdo se aplica</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {MODULE_OPTIONS.map(m => (
              <Badge
                key={m.value}
                variant={value.modules.includes(m.value) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => onChange({ ...value, modules: toggle(value.modules, m.value) })}
              >
                {m.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {mode === "global" && "Todos os usuários poderão receber este conteúdo em respostas."}
        {mode === "roles" && "Apenas usuários com um dos papéis marcados verão este conteúdo."}
        {mode === "modules" && "Apenas quando o usuário estiver navegando em rotas do módulo selecionado."}
        {mode === "both" && "O usuário precisa ter um dos papéis E estar em um dos módulos."}
      </p>
    </div>
  );
}


function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: any }> = {
    pending: { label: "Pendente", variant: "outline" },
    processing: { label: "Processando", variant: "secondary" },
    indexed: { label: "Indexado", variant: "default" },
    error: { label: "Erro", variant: "destructive" },
  };
  const c = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function TrainingTab({ agent }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [manualText, setManualText] = useState("");
  const [exQ, setExQ] = useState("");
  const [exA, setExA] = useState("");
  const [scope, setScope] = useState<ScopeValue>({ roles: [], modules: [] });
  const [exScope, setExScope] = useState<ScopeValue>({ roles: [], modules: [] });
  const [filter, setFilter] = useState<string>("all");

  // company_id do usuário logado — usado quando o agente é global (company_id null)
  const myCompany = useQuery({
    queryKey: ["my-company-id"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return null;
      const { data } = await supabase.from("profiles").select("company_id").eq("id", uid).maybeSingle();
      return (data as any)?.company_id ?? null;
    },
  });
  const resolvedCompanyId = () => agent.company_id ?? myCompany.data ?? null;


  // ===== Sources =====
  const sources = useQuery({
    queryKey: ["ai-knowledge-sources", agent.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_knowledge_sources" as any)
        .select("*")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const path = `${agent.company_id ?? "global"}/${agent.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("ai-knowledge").upload(path, file);
      if (upErr) throw upErr;
      const sourceType = file.name.toLowerCase().endsWith(".pdf") ? "pdf"
        : file.name.toLowerCase().endsWith(".docx") ? "docx" : "txt";
      const { data, error } = await supabase.from("ai_knowledge_sources" as any).insert({
        agent_id: agent.id,
        company_id: resolvedCompanyId(),
        source_type: sourceType,
        title: title || file.name,
        storage_path: path,
        status: "pending",
        scope: scope as any,
        tags: scopeToTags(scope),
      }).select().maybeSingle();
      if (error) throw error;
      await supabase.functions.invoke("ingest-knowledge", { body: { source_id: (data as any).id } }).catch(() => {});
      return data;
    },
    onSuccess: () => {
      toast.success("Arquivo enviado — processamento em background");
      setTitle("");
      setScope({ roles: [], modules: [] });
      qc.invalidateQueries({ queryKey: ["ai-knowledge-sources", agent.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha no upload"),
  });

  const addManual = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("ai_knowledge_sources" as any).insert({
        agent_id: agent.id,
        company_id: resolvedCompanyId(),
        source_type: "manual",
        title: title || "Texto manual",
        raw_text: manualText,
        status: "pending",
        scope: scope as any,
        tags: scopeToTags(scope),
      }).select().maybeSingle();
      if (error) throw error;
      await supabase.functions.invoke("ingest-knowledge", { body: { source_id: (data as any).id } }).catch(() => {});
      return data;
    },
    onSuccess: () => {
      toast.success("Texto adicionado");
      setTitle(""); setManualText(""); setScope({ roles: [], modules: [] });
      qc.invalidateQueries({ queryKey: ["ai-knowledge-sources", agent.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateSourceScope = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: ScopeValue }) => {
      const { error } = await supabase.from("ai_knowledge_sources" as any)
        .update({ scope: next as any, tags: scopeToTags(next) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escopo atualizado");
      qc.invalidateQueries({ queryKey: ["ai-knowledge-sources", agent.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_knowledge_sources" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["ai-knowledge-sources", agent.id] });
    },
  });

  const reprocess = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("ai_knowledge_sources" as any).update({ status: "pending" }).eq("id", id);
      await supabase.functions.invoke("ingest-knowledge", { body: { source_id: id } });
    },
    onSuccess: () => {
      toast.success("Reprocessamento iniciado");
      qc.invalidateQueries({ queryKey: ["ai-knowledge-sources", agent.id] });
    },
  });

  // ===== Training examples =====
  const examples = useQuery({
    queryKey: ["ai-training-examples", agent.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_training_examples" as any)
        .select("*")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const addExample = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ai_training_examples" as any).insert({
        agent_id: agent.id,
        company_id: resolvedCompanyId(),
        question: exQ,
        ideal_answer: exA,
        tags: scopeToTags(exScope),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exemplo salvo");
      setExQ(""); setExA(""); setExScope({ roles: [], modules: [] });
      qc.invalidateQueries({ queryKey: ["ai-training-examples", agent.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateExampleScope = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: ScopeValue }) => {
      const { error } = await supabase.from("ai_training_examples" as any)
        .update({ tags: scopeToTags(next) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escopo atualizado");
      qc.invalidateQueries({ queryKey: ["ai-training-examples", agent.id] });
    },
  });

  const deleteExample = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_training_examples" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-training-examples", agent.id] }),
  });

  // ===== Fine tune jobs =====
  const jobs = useQuery({
    queryKey: ["ai-fine-tune-jobs", agent.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_fine_tune_jobs" as any)
        .select("*")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const startFineTune = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-finetune-create", {
        body: { agent_id: agent.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Job de fine tuning iniciado");
      qc.invalidateQueries({ queryKey: ["ai-fine-tune-jobs", agent.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao iniciar fine tuning"),
  });

  // ===== Filtro da lista =====
  const filterRow = (row: any) => {
    const s = scopeFromRow(row);
    if (filter === "all") return true;
    if (filter === "global") return s.roles.length === 0 && s.modules.length === 0;
    if (filter.startsWith("role:")) return s.roles.includes(filter.slice(5));
    if (filter.startsWith("module:")) return s.modules.includes(filter.slice(7));
    return true;
  };

  return (
    <Tabs defaultValue="knowledge" className="w-full">
      <TabsList>
        <TabsTrigger value="knowledge">Base de conhecimento</TabsTrigger>
        <TabsTrigger value="examples">Exemplos (few-shot)</TabsTrigger>
        <TabsTrigger value="finetune">Fine tuning</TabsTrigger>
      </TabsList>

      <TabsContent value="knowledge" className="space-y-4">
        <Card className="p-4 space-y-3">
          <h4 className="font-semibold">Adicionar conhecimento</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Manual de operações" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full relative" disabled={uploadFile.isPending}>
                <Upload className="h-4 w-4 mr-2" />
                {uploadFile.isPending ? "Enviando..." : "Enviar PDF/DOCX/TXT"}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="opacity-0 absolute inset-0 cursor-pointer"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile.mutate(f);
                  }}
                />
              </Button>
            </div>
          </div>

          <div>
            <Label>Escopo do conteúdo</Label>
            <div className="mt-2 p-3 border rounded-md bg-muted/30">
              <ScopeEditor value={scope} onChange={setScope} />
            </div>
          </div>

          <div>
            <Label>Ou cole texto manual</Label>
            <Textarea value={manualText} onChange={(e) => setManualText(e.target.value)} rows={4} />
            <Button
              className="mt-2"
              size="sm"
              disabled={!manualText.trim() || addManual.isPending}
              onClick={() => addManual.mutate()}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar texto
            </Button>
          </div>
        </Card>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Filtrar:</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-64 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="global">Somente Global</SelectItem>
              {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={`role:${r.value}`}>Papel: {r.label}</SelectItem>)}
              {MODULE_OPTIONS.map(m => <SelectItem key={m.value} value={`module:${m.value}`}>Módulo: {m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {sources.data?.filter(filterRow).map((s: any) => {
            const sv = scopeFromRow(s);
            return (
              <Card key={s.id} className="p-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium text-sm truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.source_type.toUpperCase()} • {s.chunk_count} chunks
                    {s.error_message && <span className="text-destructive ml-2">• {s.error_message}</span>}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <ScopeChip value={sv} />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          <Pencil className="h-3 w-3 mr-1" /> Editar escopo
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[420px]" align="start">
                        <InlineScopeEditor
                          initial={sv}
                          onSave={(next) => updateSourceScope.mutate({ id: s.id, next })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {statusBadge(s.status)}
                <Button size="icon" variant="ghost" onClick={() => reprocess.mutate(s.id)}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => {
                  if (confirm("Remover?")) deleteSource.mutate(s.id);
                }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Card>
            );
          })}
          {!sources.data?.length && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum conhecimento cadastrado ainda.
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="examples" className="space-y-4">
        <Card className="p-4 space-y-3">
          <h4 className="font-semibold">Novo exemplo de pergunta/resposta</h4>
          <div>
            <Label>Pergunta</Label>
            <Textarea value={exQ} onChange={(e) => setExQ(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Resposta ideal</Label>
            <Textarea value={exA} onChange={(e) => setExA(e.target.value)} rows={4} />
          </div>
          <div>
            <Label>Escopo</Label>
            <div className="mt-2 p-3 border rounded-md bg-muted/30">
              <ScopeEditor value={exScope} onChange={setExScope} />
            </div>
          </div>
          <Button disabled={!exQ.trim() || !exA.trim()} onClick={() => addExample.mutate()}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar exemplo
          </Button>
        </Card>

        <div className="space-y-2">
          {examples.data?.filter(filterRow).map((e: any) => {
            const sv = scopeFromRow(e);
            return (
              <Card key={e.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">P: {e.question}</p>
                    <p className="text-sm text-muted-foreground">R: {e.ideal_answer}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <ScopeChip value={sv} />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                            <Pencil className="h-3 w-3 mr-1" /> Editar escopo
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[420px]" align="start">
                          <InlineScopeEditor
                            initial={sv}
                            onSave={(next) => updateExampleScope.mutate({ id: e.id, next })}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteExample.mutate(e.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="finetune" className="space-y-4">
        <Card className="p-4 space-y-3">
          <h4 className="font-semibold">Fine tuning OpenAI</h4>
          <p className="text-sm text-muted-foreground">
            Gera dataset JSONL a partir dos exemplos curados e conversas com feedback positivo,
            envia para OpenAI Files API e dispara fine tuning. Requer secret <code>OPENAI_API_KEY</code>.
          </p>
          <Button onClick={() => startFineTune.mutate()} disabled={startFineTune.isPending}>
            Iniciar fine tuning
          </Button>
        </Card>

        <div className="space-y-2">
          {jobs.data?.map((j: any) => (
            <Card key={j.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{j.base_model}</p>
                  <p className="text-xs text-muted-foreground">
                    {j.example_count} exemplos • {new Date(j.created_at).toLocaleString("pt-BR")}
                    {j.fine_tuned_model && <span className="ml-2">→ <code>{j.fine_tuned_model}</code></span>}
                  </p>
                </div>
                <Badge>{j.status}</Badge>
              </div>
            </Card>
          ))}
          {!jobs.data?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum job ainda.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function InlineScopeEditor({ initial, onSave }: { initial: ScopeValue; onSave: (v: ScopeValue) => void }) {
  const [value, setValue] = useState<ScopeValue>(initial);
  return (
    <div className="space-y-3">
      <ScopeEditor value={value} onChange={setValue} />
      <div className="flex justify-end">
        <Button size="sm" onClick={() => onSave(value)}>Salvar escopo</Button>
      </div>
    </div>
  );
}
