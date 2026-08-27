import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Loader2, Plus, Power, Save, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useActivateMarinaSkill,
  useDeactivateMarinaSkill,
  useDeleteMarinaSkill,
  useDismissMarinaSuggestion,
  useMarinaSkills,
  useSaveMarinaSkill,
  type MarinaSkill,
} from "@/hooks/useMarina";

const TEMPLATE = `# Nome da habilidade

## Quando usar
Descreva em uma ou duas frases as situações em que a Marina deve usar esta habilidade.

## Como fazer
1. Primeiro passo
2. Segundo passo

## Observações
Regras, limites e cuidados.
`;

function SkillCard({
  skill,
  onActivate,
  onDeactivate,
  onDismiss,
  onDelete,
  busy,
}: {
  skill: MarinaSkill;
  onActivate: (s: MarinaSkill) => void;
  onDeactivate: (s: MarinaSkill) => void;
  onDismiss?: (s: MarinaSkill) => void;
  onDelete?: (s: MarinaSkill) => void;
  busy: boolean;
}) {
  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="flex items-center gap-1 text-sm font-medium">
            <Sparkles className="h-3 w-3 shrink-0 text-primary" />
            <span className="truncate">{skill.name}</span>
          </span>
          {skill.description && <p className="mt-1 text-xs text-muted-foreground">{skill.description}</p>}
        </div>
        {skill.category && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {skill.category}
          </Badge>
        )}
      </div>
      {skill.when_to_use && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Quando usar: </span>
          {skill.when_to_use}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {skill.scope === "global" ? "Biblioteca padrão" : "Criada na empresa"}
        </span>
        <div className="flex items-center gap-1">
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={() => onDismiss(skill)} disabled={busy}>
              <X className="mr-1 h-3 w-3" /> Não, obrigado
            </Button>
          )}
          {onDelete && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(skill)} disabled={busy} aria-label="Remover">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          {skill.active ? (
            <Button size="sm" variant="outline" onClick={() => onDeactivate(skill)} disabled={busy}>
              <Power className="mr-1 h-3 w-3" /> Desativar
            </Button>
          ) : (
            <Button size="sm" onClick={() => onActivate(skill)} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />} Ativar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function MarinaSkillsPanel() {
  const { data: skills, isLoading, error } = useMarinaSkills();
  const [term, setTerm] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(TEMPLATE);

  const activate = useActivateMarinaSkill();
  const deactivate = useDeactivateMarinaSkill();
  const dismiss = useDismissMarinaSuggestion();
  const remove = useDeleteMarinaSkill();
  const save = useSaveMarinaSkill();

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    const list = skills ?? [];
    if (!t) return list;
    return list.filter((s) =>
      `${s.name} ${s.description ?? ""} ${s.when_to_use ?? ""} ${s.category ?? ""}`.toLowerCase().includes(t),
    );
  }, [skills, term]);

  const installed = filtered.filter((s) => s.active);
  const suggested = filtered.filter((s) => s.suggested);
  const library = filtered.filter((s) => !s.active);

  const run = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try {
      await fn();
      toast({ title: ok });
    } catch (e) {
      toast({ title: "Não foi possível concluir", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      toast({ title: "Informe nome e conteúdo", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({ name: name.trim(), description: description.trim(), content });
      toast({ title: "Habilidade salva", description: "A Marina já pode usar e outros colegas também." });
      setCreating(false);
      setName("");
      setDescription("");
      setContent(TEMPLATE);
    } catch (e) {
      toast({ title: "Não foi possível salvar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const cardProps = {
    onActivate: (s: MarinaSkill) => run(s.id, () => activate.mutateAsync(s.id), `Habilidade "${s.name}" ativada`),
    onDeactivate: (s: MarinaSkill) => run(s.id, () => deactivate.mutateAsync(s.id), `Habilidade "${s.name}" desativada`),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar habilidade" className="pl-8" />
        </div>
        <Button variant="outline" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova habilidade
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Você também pode pedir no chat: “crie uma habilidade para…”. A Marina explica o que vai fazer e salva só depois da sua confirmação.
      </p>

      {error && <p className="text-xs text-destructive">Não foi possível listar as habilidades agora.</p>}
      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && (
        <Tabs defaultValue="installed">
          <TabsList>
            <TabsTrigger value="installed">Ativas ({installed.length})</TabsTrigger>
            <TabsTrigger value="library">Biblioteca ({library.length})</TabsTrigger>
            <TabsTrigger value="suggested">Sugeridas ({suggested.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="mt-4">
            {installed.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma habilidade ativa. Ative uma da biblioteca ou peça uma nova no chat.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {installed.map((s) => (
                  <SkillCard
                    key={s.id}
                    skill={s}
                    busy={busyId === s.id}
                    {...cardProps}
                    onDelete={
                      s.scope === "empresa"
                        ? (sk) => run(sk.id, () => remove.mutateAsync(sk.id), `Habilidade "${sk.name}" removida`)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="library" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2">
              {library.map((s) => (
                <SkillCard key={s.id} skill={s} busy={busyId === s.id} {...cardProps} />
              ))}
            </div>
            {library.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Nada por aqui com esse filtro.</p>
            )}
          </TabsContent>

          <TabsContent value="suggested" className="mt-4">
            {suggested.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sem indicações agora. Quando um colega do seu papel ativar algo útil, aparece aqui.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {suggested.map((s) => (
                  <SkillCard
                    key={s.id}
                    skill={s}
                    busy={busyId === s.id}
                    {...cardProps}
                    onDismiss={(sk) => run(sk.id, () => dismiss.mutateAsync(sk.id), "Indicação descartada")}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova habilidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Campanha de e-mail marketing" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">O que ela faz</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Resumo em uma linha" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Instruções (markdown)</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[280px] font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
