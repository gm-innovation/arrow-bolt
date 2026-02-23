import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingDown, BarChart3, Pencil, Plus, Sparkles, ThumbsUp, X, CalendarIcon, User } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  prospect: { label: "Prospect", color: "bg-blue-100 text-blue-800" },
  active: { label: "Ativo", color: "bg-green-100 text-green-800" },
  inactive: { label: "Inativo", color: "bg-gray-100 text-gray-800" },
  churned: { label: "Em Risco", color: "bg-red-100 text-red-800" },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Client {
  id: string;
  name: string;
  cnpj: string | null;
  segment: string | null;
  commercial_status: string | null;
  annual_revenue: number | null;
  last_contact_date: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onEdit: (client: Client) => void;
}

export const ClientDetailSheet = ({ open, onOpenChange, client, onEdit }: Props) => {
  const navigate = useNavigate();

  // Opportunities for this client
  const { data: opportunities = [], isLoading: loadingOpps } = useQuery({
    queryKey: ["client-opportunities", client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_opportunities")
        .select("id, title, stage, estimated_value, probability, expected_close_date, created_at")
        .eq("client_id", client!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!client?.id && open,
  });

  // Recurrences
  const { data: recurrences = [], isLoading: loadingRec } = useQuery({
    queryKey: ["client-recurrences", client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_client_recurrences")
        .select("id, periodicity, next_date, estimated_value, status, crm_products(name)")
        .eq("client_id", client!.id)
        .order("next_date");
      return data || [];
    },
    enabled: !!client?.id && open,
  });

  // Buyers/Contacts
  const { data: buyers = [], isLoading: loadingBuyers } = useQuery({
    queryKey: ["client-buyers", client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_buyers")
        .select("id, name, role, email, phone, influence_level, is_primary")
        .eq("client_id", client!.id)
        .order("name");
      return data || [];
    },
    enabled: !!client?.id && open,
  });

  // KPIs
  const kpis = useMemo(() => {
    const wonOpps = opportunities.filter((o: any) => o.stage === "closed_won");
    const tcv = wonOpps.reduce((s: number, o: any) => s + (Number(o.estimated_value) || 0), 0);
    const avgTicket = wonOpps.length > 0 ? tcv / wonOpps.length : 0;
    const daysSinceContact = client?.last_contact_date
      ? differenceInDays(new Date(), new Date(client.last_contact_date))
      : 999;
    const churnRisk = daysSinceContact > 90 ? "Alto" : daysSinceContact > 60 ? "Médio" : "Baixo";
    const churnColor = daysSinceContact > 90 ? "text-destructive" : daysSinceContact > 60 ? "text-orange-600" : "text-green-600";
    return { tcv, avgTicket, churnRisk, churnColor };
  }, [opportunities, client]);

  if (!client) return null;

  const statusInfo = STATUS_BADGES[client.commercial_status || ""] || { label: "N/A", color: "" };
  const initial = client.name.charAt(0).toUpperCase();

  const stageLabels: Record<string, string> = {
    identified: "Identificada", qualified: "Qualificada", proposal: "Proposta",
    negotiation: "Negociação", closed_won: "Ganha", closed_lost: "Perdida",
  };

  const stageColors: Record<string, string> = {
    identified: "bg-blue-100 text-blue-800", qualified: "bg-cyan-100 text-cyan-800",
    proposal: "bg-yellow-100 text-yellow-800", negotiation: "bg-orange-100 text-orange-800",
    closed_won: "bg-green-100 text-green-800", closed_lost: "bg-red-100 text-red-800",
  };

  const influenceLabels: Record<string, string> = {
    decisor: "Decisor", influenciador: "Influenciador", usuario: "Usuário",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Dossiê do Cliente</SheetTitle>
          <SheetDescription>Visão completa do relacionamento comercial.</SheetDescription>
        </SheetHeader>

        {/* Header */}
        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initial}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg truncate">{client.name}</p>
              {client.cnpj && <p className="text-sm text-muted-foreground">{client.cnpj}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className={statusInfo.color}>{statusInfo.label}</Badge>
            {client.segment && <Badge variant="outline">{client.segment}</Badge>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); onEdit(client); }}>
              <Pencil className="h-3 w-3 mr-1" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); navigate(`/commercial/opportunities?client=${client.id}`); }}>
              <Plus className="h-3 w-3 mr-1" /> Nova Oportunidade
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">TCV</p>
              <p className="font-bold text-sm">{formatCurrency(kpis.tcv)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <BarChart3 className="h-4 w-4 mx-auto text-chart-2 mb-1" />
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
              <p className="font-bold text-sm">{formatCurrency(kpis.avgTicket)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingDown className={`h-4 w-4 mx-auto mb-1 ${kpis.churnColor}`} />
              <p className="text-xs text-muted-foreground">Risco Churn</p>
              <p className={`font-bold text-sm ${kpis.churnColor}`}>{kpis.churnRisk}</p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-4" />

        {/* Tabs */}
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
            <TabsTrigger value="opportunities" className="text-xs">Oportunidades</TabsTrigger>
            <TabsTrigger value="purchases" className="text-xs">Compras</TabsTrigger>
            <TabsTrigger value="recurrences" className="text-xs">Recorrências</TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs">Contatos</TabsTrigger>
          </TabsList>

          {/* Insights de IA */}
          <TabsContent value="insights" className="space-y-3 mt-3">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Recomendações de IA</span>
              </div>
              {[
                { text: "Cliente não tem contato há mais de 30 dias. Considere agendar uma visita.", type: "warning" },
                { text: "Oportunidade de upsell identificada com base no histórico de compras.", type: "success" },
                { text: "Renovação de contrato se aproxima nos próximos 60 dias.", type: "info" },
              ].map((insight, i) => (
                <div key={i} className="rounded-md border p-3 space-y-2">
                  <p className="text-sm">{insight.text}</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <X className="h-3 w-3 mr-1" /> Ignorar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <ThumbsUp className="h-3 w-3 mr-1" /> Relevante
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Oportunidades */}
          <TabsContent value="opportunities" className="space-y-2 mt-3">
            {loadingOpps ? (
              <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma oportunidade</p>
            ) : (
              opportunities.map((o: any) => (
                <div key={o.id} className="rounded-md border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{o.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={`text-xs ${stageColors[o.stage] || ""}`}>
                        {stageLabels[o.stage] || o.stage}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {o.estimated_value ? formatCurrency(o.estimated_value) : "—"}
                      </span>
                    </div>
                  </div>
                  {o.probability != null && (
                    <span className="text-sm font-medium">{o.probability}%</span>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Compras (won opportunities) */}
          <TabsContent value="purchases" className="space-y-2 mt-3">
            {loadingOpps ? (
              <Skeleton className="h-16 w-full" />
            ) : (() => {
              const won = opportunities.filter((o: any) => o.stage === "closed_won");
              return won.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma compra registrada</p>
              ) : (
                won.map((o: any) => (
                  <div key={o.id} className="rounded-md border p-3">
                    <p className="font-medium text-sm">{o.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{o.estimated_value ? formatCurrency(o.estimated_value) : "—"}</span>
                      {o.expected_close_date && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(o.expected_close_date), "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              );
            })()}
          </TabsContent>

          {/* Recorrências */}
          <TabsContent value="recurrences" className="space-y-2 mt-3">
            {loadingRec ? (
              <Skeleton className="h-16 w-full" />
            ) : recurrences.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma recorrência</p>
            ) : (
              recurrences.map((r: any) => (
                <div key={r.id} className="rounded-md border p-3">
                  <p className="font-medium text-sm">{r.crm_products?.name || "Sem produto"}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-xs">
                      {r.status === "active" ? "Ativa" : r.status}
                    </Badge>
                    <span>{r.periodicity}</span>
                    {r.next_date && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(r.next_date + "T12:00:00"), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Contatos */}
          <TabsContent value="contacts" className="space-y-2 mt-3">
            {loadingBuyers ? (
              <Skeleton className="h-16 w-full" />
            ) : buyers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum contato</p>
            ) : (
              buyers.map((b: any) => (
                <div key={b.id} className="rounded-md border p-3 flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{b.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{b.name}</p>
                      {b.is_primary && <Badge variant="default" className="text-xs">Principal</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{b.role || "—"} • {b.email || b.phone || "—"}</p>
                  </div>
                  {b.influence_level && (
                    <Badge variant="outline" className="text-xs">
                      {influenceLabels[b.influence_level] || b.influence_level}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
