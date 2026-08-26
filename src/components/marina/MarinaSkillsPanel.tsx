import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useDeleteMarinaSkill,
  useMarinaSkillContent,
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

export function MarinaSkillsPanel() {
  const { data: skills, isLoading, error } = useMarinaSkills(true);
  const [selected, setSelected] = useState<MarinaSkill | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const { data: fileContent, isFetching } = useMarinaSkillContent(selected?.file);
  const save = useSaveMarinaSkill();
  const remove = useDeleteMarinaSkill();

  useEffect(() => {
    if (selected && typeof fileContent === "string") {
      setName(selected.name);
      setContent(fileContent);
    }
  }, [selected, fileContent]);

  const startNew = () => {
    setSelected(null);
    setCreating(true);
    setName("");
    setContent(TEMPLATE);
  };

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      toast({ title: "Informe nome e conteúdo", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({ name: name.trim(), content, file: selected?.file });
      toast({ title: "Habilidade salva", description: "A Marina já pode usar." });
      setCreating(false);
    } catch (e) {
      toast({ title: "Não foi possível salvar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (skill: MarinaSkill) => {
    if (!confirm(`Remover a habilidade "${skill.name}"?`)) return;
    try {
      await remove.mutateAsync(skill.file);
      if (selected?.file === skill.file) setSelected(null);
      toast({ title: "Habilidade removida" });
    } catch (e) {
      toast({ title: "Não foi possível remover", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-3 lg:col-span-1">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Habilidades</h3>
          <Button size="sm" variant="outline" onClick={startNew}>
            <Plus className="mr-1 h-3 w-3" /> Nova
          </Button>
        </div>
        {isLoading && <Skeleton className="h-24 w-full" />}
        {error && <p className="text-xs text-destructive">Não foi possível listar as habilidades agora.</p>}
        <div className="space-y-1">
          {(skills ?? []).map((s) => (
            <div key={s.file} className="group flex items-start gap-2 rounded-md p-2 hover:bg-accent">
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => {
                  setCreating(false);
                  setSelected(s);
                }}
              >
                <span className="flex items-center gap-1 text-sm font-medium">
                  <Sparkles className="h-3 w-3 text-primary" /> {s.name}
                </span>
                {s.description && <span className="line-clamp-2 text-xs text-muted-foreground">{s.description}</span>}
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => handleDelete(s)}
                aria-label="Remover habilidade"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {!isLoading && (skills ?? []).length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">Nenhuma habilidade cadastrada ainda.</p>
          )}
        </div>
      </Card>

      <Card className="space-y-3 p-4 lg:col-span-2">
        {!selected && !creating ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Escolha uma habilidade para editar ou crie uma nova.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Campanha de e-mail marketing" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Instruções (markdown)</label>
              {isFetching && selected ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[320px] font-mono text-xs" />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setSelected(null); setCreating(false); }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Salvar
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
