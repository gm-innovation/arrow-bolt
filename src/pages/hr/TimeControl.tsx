import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Search, Download, Edit } from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHRTimeEntries, getEntryTypeLabel } from '@/hooks/useHRTimeEntries';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import TimeAdjustmentDialog from '@/components/hr/TimeAdjustmentDialog';
import * as XLSX from 'xlsx';

interface Technician {
  id: string;
  profiles?: {
    full_name: string;
  };
}

const TimeControl = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [selectedEntryForAdjustment, setSelectedEntryForAdjustment] = useState<any>(null);

  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

  const { timeEntries, adjustments, isLoading, refetch } = useHRTimeEntries({
    technicianId: selectedTechnician !== 'all' ? selectedTechnician : undefined,
    startDate: monthStart,
    endDate: monthEnd,
  });

  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      const { data } = await supabase
        .from('technicians')
        .select('id, profiles:profiles(full_name)')
        .eq('company_id', profile.company_id)
        .eq('active', true);

      setTechnicians(data || []);
    };

    fetchTechnicians();
  }, [user]);

  const calculateDuration = (start: string, end: string) => {
    const startDate = parseISO(`2000-01-01T${start}`);
    const endDate = parseISO(`2000-01-01T${end}`);
    const minutes = differenceInMinutes(endDate, startDate);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  };

  const filteredEntries = timeEntries.filter((entry) =>
    entry.technician?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.task?.service_order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals by type
  const totals = filteredEntries.reduce((acc, entry) => {
    const minutes = differenceInMinutes(
      parseISO(`2000-01-01T${entry.end_time}`),
      parseISO(`2000-01-01T${entry.start_time}`)
    );
    acc[entry.entry_type] = (acc[entry.entry_type] || 0) + minutes;
    acc.total = (acc.total || 0) + minutes;
    return acc;
  }, {} as Record<string, number>);

  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  };

  const handleExport = () => {
    const data = filteredEntries.map((entry) => ({
      'Técnico': entry.technician?.profiles?.full_name || '',
      'Data': format(new Date(entry.entry_date), 'dd/MM/yyyy'),
      'Tipo': getEntryTypeLabel(entry.entry_type),
      'Início': entry.start_time?.slice(0, 5),
      'Fim': entry.end_time?.slice(0, 5),
      'Duração': calculateDuration(entry.start_time, entry.end_time),
      'OS': entry.task?.service_order?.order_number || '',
      'Tarefa': entry.task?.title || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros de Ponto');
    XLSX.writeFile(wb, `ponto_${format(selectedMonth, 'yyyy-MM')}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Controle de Ponto</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Controle de Ponto</h1>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMinutes(totals.total || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">HN</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMinutes(totals.work_normal || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">HE</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMinutes(totals.work_extra || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Noturna</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMinutes(totals.work_night || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sobreaviso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMinutes(totals.standby || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Registros</TabsTrigger>
          <TabsTrigger value="adjustments">Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por técnico ou OS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os técnicos</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.profiles?.full_name || 'Sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="month"
                  value={format(selectedMonth, 'yyyy-MM')}
                  onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
                  className="w-[180px]"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>OS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.technician?.profiles?.full_name || 'Técnico'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.entry_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getEntryTypeLabel(entry.entry_type)}</Badge>
                        </TableCell>
                        <TableCell>{entry.start_time?.slice(0, 5)}</TableCell>
                        <TableCell>{entry.end_time?.slice(0, 5)}</TableCell>
                        <TableCell>{calculateDuration(entry.start_time, entry.end_time)}</TableCell>
                        <TableCell>{entry.task?.service_order?.order_number || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Histórico de Ajustes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Check-in Original</TableHead>
                    <TableHead>Check-in Ajustado</TableHead>
                    <TableHead>Check-out Original</TableHead>
                    <TableHead>Check-out Ajustado</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum ajuste encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    adjustments.map((adj) => (
                      <TableRow key={adj.id}>
                        <TableCell className="font-medium">
                          {adj.technician?.profiles?.full_name || 'Técnico'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(adj.adjustment_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{adj.original_check_in?.slice(0, 5) || '-'}</TableCell>
                        <TableCell>{adj.adjusted_check_in?.slice(0, 5) || '-'}</TableCell>
                        <TableCell>{adj.original_check_out?.slice(0, 5) || '-'}</TableCell>
                        <TableCell>{adj.adjusted_check_out?.slice(0, 5) || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{adj.adjustment_reason}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TimeAdjustmentDialog
        open={isAdjustmentDialogOpen}
        onOpenChange={setIsAdjustmentDialogOpen}
        entry={selectedEntryForAdjustment}
        technicians={technicians}
        onSuccess={() => {
          setIsAdjustmentDialogOpen(false);
          refetch();
        }}
      />
    </div>
  );
};

export default TimeControl;
