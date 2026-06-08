import { useState } from "react";
import { useQualityITSafeguards, type SafeguardKind, type SafeguardResult } from "@/hooks/useQualityITSafeguards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

const KIND_LABELS: Record<SafeguardKind, string> = {
  backup: "Backup", antivirus: "Antivírus", restore_test: "Teste de Restore", other: "Outro",
};
const RESULT_LABELS: Record<SafeguardResult, string> = { ok: "OK", fail: "Falha", partial: "Parcial" };
const RESULT_VARIANT: Record<SafeguardResult, "default" | "destructive" | "secondary"> = {
  ok: "default", fail: "destructive", partial: "secondary",
};

export default function ITBackup() {
  const { items, isLoading, create, remove, lastBackup, lastAntivirus, backupOverdue, antivirusOverdue } = useQualityITSafeguards();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    kind: "backup" as SafeguardKind, target: "", result: "ok" as SafeguardResult,
    evidence_url: "", notes: "",
  });

  const submit = async () => {
    await create.mutateAsync({
      kind: form.kind, target: form.target || null, result: form.result,
      evidence_url: form.evidence_url || null, notes: form.notes || null,
    });
    setOpen(false);
    setForm({ kind: "backup", target: "", result: "ok", evidence_url: "", notes: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">TI &amp; Backup</h2>
          <p className="text-sm text-muted-foreground">Controle auditável de salvaguardas de TI (backup, antivírus, restore).</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Registrar</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className={backupOverdue ? "border-destructive" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            {backupOverdue ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
            Último Backup
          </CardTitle></CardHeader>
          <CardContent className="text-sm">
            {lastBackup ? (
              <>
                <p>{new Date(lastBackup.performed_at).toLocaleString("pt-BR")}</p>
                <p className="text-muted-foreground">{lastBackup.target ?? "—"} · {RESULT_LABELS[lastBackup.result]}</p>
              </>
            ) : <p className="text-muted-foreground">Sem registros.</p>}
            {backupOverdue && <p className="text-xs text-destructive mt-1">Backup mensal pendente (mais de 30 dias).</p>}
          </CardContent>
        </Card>
        <Card className={antivirusOverdue ? "border-destructive" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            {antivirusOverdue ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
            Última Verificação Antivírus
          </CardTitle></CardHeader>
          <CardContent className="text-sm">
            {lastAntivirus ? (
              <>
                <p>{new Date(lastAntivirus.performed_at).toLocaleString("pt-BR")}</p>
                <p className="text-muted-foreground">{lastAntivirus.target ?? "—"} · {RESULT_LABELS[lastAntivirus.result]}</p>
              </>
            ) : <p className="text-muted-foreground">Sem registros.</p>}
            {antivirusOverdue && <p className="text-xs text-destructive mt-1">Verificação mensal pendente.</p>}
          </CardContent>
        </Card>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
        <div className="grid gap-2">
          {items.map((i) => (
            <Card key={i.id}>
              <CardContent className="py-3 flex items-center justify-between gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{KIND_LABELS[i.kind]}</Badge>
                    <Badge variant={RESULT_VARIANT[i.result]}>{RESULT_LABELS[i.result]}</Badge>
                    <span className="text-muted-foreground">{new Date(i.performed_at).toLocaleString("pt-BR")}</span>
                  </div>
                  {i.target && <p className="mt-1"><b>Alvo:</b> {i.target}</p>}
                  {i.notes && <p className="text-muted-foreground">{i.notes}</p>}
                  {i.evidence_url && <a className="text-primary underline" href={i.evidence_url} target="_blank" rel="noreferrer">Evidência</a>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar salvaguarda</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as SafeguardKind })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(KIND_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resultado</Label>
              <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v as SafeguardResult })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(RESULT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Alvo (servidor / sistema)</Label>
              <Input value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
            </div>
            <div>
              <Label>URL da evidência</Label>
              <Input value={form.evidence_url} onChange={(e) => setForm({ ...form, evidence_url: e.target.value })} placeholder="https://…" />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={create.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
