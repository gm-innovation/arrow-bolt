import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Phone } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isAfter, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTechnicianSchedule, getAbsenceTypeLabel, getAbsenceTypeIcon } from '@/hooks/useTechnicianSchedule';
import { Skeleton } from '@/components/ui/skeleton';

const MyScheduleCard = () => {
  const { absences, onCallSchedules, isLoading } = useTechnicianSchedule();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Minhas Escalas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  const today = startOfToday();
  
  // Filter upcoming absences (not cancelled, end_date >= today)
  const upcomingAbsences = absences.filter(a => 
    a.status !== 'cancelled' && isAfter(parseISO(a.end_date), today) || format(parseISO(a.end_date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  ).slice(0, 3);

  // Filter upcoming on-call schedules
  const upcomingOnCall = onCallSchedules.filter(oc => 
    isAfter(parseISO(oc.on_call_date), today) || format(parseISO(oc.on_call_date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  ).slice(0, 3);

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      if (isToday(start)) return 'Hoje';
      if (isTomorrow(start)) return 'Amanhã';
      return format(start, "dd/MM", { locale: ptBR });
    }
    
    return `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`;
  };

  const formatOnCallDate = (date: string) => {
    const parsed = parseISO(date);
    if (isToday(parsed)) return 'Hoje';
    if (isTomorrow(parsed)) return 'Amanhã';
    return format(parsed, "dd/MM (EEE)", { locale: ptBR });
  };

  const hasNoSchedules = upcomingAbsences.length === 0 && upcomingOnCall.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Minhas Escalas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasNoSchedules ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma escala ou ausência programada
          </p>
        ) : (
          <>
            {upcomingAbsences.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Ausências
                </h4>
                {upcomingAbsences.map((absence) => (
                  <div
                    key={absence.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getAbsenceTypeIcon(absence.absence_type)}</span>
                      <div>
                        <p className="text-sm font-medium">{getAbsenceTypeLabel(absence.absence_type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateRange(absence.start_date, absence.end_date)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {absence.status === 'scheduled' ? 'Agendado' : 
                       absence.status === 'in_progress' ? 'Em andamento' : 
                       absence.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {upcomingOnCall.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sobreavisos
                </h4>
                {upcomingOnCall.map((onCall) => (
                  <div
                    key={onCall.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">Sobreaviso</p>
                        <p className="text-xs text-muted-foreground">
                          {formatOnCallDate(onCall.on_call_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {onCall.is_weekend && (
                        <Badge variant="outline" className="text-xs">FDS</Badge>
                      )}
                      {onCall.is_holiday && (
                        <Badge variant="outline" className="text-xs">Feriado</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MyScheduleCard;
