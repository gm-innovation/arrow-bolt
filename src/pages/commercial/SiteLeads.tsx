import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Mail, Phone, Building2, Eye } from "lucide-react";

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
}

const STATUS_LABEL: Record<Lead["status"], string> = {
  new: "Novo",
  reviewed: "Revisado",
  converted: "Convertido",
  discarded: "Descartado",
};

export default function SiteLeads() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);

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

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Leads do Site</h1>
        <p className="text-muted-foreground">
          Solicitações de proposta e contatos recebidos pelo site institucional.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recebidos</CardTitle>
          <CardDescription>Últimos 500 registros.</CardDescription>
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
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum lead recebido ainda.</TableCell></TableRow>
              ) : items.map((l) => (
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
                    <Badge variant={l.status === "new" ? "default" : "outline"}>{STATUS_LABEL[l.status]}</Badge>
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
              <div className="flex items-center gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Select value={selected.status} onValueChange={(v) => setStatus(selected.id, v as Lead["status"])}>
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
    </div>
  );
}
