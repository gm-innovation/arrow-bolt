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
import { Trash2, Upload, RefreshCw, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef } from "react";

interface Props { agent: AIAgent; }

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
        company_id: agent.company_id,
        source_type: sourceType,
        title: title || file.name,
        storage_path: path,
        status: "pending",
      }).select().maybeSingle();
      if (error) throw error;
      // Trigger ingestão
      await supabase.functions.invoke("ingest-knowledge", { body: { source_id: (data as any).id } }).catch(() => {});
      return data;
    },
    onSuccess: () => {
      toast.success("Arquivo enviado — processamento em background");
      setTitle("");
      qc.invalidateQueries({ queryKey: ["ai-knowledge-sources", agent.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha no upload"),
  });

  const addManual = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("ai_knowledge_sources" as any).insert({
        agent_id: agent.id,
        company_id: agent.company_id,
        source_type: "manual",
        title: title || "Texto manual",
        raw_text: manualText,
        status: "pending",
      }).select().maybeSingle();
      if (error) throw error;
      await supabase.functions.invoke("ingest-knowledge", { body: { source_id: (data as any).id } }).catch(() => {});
      return data;
    },
    onSuccess: () => {
      toast.success("Texto adicionado");
      setTitle(""); setManualText("");
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
        company_id: agent.company_id,
        question: exQ,
        ideal_answer: exA,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exemplo salvo");
      setExQ(""); setExA("");
      qc.invalidateQueries({ queryKey: ["ai-training-examples", agent.id] });
    },
    onError: (e: any) => toast.error(e.message),
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
              <Button
                variant="outline"
                className="w-full relative"
                disabled={uploadFile.isPending}
              >
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

        <div className="space-y-2">
          {sources.data?.map((s: any) => (
            <Card key={s.id} className="p-3 flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.source_type.toUpperCase()} • {s.chunk_count} chunks
                  {s.error_message && <span className="text-destructive ml-2">• {s.error_message}</span>}
                </p>
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
          ))}
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
          <Button disabled={!exQ.trim() || !exA.trim()} onClick={() => addExample.mutate()}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar exemplo
          </Button>
        </Card>

        <div className="space-y-2">
          {examples.data?.map((e: any) => (
            <Card key={e.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">P: {e.question}</p>
                  <p className="text-sm text-muted-foreground">R: {e.ideal_answer}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteExample.mutate(e.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
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
