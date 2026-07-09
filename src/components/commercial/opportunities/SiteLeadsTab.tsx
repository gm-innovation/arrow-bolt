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
import { Mail, Phone, Search, Sparkles } from "lucide-react";
import { useSiteLeads } from "@/hooks/useSiteLeads";
import { ConvertLeadDialog, type Lead } from "./ConvertLeadDialog";
import { LeadDetailsDialog } from "./LeadDetailsDialog";
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
              <TableRow
                key={l.id}
                className={`cursor-pointer ${l.status === "new" ? "font-medium" : ""}`}
                onClick={() => setSelected(l)}
              >
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
                <TableCell className="text-right">
                  {l.status !== "converted" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setConvertLead(l); }}
                    >
                      <Sparkles className="w-4 h-4 mr-1" /> Converter
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <LeadDetailsDialog
        lead={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        onConvert={(lead) => setConvertLead(lead)}
        onStatusChange={(id, status) => setStatus.mutate({ id, status })}
      />

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
