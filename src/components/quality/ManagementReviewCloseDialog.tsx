import { useMemo } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useManagementReview } from "@/hooks/useManagementReview";

interface Props {
  reviewId: string;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}

const ManagementReviewCloseDialog = ({ reviewId, open, onOpenChange }: Props) => {
  const { inputs, outputs, updateStatus } = useManagementReview(reviewId);

  const eligibleOutputs = useMemo(
    () => outputs.filter((o) => o.responsible_user_id && o.due_date && !o.linked_action_plan_id),
    [outputs]
  );
  const inputsToSnapshot = inputs.filter((i) => !i.is_snapshot).length;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Fechar reunião?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>O fechamento é <strong>atômico</strong> e executado em uma única transação. Se qualquer etapa falhar, nada será alterado.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>{inputsToSnapshot}</strong> entrada(s) serão marcadas como snapshot imutável.</li>
                <li><strong>{eligibleOutputs.length}</strong> plano(s) de ação serão gerados automaticamente.</li>
                <li>A próxima reunião será calculada com base no ciclo configurado.</li>
              </ul>
              <p className="text-muted-foreground">
                A ata pode ser gerada e anexada depois — não bloqueia o fechamento.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={async () => { await updateStatus.mutateAsync("closed"); onOpenChange(false); }}>
            Confirmar fechamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ManagementReviewCloseDialog;
