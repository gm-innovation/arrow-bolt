import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { useOpportunityActivities } from "@/hooks/useOpportunities";
import { OpportunityActivitiesTab } from "./OpportunityActivitiesTab";
import { OpportunityTasksTab } from "./OpportunityTasksTab";
import { OpportunityProductsTab } from "./OpportunityProductsTab";
import { OpportunityTransferTab } from "./OpportunityTransferTab";
import type { Opportunity } from "@/hooks/useOpportunities";

const STAGES = [
  { value: "identified", label: "Identificada" },
  { value: "qualified", label: "Qualificada" },
  { value: "proposal", label: "Proposta" },
  { value: "negotiation", label: "Negociação" },
  { value: "closed_won", label: "Fechada (Ganha)" },
  { value: "closed_lost", label: "Fechada (Perdida)" },
];

const TYPES = [
  { value: "new_business", label: "Novo Negócio" },
  { value: "renewal", label: "Renovação" },
  { value: "upsell", label: "Upsell" },
  { value: "cross_sell", label: "Cross-sell" },
];

const PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const stageColors: Record<string, string> = {
  identified: "bg-blue-100 text-blue-800",
  qualified: "bg-cyan-100 text-cyan-800",
  proposal: "bg-yellow-100 text-yellow-800",
  negotiation: "bg-orange-100 text-orange-800",
  closed_won: "bg-green-100 text-green-800",
  closed_lost: "bg-red-100 text-red-800",
};

const formatCurrency = (v: number | null) =>
  v ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "—";

const labelOf = (arr: { value: string; label: string }[], v?: string | null) =>
  arr.find((i) => i.value === v)?.label || v || "—";

interface BuyerLite {
  id: string;
  name: string;
  client_id: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity | null;
  clients: { id: string; name: string }[];
  buyers?: BuyerLite[];
  onSave: (data: Record<string, any>) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  showTransfer?: boolean;
}

