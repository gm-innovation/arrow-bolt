import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Result = "pendente" | "eficaz" | "parcial" | "nao_eficaz";

const LABELS: Record<Result, string> = {
  pendente: "Pendente",
  eficaz: "Eficaz",
  parcial: "Parcialmente eficaz",
  nao_eficaz: "Não eficaz",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  changeId: string | null;
  initial?: { effectiveness_status?: string | null; effectiveness_notes?: string | null; resources_assessment?: string | null };
}

const EvaluateChangeEffectivenessDialog = ({ open, onOpenChange, changeId, initial }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [result, setResult] = useState<Result>((initial?.effectiveness_status as Result) || "pendente");
  const [notes, setNotes] = useState(initial?.effectiveness_notes ?? "");
  const [resources, setResources] = useState(initial?.resources_assessment ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!changeId) return;
    setSaving(true);
    const { error } = await supabase
      .from("quality_planned_changes" as any)
      .update({
        effectiveness_status: result,
        effectiveness_notes: notes || null,
        resources_assessment: resources || null,
        effectiveness_reviewed_at: new Date().toISOString(),
        effectiveness_reviewed_by: user?.id ?? null,
      })
      .eq("id", changeId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["quality_planned_changes"] });
    toast({ title: "Eficácia registrada" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avaliar eficácia da mudança</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Resultado</Label>
            <Select value={result} onValueChange={(v) => setResult(v as Result)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(LABELS) as Result[]).map((k) => (
                  <SelectItem key={k} value={k}>{LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações da avaliação</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <Label>Avaliação de recursos (§6.3 d)</Label>
            <Textarea
              rows={2}
              value={resources}
              onChange={(e) => setResources(e.target.value)}
              placeholder="Recursos humanos, financeiros ou infraestrutura necessários ou utilizados..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EvaluateChangeEffectivenessDialog;
