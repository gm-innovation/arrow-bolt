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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { History, Package, Database, Bot, Cloud, Tag, FileText, ChevronDown, Code2, Plus, Info } from "lucide-react";
import { formatLocalDate } from "@/lib/utils";
import {
  usePMTickets,
  useChangelog,
  usePublishVersion,
  useRegisterManualChange,
  type PMTicket,
} from "@/hooks/usePMDashboard";
import { usePMActivityLog, type ActivityLogItem, type ActivitySource } from "@/hooks/usePMActivityLog";

const SOURCE_META: Record<ActivitySource, { label: string; icon: any; className: string }> = {
  ticket:        { label: "Ticket",     icon: Tag,      className: "bg-blue-500/10 text-blue-700 border-blue-300" },
  changelog:     { label: "Versão",     icon: Package,  className: "bg-emerald-500/10 text-emerald-700 border-emerald-300" },
  migration:     { label: "Migração",   icon: Database, className: "bg-slate-500/10 text-slate-700 border-slate-300" },
  marina_action: { label: "Marina",     icon: Bot,      className: "bg-purple-500/10 text-purple-700 border-purple-300" },
  edge_function: { label: "Função",     icon: Cloud,    className: "bg-amber-500/10 text-amber-700 border-amber-300" },
  manual:        { label: "Manual",     icon: FileText, className: "bg-gray-500/10 text-gray-700 border-gray-300" },
};

const CATEGORY_LABEL: Record<string, string> = {
  bug: "Correção",
  feature_request: "Feature",
  improvement: "Melhoria",
  suggestion: "Sugestão",
  release: "Release",
  infra: "Infra",
  ai: "IA",
};

