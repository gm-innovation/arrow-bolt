import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Lead {
  id: string;
  type: "rfq" | "contact";
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  message: string | null;
  items: Array<{ name: string; qty?: number; notes?: string }>;
  status: "new" | "reviewed" | "converted" | "discarded";
  created_at: string;
  ip: string | null;
  user_agent: string | null;
  opportunity_id: string | null;
  converted_at: string | null;
  source?: string | null;
}

interface ClientOption { id: string; name: string; cnpj: string | null }
interface BuyerOption { id: string; name: string; email: string | null }

const OPP_TYPES = [
  { value: "new_business", label: "Novo negócio" },
  { value: "recurring", label: "Recorrente" },
  { value: "renewal", label: "Renovação" },
  { value: "expansion", label: "Expansão" },
];

const VALID_STAGES = new Set([
  "identified",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
]);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead;
  companyId: string;
  userId: string;
  initialStage?: string;
  onConverted: (leadId: string, oppId: string) => void;
}

export function ConvertLeadDialog({
  open,
  onOpenChange,
  lead,
  companyId,
  userId,
  initialStage,
  onConverted,
}: Props) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [buyers, setBuyers] = useState<BuyerOption[]>([]);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [oppType, setOppType] = useState("new_business");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState<string>("qualified");

  useEffect(() => {
    if (!open) return;
    const baseTitle = lead.type === "rfq"
      ? `RFQ pelo site — ${lead.name}`
      : `Contato pelo site — ${lead.name}`;
    setTitle(baseTitle);
    setOppType("new_business");
    setEstimatedValue("");
    setStage(initialStage && VALID_STAGES.has(initialStage) ? initialStage : "qualified");
    const itemsTxt = lead.items?.length
      ? "\n\nItens de interesse:\n" + lead.items.map((it) => `- ${it.name}${it.qty ? ` (qtd ${it.qty})` : ""}${it.notes ? ` — ${it.notes}` : ""}`).join("\n")
      : "";
    setDescription(`Lead recebido pelo site (${lead.email}${lead.phone ? `, ${lead.phone}` : ""}).${lead.message ? `\n\n${lead.message}` : ""}${itemsTxt}`);
    setClientId(null);
    setBuyerId(null);
    setClientSearch("");
  }, [open, lead, initialStage]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("crm_client_options")
        .select("id, name, cnpj")
        .eq("company_id", companyId)
        .order("name")
        .limit(2000);
      setClients((data ?? []) as ClientOption[]);
    })();
  }, [open, companyId]);

  useEffect(() => {
    setBuyerId(null);
    if (!clientId) { setBuyers([]); return; }
    (async () => {
      const { data } = await supabase
        .from("crm_buyers")
        .select("id, name, email")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("is_primary", { ascending: false });
      setBuyers((data ?? []) as BuyerOption[]);
    })();
  }, [clientId]);

  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  const filteredClients = useMemo(() => {
    const q = normalize(clientSearch.trim());
    if (!q) return clients.slice(0, 100);
    const qDigits = onlyDigits(clientSearch);
    return clients.filter((c) => {
      if (normalize(c.name).includes(q)) return true;
      if (qDigits && c.cnpj && onlyDigits(c.cnpj).includes(qDigits)) return true;
      return false;
    }).slice(0, 100);
  }, [clients, clientSearch]);

  const totalMatches = useMemo(() => {
    const q = normalize(clientSearch.trim());
    if (!q) return clients.length;
    const qDigits = onlyDigits(clientSearch);
    return clients.filter((c) => {
      if (normalize(c.name).includes(q)) return true;
      if (qDigits && c.cnpj && onlyDigits(c.cnpj).includes(qDigits)) return true;
      return false;
    }).length;
  }, [clients, clientSearch]);

  const selectedClient = clients.find((c) => c.id === clientId);

  const createBuyerFromLead = async () => {
    if (!clientId) { toast.error("Selecione o cliente primeiro"); return; }
    const { data, error } = await supabase
      .from("crm_buyers")
      .insert({
        company_id: companyId,
        client_id: clientId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        is_primary: false,
        is_active: true,
      } as any)
      .select("id, name, email")
      .single();
    if (error) { toast.error(error.message); return; }
    setBuyers((prev) => [data as BuyerOption, ...prev]);
    setBuyerId(data!.id);
    toast.success("Contato criado");
  };

  const submit = async () => {
    if (!clientId) { toast.error("Selecione um cliente"); return; }
    if (!title.trim()) { toast.error("Informe um título"); return; }
    setSaving(true);

    // Auto-create buyer from lead if none selected and lead has contact info
    let effectiveBuyerId = buyerId;
    if (!effectiveBuyerId && lead.name && lead.email) {
      // Try to find an existing buyer for this client with same email first
      const { data: existing } = await supabase
        .from("crm_buyers")
        .select("id")
        .eq("client_id", clientId)
        .eq("email", lead.email)
        .eq("is_active", true)
        .maybeSingle();
      if (existing?.id) {
        effectiveBuyerId = existing.id;
      } else {
        const { data: newBuyer, error: buyerErr } = await supabase
          .from("crm_buyers")
          .insert({
            company_id: companyId,
            client_id: clientId,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            is_primary: false,
            is_active: true,
          } as any)
          .select("id")
          .single();
        if (!buyerErr && newBuyer) effectiveBuyerId = newBuyer.id;
      }
    }

    const { data: opp, error: oppErr } = await supabase
      .from("crm_opportunities")
      .insert({
        company_id: companyId,
        client_id: clientId,
        buyer_id: effectiveBuyerId,
        assigned_to: userId,
        title: title.trim(),
        description,
        opportunity_type: oppType,
        stage,
        estimated_value: estimatedValue ? Number(estimatedValue) : null,
        created_by: userId,
      } as any)
      .select("id")
      .single();

    if (oppErr || !opp) {
      setSaving(false);
      toast.error(oppErr?.message ?? "Falha ao criar oportunidade");
      return;
    }

    const { error: updErr } = await supabase
      .from("public_site_leads")
      .update({
        opportunity_id: opp.id,
        converted_at: new Date().toISOString(),
        status: "converted",
      })
      .eq("id", lead.id);

    setSaving(false);
    if (updErr) {
      toast.error("Oportunidade criada, mas falhou ao vincular ao lead: " + updErr.message);
      return;
    }
    toast.success("Lead convertido em oportunidade");
    onConverted(lead.id, opp.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Converter em oportunidade</DialogTitle>
          <DialogDescription>Vincule o lead a um cliente para criar a oportunidade.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{selectedClient.name}</span>
                  {selectedClient.cnpj && <span className="text-xs text-muted-foreground">{selectedClient.cnpj}</span>}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setClientId(null)}>
                  <X className="w-4 h-4 mr-1" /> Trocar
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <div className="p-2 border-b flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Buscar por nome ou CNPJ..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="border-0 focus-visible:ring-0 shadow-none h-8 px-0"
                  />
                  {clientSearch && (
                    <button type="button" onClick={() => setClientSearch("")} className="text-xs text-muted-foreground hover:text-foreground shrink-0">
                      limpar
                    </button>
                  )}
                </div>
                {lead.company_name && (
                  <div className="px-2 py-1.5 text-xs border-b bg-muted/40 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground truncate">
                      Sugestão do lead: <strong className="text-foreground">{lead.company_name}</strong>
                    </span>
                    <button
                      type="button"
                      className="text-primary hover:underline shrink-0"
                      onClick={() => setClientSearch(lead.company_name ?? "")}
                    >
                      Buscar
                    </button>
                  </div>
                )}
                <div className="max-h-64 overflow-y-auto p-1">
                  {filteredClients.length === 0 ? (
                    <div className="py-4 px-2 text-sm space-y-2 text-center">
                      <div className="text-muted-foreground">Nenhum cliente com esse nome ou CNPJ.</div>
                      <Link to="/commercial/clients" target="_blank" className="block text-primary underline">
                        Cadastrar novo cliente →
                      </Link>
                    </div>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setClientId(c.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent text-left",
                          clientId === c.id && "bg-accent"
                        )}
                      >
                        <Check className={cn("h-4 w-4 shrink-0", clientId === c.id ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate">{c.name}</span>
                          {c.cnpj && <span className="text-xs text-muted-foreground">{c.cnpj}</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {totalMatches > filteredClients.length && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-t text-center">
                    Mostrando {filteredClients.length} de {totalMatches} — refine a busca
                  </div>
                )}
              </div>
            )}
            {!selectedClient && lead.company_name && (
              <p className="text-xs text-muted-foreground">
                Não encontrou? <Link to="/commercial/clients" target="_blank" className="text-primary underline">Cadastrar novo cliente</Link>
              </p>
            )}
          </div>

          {clientId && (
            <div className="space-y-2">
              <Label>Contato (opcional)</Label>
              <div className="flex gap-2">
                <Select value={buyerId ?? "none"} onValueChange={(v) => setBuyerId(v === "none" ? null : v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Sem contato" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {buyers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}{b.email ? ` (${b.email})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={createBuyerFromLead}>+ do lead</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={oppType} onValueChange={setOppType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPP_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estágio inicial</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="identified">Identificada</SelectItem>
                  <SelectItem value="qualified">Qualificada</SelectItem>
                  <SelectItem value="proposal">Proposta</SelectItem>
                  <SelectItem value="negotiation">Negociação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !clientId}>
            {saving ? "Convertendo..." : "Criar oportunidade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
