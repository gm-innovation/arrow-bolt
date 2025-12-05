import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addDays, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useAbsences, getAbsenceTypeLabel } from '@/hooks/useAbsences';
import * as XLSX from 'xlsx';

interface Technician {
  id: string;
  aso_valid_until?: string;
  certifications?: string[];
  profiles?: {
    full_name: string;
  };
}

const Reports = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<string>('hours');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

  const { absences, isLoading: loadingAbsences } = useAbsences({
    startDate: monthStart,
    endDate: monthEnd,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profile?.company_id) return;

        // Fetch technicians
        const { data: techs } = await supabase
          .from('technicians')
          .select('*, profiles:profiles(full_name)')
          .eq('company_id', profile.company_id)
          .eq('active', true);

        setTechnicians(techs || []);

        // Fetch time entries
        const { data: entries } = await supabase
          .from('time_entries')
          .select(`
            *,
            technician:technicians(
              id,
              company_id,
              profiles:profiles(full_name)
            )
          `)
          .gte('entry_date', monthStart)
          .lte('entry_date', monthEnd);

        // Filter by company
        const filtered = (entries || []).filter(
          (e: any) => e.technician?.company_id === profile.company_id
        );

        setTimeEntries(filtered);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedMonth]);

  const calculateHoursByTechnician = () => {
    const hours: Record<string, { name: string; normal: number; extra: number; night: number; standby: number; total: number }> = {};

    timeEntries.forEach((entry) => {
      const techId = entry.technician_id;
      const techName = entry.technician?.profiles?.full_name || 'Sem nome';

      if (!hours[techId]) {
        hours[techId] = { name: techName, normal: 0, extra: 0, night: 0, standby: 0, total: 0 };
      }

      const minutes = differenceInMinutes(
        parseISO(`2000-01-01T${entry.end_time}`),
        parseISO(`2000-01-01T${entry.start_time}`)
      );

      hours[techId].total += minutes;

      switch (entry.entry_type) {
        case 'work_normal':
          hours[techId].normal += minutes;
          break;
        case 'work_extra':
          hours[techId].extra += minutes;
          break;
        case 'work_night':
          hours[techId].night += minutes;
          break;
        case 'standby':
          hours[techId].standby += minutes;
          break;
      }
    });

    return Object.values(hours).sort((a, b) => b.total - a.total);
  };

  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  };

  const getAsoAlerts = () => {
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    return technicians.filter((tech) => {
      if (!tech.aso_valid_until) return true;
      return new Date(tech.aso_valid_until) <= thirtyDaysFromNow;
    }).sort((a, b) => {
      if (!a.aso_valid_until) return -1;
      if (!b.aso_valid_until) return 1;
      return new Date(a.aso_valid_until).getTime() - new Date(b.aso_valid_until).getTime();
    });
  };

  const handleExport = () => {
    let data: any[] = [];
    let filename = '';

    switch (reportType) {
      case 'hours':
        data = calculateHoursByTechnician().map((row) => ({
          'Técnico': row.name,
          'HN': formatMinutes(row.normal),
          'HE': formatMinutes(row.extra),
          'Noturna': formatMinutes(row.night),
          'Sobreaviso': formatMinutes(row.standby),
          'Total': formatMinutes(row.total),
        }));
        filename = `horas_${format(selectedMonth, 'yyyy-MM')}.xlsx`;
        break;

      case 'absences':
        data = absences.map((abs) => ({
          'Técnico': abs.technician?.profiles?.full_name || '',
          'Tipo': getAbsenceTypeLabel(abs.absence_type),
          'Início': format(new Date(abs.start_date), 'dd/MM/yyyy'),
          'Fim': format(new Date(abs.end_date), 'dd/MM/yyyy'),
          'Motivo': abs.reason || '',
          'Status': abs.status,
        }));
        filename = `ausencias_${format(selectedMonth, 'yyyy-MM')}.xlsx`;
        break;

      case 'aso':
        data = getAsoAlerts().map((tech) => ({
          'Técnico': tech.profiles?.full_name || '',
          'Validade ASO': tech.aso_valid_until 
            ? format(new Date(tech.aso_valid_until), 'dd/MM/yyyy')
            : 'Não informado',
          'Status': !tech.aso_valid_until
            ? 'Não informado'
            : new Date(tech.aso_valid_until) < new Date()
              ? 'Vencido'
              : 'A vencer',
        }));
        filename = `aso_vencimentos.xlsx`;
        break;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, filename);
  };

  if (loading || loadingAbsences) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Relatórios RH</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Relatórios RH</h1>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Tipo de relatório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horas Trabalhadas
                  </div>
                </SelectItem>
                <SelectItem value="absences">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Ausências
                  </div>
                </SelectItem>
                <SelectItem value="aso">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Vencimento de ASO
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {reportType !== 'aso' && (
              <Input
                type="month"
                value={format(selectedMonth, 'yyyy-MM')}
                onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
                className="w-[180px]"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {reportType === 'hours' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-right">HN</TableHead>
                  <TableHead className="text-right">HE</TableHead>
                  <TableHead className="text-right">Noturna</TableHead>
                  <TableHead className="text-right">Sobreaviso</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculateHoursByTechnician().map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">{formatMinutes(row.normal)}</TableCell>
                    <TableCell className="text-right">{formatMinutes(row.extra)}</TableCell>
                    <TableCell className="text-right">{formatMinutes(row.night)}</TableCell>
                    <TableCell className="text-right">{formatMinutes(row.standby)}</TableCell>
                    <TableCell className="text-right font-bold">{formatMinutes(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {reportType === 'absences' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {absences.map((abs) => (
                  <TableRow key={abs.id}>
                    <TableCell className="font-medium">
                      {abs.technician?.profiles?.full_name || 'Técnico'}
                    </TableCell>
                    <TableCell>{getAbsenceTypeLabel(abs.absence_type)}</TableCell>
                    <TableCell>
                      {format(new Date(abs.start_date), 'dd/MM/yyyy')} - {format(new Date(abs.end_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{abs.reason || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={abs.status === 'cancelled' ? 'destructive' : 'secondary'}>
                        {abs.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {reportType === 'aso' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Validade ASO</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getAsoAlerts().map((tech) => {
                  const today = new Date();
                  const isExpired = tech.aso_valid_until && new Date(tech.aso_valid_until) < today;
                  const isMissing = !tech.aso_valid_until;

                  return (
                    <TableRow key={tech.id}>
                      <TableCell className="font-medium">
                        {tech.profiles?.full_name || 'Sem nome'}
                      </TableCell>
                      <TableCell>
                        {tech.aso_valid_until
                          ? format(new Date(tech.aso_valid_until), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isExpired || isMissing ? 'destructive' : 'secondary'}>
                          {isMissing ? 'Não informado' : isExpired ? 'Vencido' : 'A vencer'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
