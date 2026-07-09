import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Phone, Building2, Search, Eye, Sparkles } from "lucide-react";
import { useSiteLeads } from "@/hooks/useSiteLeads";
import { ConvertLeadDialog, type Lead } from "./ConvertLeadDialog";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_LABEL: Record<Lead["status"], string> = {
  new: "Novo",
  reviewed: "Em contato",
  converted: "Convertido",
  discarded: "Descartado",
};

const STATUS_VARIANT: Record<Lead["status"], "default" | "secondary" | "outline"> = {
  new: "default",
  reviewed: "secondary",
  converted: "outline",
  discarded: "outline",
};

interface Props {
  onConverted?: () => void;
}

export const SiteLeadsTab = ({ onConverted }: Props) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const { leads, isLoading, setStatus } = useSiteLeads();
  const [search, setSearch] = useState("");
  const statusFilter = (searchParams.get("status") as Lead["status"] | "all") || "all";
  const [selected, setSelected] = useState<Lead | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);

  const setStatusFilter = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v === "all") next.delete("status"); else next.set("status", v);
    next.set("tab", "leads");
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (l.name || "").toLowerCase().includes(q)
          || (l.company_name || "").toLowerCase().includes(q)
          || (l.email || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [leads, statusFilter, search]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-lg">Leads do Site</CardTitle>
            <CardDescription>{filtered.length} de {leads.length} lead(s) — atualizado automaticamente</CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-56" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="new">Novos</SelectItem>
                <SelectItem value="reviewed">Em contato</SelectItem>
                <SelectItem value="converted">Convertidos</SelectItem>
                <SelectItem value="discarded">Descartados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Empresa / Contato</TableHead>
              <TableHead className="hidden md:table-cell">Contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum lead.</TableCell></TableRow>
            ) : filtered.map((l) => (
              <TableRow key={l.id} className={l.status === "new" ? "font-medium" : ""}>
                <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                <TableCell>
                  <Badge variant={l.type === "rfq" ? "default" : "secondary"}>
                    {l.type === "rfq" ? "Proposta" : "Contato"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{l.company_name || l.name}</div>
                  {l.company_name && l.name && <div className="text-xs text-muted-foreground">{l.name}</div>}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {l.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{l.email}</div>}
                  {l.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{l.phone}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(l)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  {l.status !== "converted" && (
                    <Button variant="secondary" size="sm" onClick={() => setConvertLead(l)}>
                      <Sparkles className="w-4 h-4 mr-1" /> Converter
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.company_name || selected?.name || "Lead"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {selected.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4" />{selected.email}</div>}
                {selected.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{selected.phone}</div>}
                {selected.company_name && <div className="flex items-center gap-2 col-span-2"><Building2 className="w-4 h-4" />{selected.company_name}</div>}
              </div>
              {selected.message && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Mensagem</div>
                  <div className="p-3 bg-muted rounded whitespace-pre-wrap">{selected.message}</div>
                </div>
              )}
              {selected.items?.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Itens de interesse</div>
                  <div className="border rounded divide-y">
                    {selected.items.map((it, idx) => (
                      <div key={idx} className="p-2 flex justify-between text-sm">
                        <span>{it.name}{it.notes && <span className="text-muted-foreground"> — {it.notes}</span>}</span>
                        {it.qty != null && <span className="font-mono">{it.qty}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Select
                  value={selected.status}
                  onValueChange={(v) => setStatus.mutate({ id: selected.id, status: v as Lead["status"] })}
                  disabled={selected.status === "converted"}
                >
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selected.status !== "converted" && (
                  <Button variant="default" size="sm" className="ml-auto" onClick={() => { setConvertLead(selected); setSelected(null); }}>
                    <Sparkles className="w-4 h-4 mr-1" /> Converter
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {convertLead && profile?.company_id && profile?.id && (
        <ConvertLeadDialog
          open={!!convertLead}
          onOpenChange={(v) => !v && setConvertLead(null)}
          lead={convertLead}
          companyId={profile.company_id}
          userId={profile.id}
          onConverted={() => { setConvertLead(null); onConverted?.(); }}
        />
      )}
    </Card>
  );
};
