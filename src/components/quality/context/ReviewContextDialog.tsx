import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQualityOrgContext } from "@/hooks/useQualityOrgContext";

const ReviewContextDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { createSnapshot } = useQualityOrgContext();
  const [notes, setNotes] = useState("");

  const submit = () => {
    createSnapshot.mutate(notes, {
      onSuccess: () => { setNotes(""); onClose(); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar revisão do Contexto</DialogTitle>
          <DialogDescription>
            Será criado um snapshot imutável da configuração atual (escopo, questões internas/externas, SWOT e PESTAL) com sua aprovação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Notas da revisão</Label>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Resumo das mudanças, motivações ou decisões da reunião de análise crítica." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={createSnapshot.isPending}>Registrar Revisão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewContextDialog;
