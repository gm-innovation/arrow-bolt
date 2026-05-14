import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Mail, Phone, Building2, Eye, ArrowRight, Sparkles, Plus, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_LABEL: Record<string, string> = {
  new: "Novo",
  reviewed: "Revisado",
  converted: "Convertido",
  discarded: "Descartado",
};

const SOURCE_LABEL: Record<string, string> = {
  site: "Site",
  site_rfq: "Site (RFQ)",
  site_contact: "Site (Contato)",
  whatsapp: "WhatsApp",
  phone: "Telefone",
  client_referral: "Indicação",
  import: "Importação",
  manual: "Manual",
};

const SEGMENT_LABEL: Record<string, string> = {
  service: "Serviço",
  product: "Produto",
  unknown: "—",
};

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
  source: string;
  segment: "service" | "product" | "unknown";
  assigned_to: string | null;
  created_at: string;
  opportunity_id: string | null;
  converted_at: string | null;
}

export default function AdminLeads() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterMine, setFilterMine] = useState<boolean>(false);

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

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("public_site_leads").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status atualizado");
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, status: status as Lead["status"] } : l)));
    setSelected((s) => (s && s.id === id ? { ...s, status: status as Lead["status"] } : s));
  };

  const setSegment = async (id: string, segment: string) => {
    const { error } = await supabase.from("public_site_leads").update({ segment }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, segment: segment as Lead["segment"] } : l)));
    setSelected((s) => (s && s.id === id ? { ...s, segment: segment as Lead["segment"] } : s));
  };

  const claim = async (id: string) => {
    if (!profile?.id) return;
    const { error } = await supabase
      .from("public_site_leads")
      .update({ assigned_to: profile.id })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Atribuído a você");
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, assigned_to: profile.id } : l)));
  };

  const visible = useMemo(() => {
    return items.filter((l) => {
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (filterSource !== "all" && l.source !== filterSource) return false;
      if (filterMine && l.assigned_to !== profile?.id) return false;
      return true;
    });
  }, [items, filterStatus, filterSource, filterMine, profile?.id]);

  const handleConverted = (leadId: string, opportunityId: string) => {
    setItems((prev) => prev.map((l) => l.id === leadId
      ? { ...l, opportunity_id: opportunityId, converted_at: new Date().toISOString(), status: "converted" }
      : l));
    setSelected(null);
    setConvertOpen(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Leads de Serviço</h1>
          <p className="text-muted-foreground">
            Solicitações de serviço vindas do site, WhatsApp, telefone ou indicações.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo lead manual
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Recebidos</CardTitle>
              <CardDescription>
                {visible.length} {visible.length === 1 ? "lead" : "leads"}.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Origem</Label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(SOURCE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant={filterMine ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterMine((v) => !v)}
                className="h-8"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1" /> Meus
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : visible.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum lead.</TableCell></TableRow>
              ) : visible.map((l) => (
                <TableRow key={l.id} className={l.status === "new" ? "font-medium" : ""}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell><Badge variant="outline">{SOURCE_LABEL[l.source] ?? l.source}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={l.segment === "service" ? "default" : l.segment === "product" ? "secondary" : "outline"}>
                      {SEGMENT_LABEL[l.segment]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate" title={l.name}>{l.name}</TableCell>
                  <TableCell className="text-sm max-w-[220px]">
                    <div className="flex items-center gap-1 truncate" title={l.email}><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{l.email}</span></div>
                    {l.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{l.phone}</div>}
                  </TableCell>
                  <TableCell className="text-sm max-w-[160px] truncate" title={l.company_name ?? ""}>{l.company_name ?? "—"}</TableCell>
                  <TableCell>
                    {l.opportunity_id ? (
                      <Badge variant="outline" className="border-primary text-primary">
                        Convertido <ArrowRight className="w-3 h-3 ml-1" />
                      </Badge>
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
            <DialogTitle>Lead — {selected?.name}</DialogTitle>
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
                  <div className="text-xs text-muted-foreground mb-1">Itens / serviços de interesse</div>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Segmento</Label>
                  <Select value={selected.segment} onValueChange={(v) => setSegment(selected.id, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SEGMENT_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={selected.status} onValueChange={(v) => setStatus(selected.id, v)} disabled={!!selected.opportunity_id}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selected.opportunity_id ? (
                <div className="p-3 border border-primary/30 bg-primary/5 rounded flex items-center justify-between">
                  <div>
                    <div className="font-medium">Lead convertido em oportunidade</div>
                    <div className="text-xs text-muted-foreground">
                      {selected.converted_at && `em ${format(new Date(selected.converted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/admin/opportunities">Ver oportunidade <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {selected.assigned_to !== profile?.id && (
                    <Button variant="outline" className="flex-1" onClick={() => claim(selected.id)}>
                      <UserCheck className="w-4 h-4 mr-2" /> Assumir
                    </Button>
                  )}
                  <Button className="flex-1" onClick={() => setConvertOpen(true)}>
                    <Sparkles className="w-4 h-4 mr-2" /> Converter em oportunidade
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Recebido em {format(new Date(selected.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
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

      {profile?.company_id && (
        <NewLeadDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          companyId={profile.company_id}
          userId={profile.id}
          onCreated={(lead) => { setItems((p) => [lead, ...p]); setNewOpen(false); }}
        />
      )}
    </div>
  );
}

/* ---------- New manual lead ---------- */

function NewLeadDialog({
  open, onOpenChange, companyId, userId, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  userId: string;
  onCreated: (lead: Lead) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [source, setSource] = useState("phone");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setEmail(""); setPhone(""); setCompanyName("");
      setSource("phone"); setMessage("");
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim()) { toast.error("Informe o nome"); return; }
    if (!email.trim() && !phone.trim()) { toast.error("Informe e-mail ou telefone"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("public_site_leads")
      .insert({
        company_id: companyId,
        type: "contact",
        name: name.trim(),
        email: email.trim() || `${Date.now()}@no-email.local`,
        phone: phone.trim() || null,
        company_name: companyName.trim() || null,
        message: message.trim() || null,
        items: [],
        source,
        segment: "service",
        status: "new",
        assigned_to: userId,
      })
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) { toast.error(error?.message ?? "Falha ao criar lead"); return; }
    toast.success("Lead criado");
    onCreated(data as unknown as Lead);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo lead manual</DialogTitle>
          <DialogDescription>Para contatos vindos por WhatsApp, telefone ou indicação.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Empresa</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Origem</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="client_referral">Indicação</SelectItem>
                  <SelectItem value="manual">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Descrição / demanda</Label>
              <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Criar lead"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Convert to service opportunity ---------- */

interface ClientOption { id: string; name: string; cnpj: string | null }

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
  const [clientSearch, setClientSearch] = useState("");

  const [title, setTitle] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(`Serviço — ${lead.name}${lead.company_name ? ` (${lead.company_name})` : ""}`);
    setEstimatedValue("");
    const itemsTxt = lead.items?.length
      ? "\n\nItens de interesse:\n" + lead.items.map((it) => `- ${it.name}${it.qty ? ` (qtd ${it.qty})` : ""}${it.notes ? ` — ${it.notes}` : ""}`).join("\n")
      : "";
    setDescription(`Lead (${SOURCE_LABEL[lead.source] ?? lead.source}) — ${lead.email}${lead.phone ? `, ${lead.phone}` : ""}.${lead.message ? `\n\n${lead.message}` : ""}${itemsTxt}`);
    setClientId(null);
    setClientSearch("");
  }, [open, lead]);

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

  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const filteredClients = useMemo(() => {
    const q = normalize(clientSearch.trim());
    if (!q) return clients.slice(0, 50);
    const qDigits = clientSearch.replace(/\D/g, "");
    return clients.filter((c) => {
      if (normalize(c.name).includes(q)) return true;
      if (qDigits && c.cnpj && c.cnpj.replace(/\D/g, "").includes(qDigits)) return true;
      return false;
    }).slice(0, 50);
  }, [clients, clientSearch]);

  const submit = async () => {
    if (!clientId) { toast.error("Selecione um cliente"); return; }
    if (!title.trim()) { toast.error("Informe um título"); return; }
    setSaving(true);
    const { data: opp, error: oppErr } = await supabase
      .from("crm_opportunities")
      .insert({
        company_id: companyId,
        client_id: clientId,
        assigned_to: userId,
        title: title.trim(),
        description,
        opportunity_type: "new_business",
        segment: "service",
        stage: "qualified",
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
      .update({ opportunity_id: opp.id, converted_at: new Date().toISOString(), status: "converted" })
      .eq("id", lead.id);
    setSaving(false);
    if (updErr) { toast.error("Oportunidade criada, mas falhou ao vincular: " + updErr.message); return; }
    toast.success("Lead convertido em oportunidade de serviço");
    onConverted(lead.id, opp.id);
  };

  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Converter em oportunidade de serviço</DialogTitle>
          <DialogDescription>Vincule a um cliente para criar a oportunidade.</DialogDescription>
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
                <Button type="button" variant="ghost" size="sm" onClick={() => setClientId(null)}>Trocar</Button>
              </div>
            ) : (
              <>
                <Input placeholder="Buscar por nome ou CNPJ..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
                <div className="max-h-48 overflow-y-auto border rounded">
                  {filteredClients.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      Nenhum cliente. <Link to="/admin/clients" target="_blank" className="text-primary underline">Cadastrar</Link>
                    </div>
                  ) : filteredClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClientId(c.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    >
                      <div className="font-medium">{c.name}</div>
                      {c.cnpj && <div className="text-xs text-muted-foreground">{c.cnpj}</div>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Valor estimado (R$)</Label>
            <Input type="number" step="0.01" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="0,00" />
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
