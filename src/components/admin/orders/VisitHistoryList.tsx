import { useServiceVisits } from '@/hooks/useServiceVisits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Users, FileText } from 'lucide-react';
import { formatLocalDate } from '@/lib/utils';

interface VisitHistoryListProps {
  serviceOrderId: string;
}

export const VisitHistoryList = ({ serviceOrderId }: VisitHistoryListProps) => {
  const { visits, isLoading } = useServiceVisits(serviceOrderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getVisitTypeBadge = (type: string) => {
    switch (type) {
      case 'initial':
        return <Badge variant="default">Inicial</Badge>;
      case 'continuation':
        return <Badge className="bg-orange-500">Continuação</Badge>;
      case 'return':
        return <Badge variant="destructive">Retorno</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      in_progress: { label: 'Em Progresso', variant: 'default' },
      completed: { label: 'Concluído', variant: 'outline' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Histórico de Visitas</h3>

      {visits.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhuma visita registrada
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Card key={visit.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    Visita #{visit.visit_number}
                  </CardTitle>
                  <div className="flex gap-2">
                    {getVisitTypeBadge(visit.visit_type)}
                    {getStatusBadge(visit.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatLocalDate(visit.visit_date, "dd 'de' MMMM 'de' yyyy")}
                </div>

                {visit.visit_technicians && visit.visit_technicians.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      {visit.visit_technicians.map((vt, idx) => (
                        <span key={idx}>
                          {vt.technicians.profiles.full_name}
                          {vt.is_lead && ' (Líder)'}
                          {idx < visit.visit_technicians!.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {visit.return_reason && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="font-medium">Motivo do Retorno:</span>
                      <p className="text-muted-foreground mt-1">{visit.return_reason}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