export function PMHistoryTab({ onOpen }: { onOpen: (t: PMTicket) => void }) {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const activity = usePMActivityLog({
    sources: sourceFilter === "all" ? undefined : [sourceFilter as ActivitySource],
    module: moduleFilter === "all" ? null : moduleFilter,
    search: search || null,
  });
  const tickets = usePMTickets();
  const changelog = useChangelog();

  const items = activity.data ?? [];
  const ticketsById = useMemo(() => {
    const m = new Map<string, PMTicket>();
    (tickets.data ?? []).forEach((t) => m.set(t.id, t));
    return m;
  }, [tickets.data]);

  const modules = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.module && s.add(i.module));
    return Array.from(s).sort();
  }, [items]);

  // Group by version (if the item is a ticket linked to a changelog id) or by week
  const grouped = useMemo(() => {
    const versionsById = new Map(changelog.data?.map((v) => [v.id, v]) ?? []);
    const groups: Record<string, { label: string; version?: any; items: ActivityLogItem[] }> = {};
    for (const it of items) {
      let key: string;
      let label: string;
      let version: any = undefined;

      const pmChangelogId = it.source === "ticket" ? (it.metadata?.pm_changelog_id as string | null) : null;
      const changelogRefId = it.source === "changelog" ? it.ref_id : null;

      if (pmChangelogId && versionsById.has(pmChangelogId)) {
        version = versionsById.get(pmChangelogId);
        key = `v:${pmChangelogId}`;
        label = version.version ? `v${version.version}${version.title ? ` — ${version.title}` : ""}` : version.title;
      } else if (changelogRefId && versionsById.has(changelogRefId)) {
        version = versionsById.get(changelogRefId);
        key = `v:${changelogRefId}`;
        label = version.version ? `v${version.version}${version.title ? ` — ${version.title}` : ""}` : version.title;
      } else {
        const d = new Date(it.occurred_at);
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        key = `w:${monday.toISOString().slice(0, 10)}`;
        label = `Semana de ${formatLocalDate(monday.toISOString())}`;
      }
      if (!groups[key]) groups[key] = { label, version, items: [] };
      groups[key].items.push(it);
    }
    // Sort groups: versions first (by their date), weeks by date desc
    return Object.entries(groups).sort((a, b) => {
      const ad = new Date(a[1].items[0].occurred_at).getTime();
      const bd = new Date(b[1].items[0].occurred_at).getTime();
      return bd - ad;
    });
  }, [items, changelog.data]);

  const unlinkedResolvedTickets = useMemo(
    () => (tickets.data ?? []).filter((t) => (t.status === "resolved" || t.status === "closed") && !t.pm_changelog_id),
    [tickets.data],
  );
  // Aviso: hoje só tem métricas (nenhuma alteração de código/migração registrada)
  const todayHasOnlyMetrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todays = items.filter((i) => String(i.occurred_at).slice(0, 10) === today);
    if (todays.length === 0) return true;
    return todays.every((i) => i.category === "metric" || i.module === "metrics");
  }, [items]);

  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-start gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Histórico do sistema
            </CardTitle>
            <CardDescription>
              Timeline unificado: alterações de código, correções, melhorias, versões publicadas, migrações no banco e ações da Marina.
            </CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setManualOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Registrar alteração
            </Button>
            <Button size="sm" onClick={() => setPublishOpen(true)} disabled={unlinkedResolvedTickets.length === 0}>
              <Package className="h-4 w-4 mr-1" /> Publicar versão ({unlinkedResolvedTickets.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayHasOnlyMetrics && (
            <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Hoje ainda não há alterações de código registradas — apenas atualizações automáticas de métricas.
                Alterações que não tocam o banco (frontend, workflows, edge functions) precisam ser registradas em
                "Registrar alteração" ou pela Marina.
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                <SelectItem value="ticket">Tickets</SelectItem>
                <SelectItem value="changelog">Versões</SelectItem>
                <SelectItem value="migration">Migrações</SelectItem>
                <SelectItem value="marina_action">Marina</SelectItem>
                <SelectItem value="edge_function">Funções</SelectItem>
                <SelectItem value="manual">Manuais</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar no histórico..."
              className="w-64"
            />
          </div>

          {activity.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : grouped.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum registro para os filtros selecionados.
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
                    {g.items.map((it) => {
                      const ticketRef = it.source === "ticket" ? String(it.metadata?.ticket_id ?? it.ref_id ?? "") : "";
                      const linkedTicket = ticketRef ? ticketsById.get(ticketRef) : undefined;
                      return (
                        <ActivityLogRow
                          key={it.id}
                          item={it}
                          isTicket={!!linkedTicket}
                          onOpenTicket={() => {
                            if (linkedTicket) onOpen(linkedTicket);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PublishVersionDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        candidates={unlinkedResolvedTickets}
      />

      <ManualChangeDialog open={manualOpen} onOpenChange={setManualOpen} />
    </>
  );
}

function ManualChangeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const register = useRegisterManualChange();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("improvement");
  const [module, setModule] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    register.mutate(
      { title: title.trim(), description: description.trim() || undefined, category, module: module.trim() || undefined },
      {
        onSuccess: () => {
          setTitle(""); setDescription(""); setCategory("improvement"); setModule("");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar alteração no histórico</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Correção de rota do perfil Marketing" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tipo</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Correção</SelectItem>
                  <SelectItem value="improvement">Melhoria</SelectItem>
                  <SelectItem value="feature_request">Feature</SelectItem>
                  <SelectItem value="infra">Infra</SelectItem>
                  <SelectItem value="ai">IA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Módulo</Label>
              <Input value={module} onChange={(e) => setModule(e.target.value)} placeholder="Ex.: PM, RH, SGQ" />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que foi alterado, arquivos/áreas impactadas..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!title.trim() || register.isPending}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivityLogRow({
  item,
  isTicket,
  onOpenTicket,
}: {
  item: ActivityLogItem;
  isTicket: boolean;
  onOpenTicket: () => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = SOURCE_META[item.source] ?? SOURCE_META.manual;
  const Icon = meta.icon;
  const catLabel = item.category ? (CATEGORY_LABEL[item.category] ?? item.category) : null;
  const objects = Array.isArray(item.metadata?.objects) ? (item.metadata!.objects as string[]) : [];
  const fields = Array.isArray(item.metadata?.fields) ? (item.metadata!.fields as string[]) : [];
  const sqlPreview: string | undefined = item.metadata?.sql_preview;
  const isCodeChange = item.metadata?.code_change_registered === true;
  const versionRef: string | undefined =
    item.source === "migration" ? (item.metadata?.version ?? item.ref_id ?? undefined) : undefined;
  const ticketNumber = item.metadata?.ticket_number;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded">
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-3 hover:bg-muted/40 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="outline" className={`text-[10px] ${meta.className}`}>
                    <Icon className="h-3 w-3 mr-1" /> {meta.label}
                  </Badge>
                  {isCodeChange && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-300">
                      <Code2 className="h-3 w-3 mr-1" /> Código alterado
                    </Badge>
                  )}
                  {catLabel && <Badge variant="outline" className="text-[10px]">{catLabel}</Badge>}
                  {item.module && <Badge variant="outline" className="text-[10px]">{item.module}</Badge>}
                  {ticketNumber && (
                    <span className="font-mono text-[10px] text-muted-foreground">#{ticketNumber}</span>
                  )}
                  {versionRef && (
                    <span className="font-mono text-[10px] text-muted-foreground">{versionRef}</span>
                  )}
                </div>
                <div className="text-sm font-medium">{item.title}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2">{item.description}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-xs text-muted-foreground">{formatLocalDate(item.occurred_at)}</div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-3 space-y-2 bg-muted/20">
            {objects.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-[11px] text-muted-foreground mr-1">Objetos:</span>
                {objects.slice(0, 20).map((o) => (
                  <Badge key={o} variant="secondary" className="text-[10px] font-mono">{o}</Badge>
                ))}
                {objects.length > 20 && (
                  <span className="text-[10px] text-muted-foreground">+{objects.length - 20}</span>
                )}
              </div>
            )}
            {fields.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-[11px] text-muted-foreground mr-1">Campos alterados:</span>
                {fields.map((f) => (
                  <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                ))}
              </div>
            )}
            {item.source === "ticket" && (item.metadata?.from || item.metadata?.to) && (
              <div className="text-xs text-muted-foreground">
                <span className="font-mono">{String(item.metadata?.from ?? "-")}</span>
                {" → "}
                <span className="font-mono">{String(item.metadata?.to ?? "-")}</span>
              </div>
            )}
            {isCodeChange && (
              <div className="text-xs text-muted-foreground">
                Código alterado e registrado no histórico sem depender da resolução do ticket.
              </div>
            )}
            {item.source === "marina_action" && item.metadata?.tool_name && (
              <div className="text-xs">
                <span className="text-muted-foreground">Ferramenta: </span>
                <span className="font-mono">{String(item.metadata.tool_name)}</span>
                {item.metadata?.success === false && item.metadata?.error_message && (
                  <div className="text-red-600 mt-1">Erro: {String(item.metadata.error_message)}</div>
                )}
              </div>
            )}
            {sqlPreview && (
              <div>
                <div className="text-[11px] text-muted-foreground mb-1">SQL:</div>
                <pre className="text-[11px] bg-background border rounded p-2 max-h-64 overflow-auto whitespace-pre-wrap">
                  {sqlPreview}
                </pre>
              </div>
            )}
            {isTicket && (
              <Button size="sm" variant="outline" onClick={onOpenTicket}>
                Abrir ticket
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
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
