import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const STAGES = [
  { value: "qualified", label: "Qualificado", color: "bg-blue-500/10 text-blue-700" },
  { value: "proposal", label: "Proposta", color: "bg-amber-500/10 text-amber-700" },
  { value: "negotiation", label: "Negociação", color: "bg-orange-500/10 text-orange-700" },
  { value: "closed_won", label: "Ganho", color: "bg-green-500/10 text-green-700" },
  { value: "closed_lost", label: "Perdido", color: "bg-red-500/10 text-red-700" },
];

interface Opp {
  id: string;
  title: string;
  description: string | null;
  stage: string;
  estimated_value: number | null;
  client_id: string;
  service_order_id: string | null;
  assigned_to: string | null;
  segment: "service" | "product" | "unknown";
  created_at: string;
  clients?: { name: string } | null;
}

const SEGMENT_LABEL: Record<string, string> = {
  service: "Serviço",
  product: "Comercial/Marketing",
  unknown: "Indefinido",
};

export default function AdminOpportunities() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Opp | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [filterSegment, setFilterSegment] = useState<string>("service_unknown");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_opportunities")
      .select("id, title, description, stage, estimated_value, client_id, service_order_id, assigned_to, segment, created_at, clients ( name )")
      .in("segment", ["service", "unknown", "product"])
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setItems((data ?? []) as unknown as Opp[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Opp[]> = {};
    for (const s of STAGES) map[s.value] = [];
    for (const o of items) {
      if (!map[o.stage]) map[o.stage] = [];
      map[o.stage].push(o);
    }
    return map;
  }, [items]);

  const moveStage = async (opp: Opp, stage: string) => {
    if (stage === "closed_lost") {
      setEdit(opp);
      return;
    }
    const updates: Record<string, unknown> = { stage };
    if (stage === "closed_won") updates.closed_at = new Date().toISOString();
    const { error } = await supabase.from("crm_opportunities").update(updates).eq("id", opp.id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.map((o) => (o.id === opp.id ? { ...o, stage } : o)));
    toast.success("Etapa atualizada");
  };

  const confirmLost = async () => {
    if (!edit) return;
    const { error } = await supabase
      .from("crm_opportunities")
      .update({ stage: "closed_lost", closed_at: new Date().toISOString(), loss_reason: lossReason || null })
      .eq("id", edit.id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.map((o) => (o.id === edit.id ? { ...o, stage: "closed_lost" } : o)));
    setEdit(null); setLossReason("");
  };

  const generateOS = (opp: Opp) => {
    // Encaminha para criação de OS com o client_id pré-selecionado via state.
    navigate("/admin/orders", {
      state: {
        openNewOrder: true,
        clientId: opp.client_id,
        opportunityId: opp.id,
        title: opp.title,
        description: opp.description,
      },
    });
  };

  if (loading) {
    return <div className="container mx-auto p-6 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Oportunidades de Serviço</h1>
        <p className="text-muted-foreground">Pipeline de pré-venda até virar OS.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {STAGES.map((s) => (
          <Card key={s.value} className="min-h-[200px]">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{s.label}</span>
                <Badge variant="outline">{grouped[s.value]?.length ?? 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              {(grouped[s.value] ?? []).length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">—</div>
              ) : grouped[s.value].map((o) => (
                <div key={o.id} className="rounded border p-2 space-y-1.5 bg-background">
                  <div className="text-sm font-medium line-clamp-2" title={o.title}>{o.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{o.clients?.name ?? "—"}</div>
                  {o.estimated_value != null && (
                    <div className="text-xs font-mono">
                      R$ {o.estimated_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground">
                    {format(new Date(o.created_at), "dd/MM/yy", { locale: ptBR })}
                  </div>
                  <div className="flex gap-1 pt-1">
                    <Select value={o.stage} onValueChange={(v) => moveStage(o, v)}>
                      <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGES.map((st) => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {o.stage === "closed_won" && !o.service_order_id && (
                    <Button size="sm" className="w-full h-7 text-xs" onClick={() => generateOS(o)}>
                      <ClipboardList className="w-3 h-3 mr-1" /> Gerar OS
                    </Button>
                  )}
                  {o.service_order_id && (
                    <Button asChild size="sm" variant="outline" className="w-full h-7 text-xs">
                      <Link to="/admin/orders">Ver OS <ArrowRight className="w-3 h-3 ml-1" /></Link>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(v) => { if (!v) { setEdit(null); setLossReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como perdida</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea value={lossReason} onChange={(e) => setLossReason(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEdit(null); setLossReason(""); }}>Cancelar</Button>
            <Button onClick={confirmLost}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
