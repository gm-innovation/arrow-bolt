import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useQualityKnowledge,
  type KnowledgeStatus,
} from "@/hooks/useQualityKnowledge";

const statusLabel: Record<KnowledgeStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const KnowledgePage = () => {
  const { articles, isLoading, create, update, markReviewed, remove } =
    useQualityKnowledge();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [period, setPeriod] = useState(12);
  const [status, setStatus] = useState<KnowledgeStatus>("draft");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!term) return true;
      return (
        a.title.toLowerCase().includes(term) ||
        (a.category ?? "").toLowerCase().includes(term) ||
        (a.tags ?? []).some((t) => t.toLowerCase().includes(term)) ||
        a.body.toLowerCase().includes(term)
      );
    });
  }, [articles, search, statusFilter]);

  const overdueCount = useMemo(
    () =>
      articles.filter(
        (a) =>
          a.review_due_at &&
          a.status === "published" &&
          new Date(a.review_due_at) < new Date()
      ).length,
    [articles]
  );

  const reset = () => {
    setTitle("");
    setBody("");
    setCategory("");
    setTags("");
    setPeriod(12);
    setStatus("draft");
  };

  const submit = async () => {
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      body,
      category: category || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      review_period_months: period,
      status,
    });
    setOpen(false);
    reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Conhecimento Organizacional
          </h2>
          <p className="text-sm text-muted-foreground">
            ISO 9001 §7.1.6 — lições aprendidas, boas práticas e conhecimento
            necessário para a operação dos processos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} revisão(ões) atrasada(s)
            </Badge>
          )}
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo artigo
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por título, categoria, tag ou conteúdo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="archived">Arquivados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto opacity-40 mb-3" />
            Nenhum artigo. Comece registrando lições aprendidas das NCRs e auditorias.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((a) => {
            const overdue =
              a.review_due_at &&
              a.status === "published" &&
              new Date(a.review_due_at) < new Date();
            return (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{a.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {statusLabel[a.status]}
                        </Badge>
                        {a.category && (
                          <Badge variant="secondary" className="text-xs">
                            {a.category}
                          </Badge>
                        )}
                        {overdue && (
                          <Badge variant="destructive" className="text-xs">
                            Revisão atrasada
                          </Badge>
                        )}
                      </div>
                      {a.body && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2 whitespace-pre-wrap">
                          {a.body}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        {a.tags?.length > 0 && (
                          <span>Tags: {a.tags.join(", ")}</span>
                        )}
                        <span>v{a.version}</span>
                        {a.reviewed_at && (
                          <span>
                            Última revisão:{" "}
                            {format(parseISO(a.reviewed_at), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        )}
                        {a.review_due_at && (
                          <span>
                            Próxima revisão:{" "}
                            {format(parseISO(a.review_due_at), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {a.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            update.mutate({
                              id: a.id,
                              status: "published",
                              published_at: new Date().toISOString(),
                              reviewed_at: new Date().toISOString(),
                            } as any)
                          }
                        >
                          Publicar
                        </Button>
                      )}
                      {a.status === "published" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markReviewed.mutate(a.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Marcar revisado
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Remover este artigo?")) remove.mutate(a.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo artigo de conhecimento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Input
                  placeholder="Ex.: lição aprendida"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  placeholder="processo, qualidade, NCR"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Conteúdo</Label>
              <Textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ciclo de revisão (meses)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value) || 12)}
                />
              </div>
              <div className="space-y-1">
                <Label>Status inicial</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as KnowledgeStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicar agora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!title.trim() || create.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgePage;
