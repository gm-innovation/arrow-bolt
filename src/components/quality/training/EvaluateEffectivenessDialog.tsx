import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQualityTrainingEffectiveness, type EffectivenessResult } from "@/hooks/useQualityTrainingEffectiveness";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trainingId: string;
  trainingTitle?: string;
}

const EvaluateEffectivenessDialog = ({ open, onOpenChange, trainingId, trainingTitle }: Props) => {
  const { create } = useQualityTrainingEffectiveness(trainingId);
  const [result, setResult] = useState<EffectivenessResult>("eficaz");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const submit = async () => {
    await create.mutateAsync({ training_id: trainingId, result, evaluation_date: date, notes });
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avaliar Eficácia do Treinamento</DialogTitle>
          {trainingTitle && <p className="text-sm text-muted-foreground">{trainingTitle}</p>}
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data da avaliação</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Resultado</Label>
              <Select value={result} onValueChange={(v) => setResult(v as EffectivenessResult)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eficaz">Eficaz</SelectItem>
                  <SelectItem value="parcial">Parcialmente eficaz</SelectItem>
                  <SelectItem value="nao_eficaz">Não eficaz</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Observações / evidências</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: avaliação prática aplicada em 10/05; colaborador demonstrou domínio do procedimento." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending}>Registrar avaliação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EvaluateEffectivenessDialog;
