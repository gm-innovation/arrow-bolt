import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Phone, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface Absence {
  id: string;
  technician_id: string;
  absence_type: string;
  start_date: string;
  end_date: string;
  technician?: {
    profiles?: {
      full_name: string;
    };
  };
}

interface OnCall {
  id: string;
  technician_id: string;
  on_call_date: string;
  is_weekend: boolean;
  is_holiday: boolean;
  technician?: {
    profiles?: {
      full_name: string;
    };
  };
}

const TeamAvailabilityCard = () => {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['team-availability', today],
    queryFn: async () => {
      if (!user) return { absences: [], onCall: [] };

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return { absences: [], onCall: [] };

      // Fetch today's absences
      const { data: absences } = await supabase
        .from('technician_absences')
        .select(`
          id,
          technician_id,
          absence_type,
          start_date,
          end_date,
          technician:technicians(
            profiles:profiles(full_name)
          )
        `)
        .eq('company_id', profile.company_id)
        .lte('start_date', today)
        .gte('end_date', today)
        .neq('status', 'cancelled');

      // Fetch today's on-call schedules
      const { data: onCall } = await supabase
        .from('technician_on_call')
        .select(`
          id,
          technician_id,
          on_call_date,
          is_weekend,
          is_holiday,
          technician:technicians(
            profiles:profiles(full_name)
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('on_call_date', today);

      return {
        absences: (absences || []) as Absence[],
        onCall: (onCall || []) as OnCall[],
      };
    },
    enabled: !!user,
  });

  const getAbsenceLabel = (type: string) => {
    const labels: Record<string, string> = {
      vacation: 'Férias',
      day_off: 'Folga',
      medical_exam: 'Exame Médico',
      training: 'Treinamento',
      sick_leave: 'Atestado',
      other: 'Ausente',
    };
    return labels[type] || type;
  };

  const getAbsenceColor = (type: string) => {
    const colors: Record<string, string> = {
      vacation: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      day_off: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      medical_exam: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      training: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      sick_leave: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    };
    return colors[type] || colors.other;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Disponibilidade da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  const absences = data?.absences || [];
  const onCall = data?.onCall || [];
  const hasData = absences.length > 0 || onCall.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Disponibilidade da Equipe - Hoje
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Todos os técnicos disponíveis hoje
          </p>
        ) : (
          <>
            {absences.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">Indisponíveis ({absences.length})</span>
                </div>
                <div className="space-y-1.5">
                  {absences.map((absence) => (
                    <div
                      key={absence.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50"
                    >
                      <span className="text-sm font-medium">
                        {absence.technician?.profiles?.full_name || 'Técnico'}
                      </span>
                      <Badge className={getAbsenceColor(absence.absence_type)}>
                        {getAbsenceLabel(absence.absence_type)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {onCall.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">De Sobreaviso ({onCall.length})</span>
                </div>
                <div className="space-y-1.5">
                  {onCall.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded bg-orange-50 dark:bg-orange-900/20"
                    >
                      <span className="text-sm font-medium">
                        {entry.technician?.profiles?.full_name || 'Técnico'}
                      </span>
                      <div className="flex gap-1">
                        {entry.is_weekend && (
                          <Badge variant="outline" className="text-xs">FDS</Badge>
                        )}
                        {entry.is_holiday && (
                          <Badge variant="outline" className="text-xs">Feriado</Badge>
                        )}
                        {!entry.is_weekend && !entry.is_holiday && (
                          <Badge variant="outline" className="text-xs">Disponível</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamAvailabilityCard;
