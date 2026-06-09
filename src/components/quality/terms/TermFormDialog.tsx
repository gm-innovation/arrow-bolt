import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQualityTerms, useQualityReferenceNorms, type QualityTerm } from "@/hooks/useQualityIsoStructure";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  term?: QualityTerm | null;
}

const empty = { term: "", definition: "", source_norm_id: "" };

export const TermFormDialog = ({ open, onOpenChange, term }: Props) => {
  const { create, update } = useQualityTerms();
  const { norms } = useQualityReferenceNorms();
  const [form, setForm] = useState<any>(empty);

  useEffect(() => {
    if (term) setForm({ term: term.term, definition: term.definition, source_norm_id: term.source_norm_id || "" });
    else setForm(empty);
  }, [term, open]);

  const save = async () => {
    const payload: any = { ...form, source_norm_id: form.source_norm_id || null };
    if (term) await update.mutateAsync({ id: term.id, ...payload });
    else await create.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{term ? "Editar Termo" : "Novo Termo"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Termo *</Label><Input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} /></div>
          <div className="space-y-1"><Label>Definição *</Label><Textarea rows={5} value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} /></div>
          <div className="space-y-1">
            <Label>Norma de origem</Label>
            <Select value={form.source_norm_id || "none"} onValueChange={(v) => setForm({ ...form, source_norm_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {norms.map((n) => <SelectItem key={n.id} value={n.id}>{n.code} — {n.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!form.term || !form.definition}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermFormDialog;
