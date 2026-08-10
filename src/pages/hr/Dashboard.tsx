import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';

import { Users, Calendar, Clock, AlertTriangle, Umbrella, Stethoscope, GraduationCap, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useAbsences, getAbsenceTypeLabel } from '@/hooks/useAbsences';
import { useOnCall } from '@/hooks/useOnCall';
import { formatLocalDate } from '@/lib/utils';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
import { statusFromExpiry, techDocLabel, pickCurrentDocs } from '@/lib/hr/documentStatus';


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

        // Documentos (ASO + certificações) vencidos ou a vencer em 30 dias.
        // Apenas a versão vigente de cada documento gera alerta.
        const techIds = techList.map((t: any) => t.id);
        const nameById: Record<string, string> = {};
        techList.forEach((t: any) => { nameById[t.id] = t.profiles?.full_name || 'Sem nome'; });

        const docsByTech: Record<string, any[]> = {};
        techList.forEach((t: any) => {
          docsByTech[t.id] = t.aso_valid_until
            ? [{ id: `aso-${t.id}`, document_type: 'aso', expiry_date: t.aso_valid_until }]
            : [];
        });

        if (techIds.length) {
          const { data: docs } = await supabase
            .from('technician_documents')
            .select('id, technician_id, document_type, certificate_name, file_name, expiry_date, issue_date, uploaded_at')
            .in('technician_id', techIds);
          (docs || []).forEach((d: any) => {
            if (!docsByTech[d.technician_id]) return;
            docsByTech[d.technician_id].push(d);
          });
        }

        const alerts: Array<{ id: string; techId: string; name: string; label: string; expiry: string; expired: boolean }> = [];
        Object.entries(docsByTech).forEach(([techId, docs]) => {
          const { current } = pickCurrentDocs(docs);
          current.forEach((d: any) => {
            if (!d.expiry_date) return;
            const { status } = statusFromExpiry(d.expiry_date);
            if (status === 'expired' || status === 'expiring') {
              alerts.push({
                id: `${techId}-${d.id}`,
                techId,
                name: nameById[techId] || 'Sem nome',
                label: techDocLabel(d),
                expiry: d.expiry_date,
                expired: status === 'expired',
              });
            }
          });
        });

        // Vencidos primeiro (mais antigos), depois os a vencer por proximidade.
        alerts.sort((a, b) =>
          a.expired === b.expired ? a.expiry.localeCompare(b.expiry) : a.expired ? -1 : 1
        );



        setExpiringAsos(alerts);
        setStats({
          totalTechnicians: techList.length,
          asoExpiringSoon: alerts.length,
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

  // Agrupa as pendências por colaborador, preservando a ordem (vencidos primeiro).
  const docAlertGroups = (() => {
    const map = new Map<string, { techId: string; name: string; items: any[] }>();
    expiringAsos.forEach((a) => {
      const key = a.techId || a.name;
      if (!map.has(key)) map.set(key, { techId: key, name: a.name, items: [] });
      map.get(key)!.items.push(a);
    });
    return Array.from(map.values());
  })();
  const expiredCount = expiringAsos.filter((a) => a.expired).length;
  const expiringCount = expiringAsos.length - expiredCount;

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
            <CardTitle className="text-sm font-medium">Documentos Irregulares</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.asoExpiringSoon}</div>
            <p className="text-xs text-muted-foreground">Vencidos ou nos próximos 30 dias</p>

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
              {formatLocalDate(weekStart, "dd/MM")} - {formatLocalDate(weekEnd, "dd/MM")}
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
        {/* Alertas de documentos (ASO + certificações) */}
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Documentos com Vencimento Próximo
              </CardTitle>
              {expiringAsos.length > 0 && (
                <Button asChild variant="outline" size="sm" className="flex-shrink-0">
                  <Link to="/hr/employees?filter=doc_expired">Ver todos</Link>
                </Button>
              )}
            </div>
            {expiringAsos.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {docAlertGroups.length} colaborador{docAlertGroups.length === 1 ? '' : 'es'} ·{' '}
                {expiringAsos.length} documento{expiringAsos.length === 1 ? '' : 's'}
                {' • '}
                {expiredCount} vencido{expiredCount === 1 ? '' : 's'} / {expiringCount} a vencer
              </p>
            )}
          </CardHeader>
          <CardContent>
            {expiringAsos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum documento vencido ou vencendo nos próximos 30 dias</p>
            ) : (
              <ScrollArea className="max-h-[420px] pr-3">
                <div className="space-y-3">
                  {docAlertGroups.map((group) => (
                    <div key={group.techId} className="p-3 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{group.name}</p>
                        <Badge
                          variant={group.items.some((i) => i.expired) ? 'destructive' : 'secondary'}
                          className="flex-shrink-0"
                        >
                          {group.items.some((i) => i.expired) ? 'Vencido' : 'A vencer'}
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {group.items.map((item) => (
                          <li key={item.id} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span
                              className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                item.expired ? 'bg-destructive' : 'bg-yellow-500'
                              }`}
                            />
                            <span className="min-w-0">
                              {item.label} • {item.expired ? 'venceu' : 'vence'} em {formatLocalDate(item.expiry)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </ScrollArea>
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
                        {formatLocalDate(absence.start_date, "dd/MM")} - {formatLocalDate(absence.end_date, "dd/MM")}
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

      <PushNotificationPrompt />
    </div>
  );
};

export default Dashboard;
