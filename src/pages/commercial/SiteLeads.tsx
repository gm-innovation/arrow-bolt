import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Mail, Phone, Building2, Eye, ArrowRight, Check, ChevronsUpDown, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Lead {
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
}

const STATUS_LABEL: Record<Lead["status"], string> = {
  new: "Novo",
  reviewed: "Revisado",
  converted: "Convertido",
  discarded: "Descartado",
};

const OPP_TYPES = [
  { value: "new_business", label: "Novo negócio" },
  { value: "recurring", label: "Recorrente" },
  { value: "renewal", label: "Renovação" },
  { value: "expansion", label: "Expansão" },
];

export default function SiteLeads() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [hidePending, setHidePending] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("public_site_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setItems((data ?? []) as unknown as Lead[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: Lead["status"]) => {
    const { error } = await supabase
      .from("public_site_leads")
      .update({ status })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status atualizado");
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    setSelected((s) => (s && s.id === id ? { ...s, status } : s));
  };

  const visible = useMemo(() => {
    if (!hidePending) return items;
    return items.filter((l) => l.status !== "converted" && l.status !== "discarded");
  }, [items, hidePending]);

  const handleConverted = (leadId: string, opportunityId: string) => {
    setItems((prev) => prev.map((l) => l.id === leadId
      ? { ...l, opportunity_id: opportunityId, converted_at: new Date().toISOString(), status: "converted" }
      : l));
    setSelected((s) => s && s.id === leadId
      ? { ...s, opportunity_id: opportunityId, converted_at: new Date().toISOString(), status: "converted" }
      : s);
    setConvertOpen(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Leads do Site</h1>
          <p className="text-muted-foreground">
            Solicitações de proposta e contatos recebidos pelo site institucional.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="hide-pending" checked={hidePending} onCheckedChange={setHidePending} />
          <Label htmlFor="hide-pending" className="cursor-pointer text-sm">Mostrar só pendentes</Label>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recebidos</CardTitle>
          <CardDescription>{visible.length} {visible.length === 1 ? "lead" : "leads"}.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : visible.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum lead.</TableCell></TableRow>
              ) : visible.map((l) => (
                <TableRow key={l.id} className={l.status === "new" ? "font-medium" : ""}>
                  <TableCell className="text-xs">{format(new Date(l.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell>
                    <Badge variant={l.type === "rfq" ? "default" : "secondary"}>
                      {l.type === "rfq" ? "Proposta" : "Contato"}
                    </Badge>
                  </TableCell>
                  <TableCell>{l.name}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{l.email}</div>
                    {l.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{l.phone}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{l.company_name ?? "—"}</TableCell>
                  <TableCell>
                    {l.opportunity_id ? (
                      <Link to="/commercial/opportunities" className="inline-flex">
                        <Badge variant="outline" className="border-primary text-primary hover:bg-primary/10">
                          Convertido <ArrowRight className="w-3 h-3 ml-1" />
                        </Badge>
                      </Link>
                    ) : (
                      <Badge variant={l.status === "new" ? "default" : "outline"}>{STATUS_LABEL[l.status]}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelected(l)}>
                      <Eye className="w-4 h-4 mr-1" /> Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.type === "rfq" ? "Solicitação de proposta" : "Contato"} — {selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2"><Mail className="w-4 h-4" />{selected.email}</div>
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

              {selected.opportunity_id ? (
                <div className="p-3 border border-primary/30 bg-primary/5 rounded flex items-center justify-between">
                  <div>
                    <div className="font-medium">Lead convertido em oportunidade</div>
                    <div className="text-xs text-muted-foreground">
                      {selected.converted_at && `em ${format(new Date(selected.converted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/commercial/opportunities">Ver oportunidade <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={() => setConvertOpen(true)}>
                  <Sparkles className="w-4 h-4 mr-2" /> Converter em oportunidade
                </Button>
              )}

              <div className="flex items-center gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Select value={selected.status} onValueChange={(v) => setStatus(selected.id, v as Lead["status"])} disabled={!!selected.opportunity_id}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Recebido em {format(new Date(selected.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                {selected.ip && <> · IP {selected.ip}</>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selected && profile?.company_id && (
        <ConvertLeadDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          lead={selected}
          companyId={profile.company_id}
          userId={profile.id}
          onConverted={handleConverted}
        />
      )}
    </div>
  );
}

interface ClientOption { id: string; name: string; cnpj: string | null }
interface BuyerOption { id: string; name: string; email: string | null }

function ConvertLeadDialog({
  open, onOpenChange, lead, companyId, userId, onConverted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead;
  companyId: string;
  userId: string;
  onConverted: (leadId: string, oppId: string) => void;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const [buyers, setBuyers] = useState<BuyerOption[]>([]);
  const [buyerId, setBuyerId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [oppType, setOppType] = useState("new_business");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when opening
  useEffect(() => {
    if (!open) return;
    const baseTitle = lead.type === "rfq"
      ? `RFQ pelo site — ${lead.name}`
      : `Contato pelo site — ${lead.name}`;
    setTitle(baseTitle);
    setOppType("new_business");
    setEstimatedValue("");
    const itemsTxt = lead.items?.length
      ? "\n\nItens de interesse:\n" + lead.items.map((it) => `- ${it.name}${it.qty ? ` (qtd ${it.qty})` : ""}${it.notes ? ` — ${it.notes}` : ""}`).join("\n")
      : "";
    setDescription(`Lead recebido pelo site (${lead.email}${lead.phone ? `, ${lead.phone}` : ""}).${lead.message ? `\n\n${lead.message}` : ""}${itemsTxt}`);
    setClientId(null);
    setBuyerId(null);
    setClientSearch("");
  }, [open, lead]);

  // Load clients (lightweight)
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name, cnpj")
        .eq("company_id", companyId)
        .order("name")
        .limit(2000);
      setClients((data ?? []) as ClientOption[]);
    })();
  }, [open, companyId]);

  // Load buyers when client selected
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
      })
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
    const { data: opp, error: oppErr } = await supabase
      .from("crm_opportunities")
      .insert({
        company_id: companyId,
        client_id: clientId,
        buyer_id: buyerId,
        assigned_to: userId,
        title: title.trim(),
        description,
        opportunity_type: oppType,
        stage: "qualification",
        estimated_value: estimatedValue ? Number(estimatedValue) : null,
        created_by: userId,
      })
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Converter em oportunidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {selectedClient?.name ?? "Selecionar cliente..."}
                  <ChevronsUpDown className="w-4 h-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="p-2 border-b">
                  <Input
                    autoFocus
                    placeholder="Buscar por nome ou CNPJ..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
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
                <div className="max-h-72 overflow-y-auto p-1">
                  {filteredClients.length === 0 ? (
                    <div className="py-4 px-2 text-sm space-y-2 text-center">
                      <div className="text-muted-foreground">Nenhum cliente com esse nome ou CNPJ.</div>
                      {clientSearch && (
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => setClientSearch("")}
                        >
                          Limpar busca e ver todos
                        </button>
                      )}
                      <Link to="/commercial/clients" target="_blank" className="block text-primary underline">
                        Cadastrar novo cliente →
                      </Link>
                    </div>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setClientId(c.id); setClientPickerOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left",
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
                {totalMatches > 100 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-t text-center">
                    Mostrando 100 de {totalMatches} — refine a busca
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {!selectedClient && lead.company_name && (
              <p className="text-xs text-muted-foreground">
                Sugestão do lead: <strong>{lead.company_name}</strong>.{" "}
                <Link to="/commercial/clients" target="_blank" className="text-primary underline">Cadastrar novo cliente</Link>
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

          <div className="grid grid-cols-2 gap-3">
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
              <Label>Valor estimado (R$)</Label>
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
