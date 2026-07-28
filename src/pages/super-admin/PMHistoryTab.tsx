import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { History, Package, Bug, Sparkles } from "lucide-react";
import { formatLocalDate } from "@/lib/utils";
import {
  usePMTickets,
  useChangelog,
  usePublishVersion,
  type PMTicket,
} from "@/hooks/usePMDashboard";

const TYPE_LABEL: Record<string, { label: string; icon: any; className: string }> = {
  bug: { label: "Correção", icon: Bug, className: "bg-red-500/10 text-red-700 border-red-300" },
  feature_request: { label: "Feature", icon: Sparkles, className: "bg-blue-500/10 text-blue-700 border-blue-300" },
  improvement: { label: "Melhoria", icon: Sparkles, className: "bg-emerald-500/10 text-emerald-700 border-emerald-300" },
  suggestion: { label: "Sugestão", icon: Sparkles, className: "bg-amber-500/10 text-amber-700 border-amber-300" },
};

export function PMHistoryTab({ onOpen }: { onOpen: (t: PMTicket) => void }) {
  const { data: tickets = [], isLoading } = usePMTickets();
  const changelog = useChangelog();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [publishOpen, setPublishOpen] = useState(false);

  const resolved = useMemo(
    () =>
      tickets
        .filter((t) => t.status === "resolved" || t.status === "closed")
        .filter((t) => typeFilter === "all" || t.category === typeFilter)
        .filter((t) => moduleFilter === "all" || (t.impacted_module ?? t.suggested_area) === moduleFilter)
        .sort((a, b) => new Date(b.resolved_at ?? b.created_at).getTime() - new Date(a.resolved_at ?? a.created_at).getTime()),
    [tickets, typeFilter, moduleFilter],
  );

  const modules = useMemo(() => {
    const s = new Set<string>();
    tickets.forEach((t) => {
      const m = t.impacted_module ?? t.suggested_area;
      if (m) s.add(m);
    });
    return Array.from(s).sort();
  }, [tickets]);

  // Group by version (if linked) or by week
  const grouped = useMemo(() => {
    const versionsById = new Map(changelog.data?.map((v) => [v.id, v]) ?? []);
    const groups: Record<string, { label: string; version?: any; items: PMTicket[] }> = {};
    for (const t of resolved) {
      let key: string;
      let label: string;
      let version: any = undefined;
      if (t.pm_changelog_id && versionsById.has(t.pm_changelog_id)) {
        version = versionsById.get(t.pm_changelog_id);
        key = `v:${t.pm_changelog_id}`;
        label = version.version ? `v${version.version} — ${version.title}` : version.title;
      } else {
        const d = new Date(t.resolved_at ?? t.created_at);
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        key = `w:${monday.toISOString().slice(0, 10)}`;
        label = `Semana de ${formatLocalDate(monday.toISOString())}`;
      }
      if (!groups[key]) groups[key] = { label, version, items: [] };
      groups[key].items.push(t);
    }
    return Object.entries(groups);
  }, [resolved, changelog.data]);

  const unlinked = resolved.filter((t) => !t.pm_changelog_id);

  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-start gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Histórico de entregas
            </CardTitle>
            <CardDescription>
              Correções e melhorias já entregues, agrupadas por versão publicada ou por semana.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setPublishOpen(true)} disabled={unlinked.length === 0}>
            <Package className="h-4 w-4 mr-1" /> Publicar versão ({unlinked.length})
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="bug">Correções</SelectItem>
                <SelectItem value="feature_request">Features</SelectItem>
                <SelectItem value="improvement">Melhorias</SelectItem>
                <SelectItem value="suggestion">Sugestões</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : grouped.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum ticket resolvido ainda. Ao encerrar um ticket, ele aparecerá aqui.
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([key, g]) => (
                <div key={key} className="border-l-2 border-primary/30 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{g.label}</h3>
                    <Badge variant="outline">{g.items.length} {g.items.length === 1 ? "item" : "itens"}</Badge>
                  </div>
                  {g.version?.description && (
                    <p className="text-xs text-muted-foreground mb-2">{g.version.description}</p>
                  )}
                  <div className="space-y-2">
                    {g.items.map((t) => {
                      const info = TYPE_LABEL[t.category] ?? { label: t.category, icon: Sparkles, className: "" };
                      const Icon = info.icon;
                      return (
                        <button
                          key={t.id}
                          onClick={() => onOpen(t)}
                          className="w-full text-left p-3 border rounded hover:bg-muted/40 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-mono text-[10px] text-muted-foreground">#{t.ticket_number}</span>
                                <Badge variant="outline" className={`text-[10px] ${info.className}`}>
                                  <Icon className="h-3 w-3 mr-1" /> {info.label}
                                </Badge>
                                {(t.impacted_module || t.suggested_area) && (
                                  <Badge variant="outline" className="text-[10px]">{t.impacted_module || t.suggested_area}</Badge>
                                )}
                              </div>
                              <div className="text-sm font-medium truncate">{t.title}</div>
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0">
                              {formatLocalDate(t.resolved_at ?? t.created_at)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PublishVersionDialog open={publishOpen} onOpenChange={setPublishOpen} candidates={unlinked} />
    </>
  );
}

function PublishVersionDialog({
  open,
  onOpenChange,
  candidates,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidates: PMTicket[];
}) {
  const publish = usePublishVersion();
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const submit = () => {
    if (!version.trim() || !title.trim()) return;
    const ids = selected.size > 0 ? Array.from(selected) : candidates.map((c) => c.id);
    publish.mutate(
      { version: version.trim(), title: title.trim(), description: description.trim() || undefined, ticket_ids: ids },
      {
        onSuccess: () => {
          setVersion(""); setTitle(""); setDescription(""); setSelected(new Set());
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publicar nova versão</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <Label>Versão</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.2.0" />
            </div>
            <div className="col-span-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: SGQ V3 + Roadmap drag-and-drop" />
            </div>
          </div>
          <div>
            <Label>Resumo</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Destaques da versão..." />
          </div>
          <div>
            <Label>Itens a incluir</Label>
            <div className="text-xs text-muted-foreground mb-1">
              {selected.size === 0 ? `Todos (${candidates.length})` : `${selected.size} selecionados`}
            </div>
            <div className="border rounded max-h-64 overflow-y-auto divide-y">
              {candidates.map((t) => (
                <label key={t.id} className="flex items-start gap-2 p-2 hover:bg-muted/40 cursor-pointer">
                  <Checkbox
                    checked={selected.has(t.id)}
                    onCheckedChange={() => toggle(t.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-muted-foreground">#{t.ticket_number}</div>
                    <div className="text-sm truncate">{t.title}</div>
                  </div>
                </label>
              ))}
              {candidates.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">Nenhum ticket resolvido pendente de versão.</div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={publish.isPending || !version.trim() || !title.trim()}>
            {publish.isPending ? "Publicando..." : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
