import { useServiceVisits } from '@/hooks/useServiceVisits';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface VisitHistoryTimelineProps {
  serviceOrderId: string;
  currentVisitId?: string;
}

export const VisitHistoryTimeline = ({ serviceOrderId, currentVisitId }: VisitHistoryTimelineProps) => {
  const { visits, isLoading } = useServiceVisits(serviceOrderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'initial':
        return 'Inicial';
      case 'continuation':
        return 'Continuação';
      case 'return':
        return 'Retorno';
      default:
        return type;
    }
  };

  const getVisitTypeColor = (type: string) => {
    switch (type) {
      case 'initial':
        return 'bg-primary';
      case 'continuation':
        return 'bg-orange-500';
      case 'return':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg">Histórico de Visitas</h3>

      {visits.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma visita registrada</p>
      ) : (
        <div className="relative space-y-6">
          {/* Timeline line */}
          <div className="absolute left-4 top-3 bottom-3 w-px bg-border" />

          {visits.map((visit, index) => {
            const isLast = index === visits.length - 1;
            const isCurrent = visit.id === currentVisitId;

            return (
              <div key={visit.id} className="relative pl-10">
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute left-2.5 top-2.5 h-3 w-3 rounded-full border-2 border-background',
                    getVisitTypeColor(visit.visit_type),
                    isCurrent && 'ring-2 ring-primary ring-offset-2'
                  )}
                />

                <div
                  className={cn(
                    'space-y-2 p-4 rounded-lg border bg-card',
                    isCurrent && 'border-primary bg-primary/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Visita #{visit.visit_number}</span>
                        <Badge variant="outline" className="text-xs">
                          {getVisitTypeLabel(visit.visit_type)}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="default" className="text-xs">
                            Atual
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(visit.visit_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </div>

                  {visit.visit_technicians && visit.visit_technicians.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Users className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 text-muted-foreground">
                        {visit.visit_technicians.map((vt, idx) => (
                          <span key={idx} className={vt.is_lead ? 'font-medium' : ''}>
                            {vt.technicians.profiles.full_name}
                            {vt.is_lead && ' (Líder)'}
                            {idx < visit.visit_technicians!.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {visit.return_reason && (
                    <div className="flex items-start gap-2 text-sm bg-muted/50 p-2 rounded">
                      <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-xs text-muted-foreground mb-1">Motivo do Retorno:</p>
                        <p className="text-foreground">{visit.return_reason}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