export const EditOpportunitySheet = ({
  open,
  onOpenChange,
  opportunity,
  clients,
  buyers = [],
  onSave,
  onDelete,
  isLoading,
  readOnly = false,
  showTransfer,
}: Props) => {
  const transferEnabled = showTransfer ?? !readOnly;
  const [form, setForm] = useState<Record<string, any>>({});
  const [closeDate, setCloseDate] = useState<Date | undefined>();
  const [tab, setTab] = useState("details");

  const { data: users = [] } = useCompanyUsers(["commercial", "admin", "director", "manager"]);
  const { addActivity } = useOpportunityActivities(opportunity?.id || null);

  useEffect(() => {
    if (open && opportunity) {
      setForm({ ...opportunity });
      setCloseDate(opportunity.expected_close_date ? parseISO(opportunity.expected_close_date) : undefined);
      setTab("details");
    }
  }, [open, opportunity]);

  const filteredBuyers = useMemo(
    () => buyers.filter((b) => b.client_id === form.client_id),
    [buyers, form.client_id]
  );

  if (!opportunity) return null;

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.title || !form.client_id) return;

    // Auto-log changes (best-effort, fire and forget)
    const changes: string[] = [];
    if (form.stage !== opportunity.stage) {
      changes.push(`Estágio: ${labelOf(STAGES, opportunity.stage)} → ${labelOf(STAGES, form.stage)}`);
    }
    if ((form.assigned_to || null) !== (opportunity.assigned_to || null)) {
      const newName = users.find((u) => u.id === form.assigned_to)?.full_name || "—";
      const oldName = opportunity.assigned_name || "—";
      changes.push(`Responsável: ${oldName} → ${newName}`);
    }
    if (Number(form.estimated_value || 0) !== Number(opportunity.estimated_value || 0)) {
      changes.push(`Valor: ${formatCurrency(opportunity.estimated_value)} → ${formatCurrency(Number(form.estimated_value) || null)}`);
    }
    const newDate = closeDate ? format(closeDate, "yyyy-MM-dd") : null;
    if (newDate !== opportunity.expected_close_date) {
      changes.push(
        `Previsão: ${opportunity.expected_close_date ? format(parseISO(opportunity.expected_close_date), "dd/MM/yyyy") : "—"} → ${closeDate ? format(closeDate, "dd/MM/yyyy") : "—"}`
      );
    }
    if (changes.length > 0) {
      addActivity.mutate({ activity_type: "note", description: `[Atualização] ${changes.join(" | ")}` });
    }

    onSave({
      id: opportunity.id,
      title: form.title,
      client_id: form.client_id,
      buyer_id: form.buyer_id || null,
      assigned_to: form.assigned_to || null,
      estimated_value: form.estimated_value !== "" && form.estimated_value != null ? Number(form.estimated_value) : null,
      stage: form.stage,
      probability: form.probability != null && form.probability !== "" ? Number(form.probability) : null,
      opportunity_type: form.opportunity_type || null,
      priority: form.priority || null,
      expected_close_date: newDate,
      description: form.description || null,
      notes: form.notes || null,
      closed_at: ["closed_won", "closed_lost"].includes(form.stage) ? new Date().toISOString() : null,
      loss_reason: form.loss_reason || null,
    });
  };

  const ageDays = differenceInDays(new Date(), parseISO(opportunity.created_at));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl">{opportunity.title}</SheetTitle>
            <SheetDescription className="sr-only">Editar oportunidade</SheetDescription>
          </SheetHeader>

          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="secondary" className={stageColors[opportunity.stage]}>{labelOf(STAGES, opportunity.stage)}</Badge>
            {opportunity.priority && (
              <Badge variant="secondary" className={priorityColors[opportunity.priority]}>{labelOf(PRIORITIES, opportunity.priority)}</Badge>
            )}
            {opportunity.opportunity_type && <Badge variant="outline">{labelOf(TYPES, opportunity.opportunity_type)}</Badge>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium truncate">{opportunity.client_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Responsável</p>
              <p className="font-medium truncate">{opportunity.assigned_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="font-medium">{formatCurrency(opportunity.estimated_value)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Idade</p>
              <p className="font-medium">{ageDays}d</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className={cn("mx-6 mt-4 grid w-auto", transferEnabled ? "grid-cols-5" : "grid-cols-4") }>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="activities">Histórico</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="products">Itens</TabsTrigger>
            {transferEnabled && <TabsTrigger value="transfer">Transferência</TabsTrigger>}
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="details" className="mt-0 space-y-4">
              <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-95">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.title || ""} onChange={(e) => set("title", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={form.client_id || ""} onValueChange={(v) => { set("client_id", v); set("buyer_id", null); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contato / Comprador</Label>
                  <Select
                    value={form.buyer_id || "none"}
                    onValueChange={(v) => set("buyer_id", v === "none" ? null : v)}
                    disabled={!form.client_id}
                  >
                    <SelectTrigger><SelectValue placeholder={form.client_id ? "Selecione" : "Escolha o cliente"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {filteredBuyers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select value={form.assigned_to || "none"} onValueChange={(v) => set("assigned_to", v === "none" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" value={form.estimated_value ?? ""} onChange={(e) => set("estimated_value", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estágio *</Label>
                  <Select value={form.stage || "identified"} onValueChange={(v) => set("stage", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Probabilidade (%)</Label>
                  <Input type="number" min={0} max={100} value={form.probability ?? ""} onChange={(e) => set("probability", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.opportunity_type || "none"} onValueChange={(v) => set("opportunity_type", v === "none" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={form.priority || "medium"} onValueChange={(v) => set("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Previsão de Fechamento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left", !closeDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {closeDate ? format(closeDate, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={closeDate} onSelect={setCloseDate} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {form.stage === "closed_lost" && (
                <div className="space-y-2">
                  <Label>Motivo da Perda</Label>
                  <Textarea value={form.loss_reason || ""} onChange={(e) => set("loss_reason", e.target.value)} rows={2} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Notas internas</Label>
                <Textarea
                  value={form.notes || ""}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                  placeholder="Observações privadas da equipe comercial"
                />
              </div>
              </fieldset>
            </TabsContent>

            <TabsContent value="activities" className="mt-0">
              <OpportunityActivitiesTab opportunityId={opportunity.id} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <OpportunityTasksTab opportunityId={opportunity.id} clientId={opportunity.client_id} />
            </TabsContent>

            <TabsContent value="products" className="mt-0">
              <OpportunityProductsTab
                opportunityId={opportunity.id}
                onApplyTotal={(t) => { set("estimated_value", t); setTab("details"); }}
              />
            </TabsContent>

            {transferEnabled && (
              <TabsContent value="transfer" className="mt-0">
                <OpportunityTransferTab
                  opportunityId={opportunity.id}
                  currentAssignedTo={opportunity.assigned_to}
                  onTransferred={() => onOpenChange(false)}
                />
              </TabsContent>
            )}
          </div>
        </Tabs>

        {/* Footer (sticky) */}
        {readOnly ? (
          <div className="flex items-center justify-between gap-2 px-6 py-4 border-t bg-background">
            <p className="text-xs text-muted-foreground italic">Somente leitura — gerida pelo Comercial/Marketing</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-6 py-4 border-t bg-background">
            <Button variant="destructive" size="sm" onClick={() => { onDelete(opportunity.id); onOpenChange(false); }}>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.title || !form.client_id || isLoading}>
                {isLoading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
