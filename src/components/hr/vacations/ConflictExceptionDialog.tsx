import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useResolveVacationConflict } from "@/hooks/useVacations";
import { useAuth } from "@/contexts/AuthContext";

export function ConflictExceptionDialog({
  conflictId,
  trigger,
}: {
  conflictId: string;
  trigger: React.ReactNode;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const resolve = useResolveVacationConflict();

  const submit = async () => {
    if (!profile?.id || motivo.trim().length < 5) return;
    await resolve.mutateAsync({ id: conflictId, motivo: motivo.trim(), approver_id: profile.id });
    setOpen(false);
    setMotivo("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar exceção ao conflito</DialogTitle>
          <DialogDescription>
            O conflito continuará registrado no histórico, marcado como justificado por você.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>Justificativa *</Label>
          <Textarea
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: substituição garantida por técnico terceirizado no período."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={resolve.isPending || motivo.trim().length < 5}>
            {resolve.isPending ? "Salvando..." : "Salvar exceção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
