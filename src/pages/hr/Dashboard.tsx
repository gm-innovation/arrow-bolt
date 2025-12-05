import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Clock, AlertTriangle, Umbrella, Stethoscope, GraduationCap, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useAbsences, getAbsenceTypeLabel } from '@/hooks/useAbsences';
import { useOnCall } from '@/hooks/useOnCall';

interface DashboardStats {
  totalTechnicians: number;
  asoExpiringSoon: number;
  absencesThisWeek: number;
  onCallToday: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTechnicians: 0,
    asoExpiringSoon: 0,
    absencesThisWeek: 0,
    onCallToday: 0,
  });
  const [expiringAsos, setExpiringAsos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { absences, isLoading: loadingAbsences } = useAbsences({ startDate: weekStart, endDate: weekEnd });
  const { onCallList, isLoading: loadingOnCall } = useOnCall({ 
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd')
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profile?.company_id) return;

        // Get technicians
        const { data: technicians } = await supabase
          .from('technicians')
          .select('*, profiles:profiles(full_name)')
          .eq('company_id', profile.company_id)
          .eq('active', true);

        const techList = technicians || [];

        // Check ASOs expiring in 30 days
        const thirtyDaysFromNow = addDays(today, 30);
        const expiring = techList.filter((t) => {
          if (!t.aso_valid_until) return false;
          const asoDate = new Date(t.aso_valid_until);
          return asoDate <= thirtyDaysFromNow;
        });

        setExpiringAsos(expiring);
        setStats({
          totalTechnicians: techList.length,
          asoExpiringSoon: expiring.length,
          absencesThisWeek: absences.filter(a => a.status !== 'cancelled').length,
          onCallToday: onCallList.length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, absences, onCallList]);

  // Filter absences happening today
  const todayAbsences = absences.filter((absence) => {
    const start = new Date(absence.start_date);
    const end = new Date(absence.end_date);
    return isWithinInterval(today, { start, end }) && absence.status !== 'cancelled';
  });

  if (loading || loadingAbsences || loadingOnCall) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard RH</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard RH</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTechnicians}</div>
            <p className="text-xs text-muted-foreground">Total cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ASOs Vencendo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.asoExpiringSoon}</div>
            <p className="text-xs text-muted-foreground">Próximos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausências na Semana</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.absencesThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(weekStart), "dd/MM", { locale: ptBR })} - {format(new Date(weekEnd), "dd/MM", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sobreaviso Hoje</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onCallToday}</div>
            <p className="text-xs text-muted-foreground">Técnicos escalados</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ASO Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ASOs com Vencimento Próximo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringAsos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum ASO vencendo nos próximos 30 dias</p>
            ) : (
              <div className="space-y-3">
                {expiringAsos.slice(0, 5).map((tech) => (
                  <div key={tech.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{tech.profiles?.full_name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">
                        Vence em: {format(new Date(tech.aso_valid_until), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant={new Date(tech.aso_valid_until) < today ? "destructive" : "secondary"}>
                      {new Date(tech.aso_valid_until) < today ? 'Vencido' : 'A vencer'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Absences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ausências Hoje ({format(today, "dd/MM", { locale: ptBR })})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAbsences.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma ausência programada para hoje</p>
            ) : (
              <div className="space-y-3">
                {todayAbsences.map((absence) => {
                  const Icon = {
                    vacation: Umbrella,
                    day_off: Calendar,
                    medical_exam: Stethoscope,
                    training: GraduationCap,
                    sick_leave: Stethoscope,
                    other: Calendar,
                  }[absence.absence_type] || Calendar;

                  return (
                    <div key={absence.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {absence.technician?.profiles?.full_name || 'Técnico'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getAbsenceTypeLabel(absence.absence_type)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {format(new Date(absence.start_date), "dd/MM")} - {format(new Date(absence.end_date), "dd/MM")}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* On-Call Today */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Técnicos de Sobreaviso Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onCallList.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum técnico de sobreaviso hoje</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {onCallList.map((onCall) => (
                  <div key={onCall.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">
                        {onCall.technician?.profiles?.full_name || 'Técnico'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {onCall.start_time?.slice(0, 5)} - {onCall.end_time?.slice(0, 5)}
                      </p>
                    </div>
                    {onCall.is_holiday && <Badge variant="secondary">Feriado</Badge>}
                    {onCall.is_weekend && <Badge variant="outline">FDS</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
