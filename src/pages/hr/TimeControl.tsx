import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Plus, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHRTimeEntries, TimeEntry } from '@/hooks/useHRTimeEntries';
import { useHolidays } from '@/hooks/useHolidays';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
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
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
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

  const { timeEntries, measurementData, visitsData, isLoading, refetch, deleteTimeEntry } = useHRTimeEntries({
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

  const handleExport = () => {
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

    const data = timeEntries.map((entry) => ({
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

  const handleDeleteEntry = async () => {
    if (deleteEntryId) {
      await deleteTimeEntry.mutateAsync(deleteEntryId);
      setDeleteEntryId(null);
    }
  };

  // Calculate totals per technician
  const getTechnicianTotals = (techId: string) => {
    const techEntries = timeEntries.filter((e) => e.technician_id === techId);
    const techVisits = visitsData.filter((v) => v.technicianId === techId);
    const year = selectedMonth.getFullYear();
    const monthIndex = selectedMonth.getMonth();
    
    let bordo = 0;
    let viagem = 0;
    let sobreaviso = 0;
    let noite = 0;

    const daysInMonth = getDaysInMonth(selectedMonth);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayEntries = techEntries.filter((e) => {
        const entryDate = e.check_in_at ? new Date(e.check_in_at) : new Date(e.entry_date);
        return entryDate.getDate() === day && 
               entryDate.getMonth() === monthIndex && 
               entryDate.getFullYear() === year;
      });

      // Check if technician has a visit on this day
      const hasVisit = techVisits.some(v => v.visitDate === dateStr);

      let dayBordo = 0;
      let dayViagem = 0;
      let daySobreaviso = 0;
      let dayNoite = 0;

      dayEntries.forEach((entry) => {
        // BORDO: has service_order_id OR has task with service_order
        if (entry.service_order_id || entry.task?.service_order) dayBordo = 1;
        if (entry.is_travel) dayViagem = 1;
        if ((entry.hours_standby || 0) > 0) daySobreaviso = 1;
        if (entry.is_overnight) dayNoite = 1;
      });

      // If has visit, mark as BORDO
      if (hasVisit) {
        dayBordo = 1;
      }

      // Check measurement data for travel and overnight
      if (measurementData) {
        if (measurementData.travels.some(t => t.date === dateStr)) {
          dayViagem = 1;
        }
        if (measurementData.overnights.some(o => o.date === dateStr)) {
          dayNoite = 1;
        }
      }

      bordo += dayBordo;
      viagem += dayViagem;
      sobreaviso += daySobreaviso;
      noite += dayNoite;
    }

    return { bordo, viagem, sobreaviso, noite };
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
    const techVisits = visitsData.filter((v) => v.technicianId === tech.id);
    const holidayDates = holidays.map((h) => new Date(h.holiday_date));
    
    await downloadTechnicianPDF(
      tech.profiles?.full_name || 'Técnico',
      tech.id,
      selectedMonth,
      techEntries,
      holidayDates,
      measurementData,
      techVisits
    );
  };

  // Filter technicians by search term
  const filteredTechnicians = technicians.filter((tech) =>
    tech.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios de Ponto
            </CardTitle>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar técnico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger className="w-full md:w-[200px]">
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
                className="w-full md:w-[180px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Mês de referência: <span className="font-semibold">{format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}</span>
          </p>
          
          {filteredTechnicians.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum técnico encontrado
            </p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredTechnicians.map((tech) => {
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
                          measurementData={measurementData}
                          visitsData={visitsData}
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
