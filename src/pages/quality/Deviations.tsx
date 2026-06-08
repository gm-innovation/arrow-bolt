import { useState } from "react";
import { useQualityDeviations, type DeviationOrigin, type DeviationStatus } from "@/hooks/useQualityDeviations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useQualitySettings } from "@/hooks/useQualitySettings";
import { useAuth } from "@/contexts/AuthContext";
import CreateImprovementFromButton from "@/components/quality/CreateImprovementFromButton";


const ORIGIN_LABELS: Record<DeviationOrigin, string> = {
  document: "Documento", process: "Processo", product: "Produto", ncr: "NCR", other: "Outro",
};
const STATUS_LABELS: Record<DeviationStatus, string> = {
  open: "Aberto", approved: "Aprovado", rejected: "Rejeitado", expired: "Expirado", closed: "Encerrado",
};
const STATUS_VARIANT: Record<DeviationStatus, "default" | "secondary" | "destructive" | "outline"> = {
  open: "secondary", approved: "default", rejected: "destructive", expired: "outline", closed: "outline",
};

export default function Deviations() {
  const { deviations, isLoading, create, update, remove } = useQualityDeviations();
  const { approvalScope, canDecideCentral } = useQualitySettings();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", justification: "",
    origin_type: "document" as DeviationOrigin, expires_at: "",
  });

  const requiresApproval = !!approvalScope?.deviation;

  const submit = async () => {
    if (!form.title || !form.description) return;
    await create.mutateAsync({
      title: form.title,
      description: form.description,
      justification: form.justification || null,
      origin_type: form.origin_type,
      expires_at: form.expires_at || null,
    });
    setOpen(false);
    setForm({ title: "", description: "", justification: "", origin_type: "document", expires_at: "" });
  };

  const decide = async (id: string, status: DeviationStatus) => {
    await update.mutateAsync({
      id,
      patch: { status, approved_by: user?.id ?? null, approved_at: new Date().toISOString() } as any,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Desvios</h2>
          <p className="text-sm text-muted-foreground">
            Registro de desvios formais com justificativa e validade.
            {requiresApproval ? " Aprovação central obrigatória." : " Aprovação central desativada nas configurações."}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Registrar Desvio</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : deviations.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum desvio registrado.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {deviations.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {d.title}
                    <Badge variant="outline">{ORIGIN_LABELS[d.origin_type]}</Badge>
                    <Badge variant={STATUS_VARIANT[d.status]}>{STATUS_LABELS[d.status]}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <CreateImprovementFromButton
                      originType="deviation"
                      originId={d.id}
                      defaultTitle={`Melhoria — Desvio: ${d.title}`}
                      defaultDescription={d.description ?? ""}
                      iconOnly
                      variant="ghost"
                    />
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{d.description}</p>
                {d.justification && <p className="text-muted-foreground"><b>Justificativa:</b> {d.justification}</p>}
                {d.expires_at && <p className="text-muted-foreground"><b>Válido até:</b> {new Date(d.expires_at).toLocaleDateString("pt-BR")}</p>}
                {requiresApproval && d.status === "open" && canDecideCentral && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => decide(d.id, "approved")}>Aprovar</Button>
                    <Button size="sm" variant="destructive" onClick={() => decide(d.id, "rejected")}>Rejeitar</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Desvio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Origem</Label>
              <Select value={form.origin_type} onValueChange={(v) => setForm({ ...form, origin_type: v as DeviationOrigin })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ORIGIN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Justificativa</Label>
              <Textarea value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} />
            </div>
            <div>
              <Label>Válido até</Label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={create.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
