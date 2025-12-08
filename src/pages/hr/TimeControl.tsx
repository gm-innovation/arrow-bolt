import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Clock, Search, Download, Edit, Plus, Trash2, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, getDaysInMonth, isWeekend, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHRTimeEntries, TimeEntry } from '@/hooks/useHRTimeEntries';
import { useHolidays } from '@/hooks/useHolidays';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import TimeAdjustmentDialog from '@/components/hr/TimeAdjustmentDialog';
import EditTimeEntryDialog from '@/components/hr/EditTimeEntryDialog';
import NewTimeEntryDialog from '@/components/hr/NewTimeEntryDialog';
import TechnicianMonthlyReport from '@/components/hr/TechnicianMonthlyReport';
import EditDayEntryDialog from '@/components/hr/EditDayEntryDialog';
import { downloadTechnicianPDF } from '@/components/hr/TechnicianReportPDF';
import * as XLSX from 'xlsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  
  // For day entry editing
  const [isDayEditDialogOpen, setIsDayEditDialogOpen] = useState(false);
  const [selectedDayEdit, setSelectedDayEdit] = useState<{
    technicianId: string;
    technicianName: string;
    day: number;
    entry?: TimeEntry;
  } | null>(null);

  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

  const { timeEntries, adjustments, isLoading, refetch, deleteTimeEntry } = useHRTimeEntries({
    technicianId: selectedTechnician !== 'all' ? selectedTechnician : undefined,
    startDate: monthStart,
    endDate: monthEnd,
  });

  const { holidays } = useHolidays();

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

  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return '-';
    try {
      return format(new Date(dateTimeStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getOrderNumber = (entry: TimeEntry) => {
    return entry.service_order?.order_number || entry.task?.service_order?.order_number || '-';
  };

  const filteredEntries = timeEntries.filter((entry) =>
    entry.technician?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getOrderNumber(entry).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = filteredEntries.reduce((acc, entry) => {
    acc.hours_normal = (acc.hours_normal || 0) + (entry.hours_normal || 0);
    acc.hours_extra = (acc.hours_extra || 0) + (entry.hours_extra || 0);
    acc.hours_night = (acc.hours_night || 0) + (entry.hours_night || 0);
    acc.hours_standby = (acc.hours_standby || 0) + (entry.hours_standby || 0);
    acc.total = (acc.total || 0) + 
      (entry.hours_normal || 0) + 
      (entry.hours_extra || 0) + 
      (entry.hours_night || 0) + 
      (entry.hours_standby || 0);
    return acc;
  }, {} as Record<string, number>);

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const handleExport = () => {
    const data = filteredEntries.map((entry) => ({
      'Técnico': entry.technician?.profiles?.full_name || '',
      'Check-in': formatDateTime(entry.check_in_at),
      'Check-out': formatDateTime(entry.check_out_at),
      'OS': getOrderNumber(entry),
      'HN': entry.hours_normal || 0,
      'HE': entry.hours_extra || 0,
      'HNot': entry.hours_night || 0,
      'Sob': entry.hours_standby || 0,
      'Viagem': entry.is_travel ? 'Sim' : 'Não',
      'Pernoite': entry.is_overnight ? 'Sim' : 'Não',
      'Total': (entry.hours_normal || 0) + (entry.hours_extra || 0) + (entry.hours_night || 0) + (entry.hours_standby || 0),
      'Obs': entry.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros de Ponto');
    XLSX.writeFile(wb, `ponto_${format(selectedMonth, 'yyyy-MM')}.xlsx`);
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleDeleteEntry = async () => {
    if (deleteEntryId) {
      await deleteTimeEntry.mutateAsync(deleteEntryId);
      setDeleteEntryId(null);
    }
  };

  // Calculate totals per technician for reports tab
  const getTechnicianTotals = (techId: string) => {
    const techEntries = timeEntries.filter((e) => e.technician_id === techId);
    const year = selectedMonth.getFullYear();
    const monthIndex = selectedMonth.getMonth();
    
    let bordo = 0;
    let viagem = 0;
    let sobreaviso = 0;
    let noite = 0;

    const daysInMonth = getDaysInMonth(selectedMonth);
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEntries = techEntries.filter((e) => {
        const entryDate = e.check_in_at ? new Date(e.check_in_at) : new Date(e.entry_date);
        return entryDate.getDate() === day && 
               entryDate.getMonth() === monthIndex && 
               entryDate.getFullYear() === year;
      });

      dayEntries.forEach((entry) => {
        if (entry.service_order_id) bordo = bordo + 1;
        if (entry.is_travel) viagem = viagem + 1;
        if ((entry.hours_standby || 0) > 0) sobreaviso = sobreaviso + 1;
        if (entry.is_overnight) noite = noite + 1;
      });
    }

    // Deduplicate per day
    return {
      bordo: Math.min(bordo, daysInMonth),
      viagem: Math.min(viagem, daysInMonth),
      sobreaviso: Math.min(sobreaviso, daysInMonth),
      noite: Math.min(noite, daysInMonth),
    };
  };

  const handleEditDay = (techId: string, techName: string, day: number, entry?: TimeEntry) => {
    setSelectedDayEdit({
      technicianId: techId,
      technicianName: techName,
      day,
      entry,
    });
    setIsDayEditDialogOpen(true);
  };

  const handleExportPDF = async (tech: Technician) => {
    const techEntries = timeEntries.filter((e) => e.technician_id === tech.id);
    const holidayDates = holidays.map((h) => new Date(h.holiday_date));
    
    await downloadTechnicianPDF(
      tech.profiles?.full_name || 'Técnico',
      selectedMonth,
      techEntries,
      holidayDates
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Controle de Ponto</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const holidayDates = holidays.map((h) => new Date(h.holiday_date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Controle de Ponto</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsNewDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Registro
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatHours(totals.total || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">HN</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatHours(totals.hours_normal || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">HE</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatHours(totals.hours_extra || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Noturna</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatHours(totals.hours_night || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sobreaviso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatHours(totals.hours_standby || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Registros</TabsTrigger>
          <TabsTrigger value="reports">Relatórios Individuais</TabsTrigger>
          <TabsTrigger value="adjustments">Histórico de Ajustes</TabsTrigger>
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
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead className="text-center">HN</TableHead>
                    <TableHead className="text-center">HE</TableHead>
                    <TableHead className="text-center">HNot</TableHead>
                    <TableHead className="text-center">Sob</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((entry) => {
                      const entryTotal = (entry.hours_normal || 0) + (entry.hours_extra || 0) + 
                                         (entry.hours_night || 0) + (entry.hours_standby || 0);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {entry.technician?.profiles?.full_name || 'Técnico'}
                          </TableCell>
                          <TableCell>{formatDateTime(entry.check_in_at)}</TableCell>
                          <TableCell>{formatDateTime(entry.check_out_at)}</TableCell>
                          <TableCell className="font-mono">{getOrderNumber(entry)}</TableCell>
                          <TableCell className="text-center">{(entry.hours_normal || 0).toFixed(1)}</TableCell>
                          <TableCell className="text-center">{(entry.hours_extra || 0).toFixed(1)}</TableCell>
                          <TableCell className="text-center">{(entry.hours_night || 0).toFixed(1)}</TableCell>
                          <TableCell className="text-center">{(entry.hours_standby || 0).toFixed(1)}</TableCell>
                          <TableCell className="text-center font-semibold">{entryTotal.toFixed(1)}h</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleEditEntry(entry)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteEntryId(entry.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relatórios Individuais
                </CardTitle>
                <Input
                  type="month"
                  value={format(selectedMonth, 'yyyy-MM')}
                  onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
                  className="w-[180px]"
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Mês de referência: <span className="font-semibold">{format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}</span>
              </p>
              
              {technicians.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum técnico encontrado
                </p>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {technicians.map((tech) => {
                    const techEntries = timeEntries.filter((e) => e.technician_id === tech.id);
                    const techTotals = getTechnicianTotals(tech.id);

                    return (
                      <AccordionItem key={tech.id} value={tech.id} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="font-medium">{tech.profiles?.full_name || 'Sem nome'}</span>
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {techTotals.bordo} bordo
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {techTotals.viagem} viagem
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {techTotals.sobreaviso} sob.
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {techTotals.noite} pernoite
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-2 pb-4">
                            <TechnicianMonthlyReport
                              technicianId={tech.id}
                              technicianName={tech.profiles?.full_name || 'Técnico'}
                              month={selectedMonth}
                              entries={techEntries}
                              holidays={holidayDates}
                              onEditDay={(day, entry) => handleEditDay(tech.id, tech.profiles?.full_name || 'Técnico', day, entry)}
                            />
                            <div className="mt-4 flex justify-end">
                              <Button onClick={() => handleExportPDF(tech)} variant="outline">
                                <FileText className="h-4 w-4 mr-2" />
                                Exportar PDF
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
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
        entry={selectedEntry}
        technicians={technicians}
        onSuccess={() => {
          setIsAdjustmentDialogOpen(false);
          refetch();
        }}
      />

      <EditTimeEntryDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        entry={selectedEntry}
        onSuccess={() => {
          setIsEditDialogOpen(false);
          setSelectedEntry(null);
          refetch();
        }}
      />

      <NewTimeEntryDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        technicians={technicians}
        onSuccess={() => {
          setIsNewDialogOpen(false);
          refetch();
        }}
      />

      {selectedDayEdit && (
        <EditDayEntryDialog
          open={isDayEditDialogOpen}
          onOpenChange={(open) => {
            setIsDayEditDialogOpen(open);
            if (!open) setSelectedDayEdit(null);
          }}
          technicianId={selectedDayEdit.technicianId}
          technicianName={selectedDayEdit.technicianName}
          day={selectedDayEdit.day}
          month={selectedMonth}
          entry={selectedDayEdit.entry}
          onSuccess={() => {
            setIsDayEditDialogOpen(false);
            setSelectedDayEdit(null);
            refetch();
          }}
        />
      )}

      <AlertDialog open={!!deleteEntryId} onOpenChange={() => setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro de ponto será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TimeControl;
