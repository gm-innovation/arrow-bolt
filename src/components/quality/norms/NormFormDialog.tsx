import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useQualityReferenceNorms, type QualityReferenceNorm } from "@/hooks/useQualityIsoStructure";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  norm?: QualityReferenceNorm | null;
}

const empty = {
  code: "", title: "", issuer: "", revision: "", valid_from: "", valid_until: "",
  next_review_due_at: "", review_frequency_months: 12, notes: "", is_active: true,
};

export const NormFormDialog = ({ open, onOpenChange, norm }: Props) => {
  const { create, update } = useQualityReferenceNorms();
  const [form, setForm] = useState<any>(empty);

  useEffect(() => {
    if (norm) {
      setForm({
        code: norm.code || "", title: norm.title || "", issuer: norm.issuer || "",
        revision: (norm as any).revision || "", valid_from: norm.valid_from || "",
        valid_until: norm.valid_until || "",
        next_review_due_at: (norm as any).next_review_due_at || "",
        review_frequency_months: (norm as any).review_frequency_months ?? 12,
        notes: norm.notes || "", is_active: norm.is_active ?? true,
      });
    } else setForm(empty);
  }, [norm, open]);

  const save = async () => {
    const payload: any = {
      ...form,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      next_review_due_at: form.next_review_due_at || null,
      issuer: form.issuer || null,
      revision: form.revision || null,
      notes: form.notes || null,
    };
    if (norm) await update.mutateAsync({ id: norm.id, ...payload });
    else await create.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{norm ? "Editar Norma" : "Nova Norma de Referência"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Código *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ISO 9001:2015" /></div>
          <div className="space-y-1"><Label>Emissor</Label><Input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="ABNT, ISO, ANP..." /></div>
          <div className="space-y-1 col-span-2"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-1"><Label>Revisão</Label><Input value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} placeholder="Ed. 2015" /></div>
          <div className="space-y-1"><Label>Periodicidade revisão (meses)</Label><Input type="number" value={form.review_frequency_months} onChange={(e) => setForm({ ...form, review_frequency_months: Number(e.target.value) })} /></div>
          <div className="space-y-1"><Label>Válida desde</Label><Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></div>
          <div className="space-y-1"><Label>Válida até</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
          <div className="space-y-1 col-span-2"><Label>Próxima revisão</Label><Input type="date" value={form.next_review_due_at} onChange={(e) => setForm({ ...form, next_review_due_at: e.target.value })} /></div>
          <div className="space-y-1 col-span-2"><Label>Notas</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex items-center gap-2 col-span-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Ativa</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!form.code || !form.title}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NormFormDialog;
