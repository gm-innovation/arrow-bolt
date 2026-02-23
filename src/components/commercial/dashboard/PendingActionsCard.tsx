import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface Props {
  pendingTasks: number;
  overdueRecurrences: number;
  openProposals: number;
}

export const PendingActionsCard = ({ pendingTasks, overdueRecurrences, openProposals }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-chart-4" />
          Ações Pendentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tarefas Pendentes</span>
          <span className="font-semibold">{pendingTasks}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Recorrências Atrasadas</span>
          <span className="font-semibold text-destructive">{overdueRecurrences}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Propostas Abertas</span>
          <span className="font-semibold">{openProposals}</span>
        </div>
      </CardContent>
    </Card>
  );
};
