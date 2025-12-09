import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Trash2, Umbrella, Stethoscope, GraduationCap, Calendar, Phone } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAbsences, getAbsenceTypeLabel, getAbsenceStatusLabel, Absence } from '@/hooks/useAbsences';
import { useOnCall } from '@/hooks/useOnCall';
import { Skeleton } from '@/components/ui/skeleton';
import NewAbsenceDialog from '@/components/hr/NewAbsenceDialog';
import NewOnCallDialog from '@/components/hr/NewOnCallDialog';
import UnifiedScheduleCalendar from '@/components/hr/UnifiedScheduleCalendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Absences = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAbsenceDialogOpen, setIsAbsenceDialogOpen] = useState(false);
  const [isOnCallDialogOpen, setIsOnCallDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'absence' | 'oncall' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [listTab, setListTab] = useState<'absences' | 'oncall'>('absences');

  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

  const { absences, isLoading: absencesLoading, refetch: refetchAbsences, deleteAbsence } = useAbsences({
    startDate: monthStart,
    endDate: monthEnd,
  });

  const { onCallList, isLoading: onCallLoading, refetch: refetchOnCall, deleteOnCall } = useOnCall({
    startDate: monthStart,
    endDate: monthEnd,
  });

  const isLoading = absencesLoading || onCallLoading;

  const filteredAbsences = absences.filter((absence) => {
    const matchesSearch = 
      absence.technician?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      absence.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || absence.absence_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || absence.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredOnCall = onCallList.filter((onCall) => {
    const matchesSearch = 
      onCall.technician?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      onCall.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleDelete = async () => {
    if (deleteId && deleteType) {
      if (deleteType === 'absence') {
        await deleteAbsence.mutateAsync(deleteId);
      } else {
        await deleteOnCall.mutateAsync(deleteId);
      }
      setDeleteId(null);
      setDeleteType(null);
    }
  };

  const getAbsenceIcon = (type: Absence['absence_type']) => {
    const icons = {
      vacation: Umbrella,
      day_off: Calendar,
      medical_exam: Stethoscope,
      training: GraduationCap,
      sick_leave: Stethoscope,
      other: Calendar,
    };
    return icons[type] || Calendar;
  };

  const getStatusBadgeVariant = (status: Absence['status']) => {
    const variants = {
      scheduled: 'secondary' as const,
      in_progress: 'default' as const,
      completed: 'outline' as const,
      cancelled: 'destructive' as const,
    };
    return variants[status] || 'secondary';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Escalas e Ausências</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Escalas e Ausências</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsAbsenceDialogOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Nova Ausência
          </Button>
          <Button onClick={() => setIsOnCallDialogOpen(true)}>
            <Phone className="h-4 w-4 mr-2" />
            Novo Sobreaviso
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Sub-tabs for List view */}
          <Tabs value={listTab} onValueChange={(v) => setListTab(v as 'absences' | 'oncall')}>
            <TabsList className="mb-4">
              <TabsTrigger value="absences">
                Ausências ({absences.length})
              </TabsTrigger>
              <TabsTrigger value="oncall">
                Sobreavisos ({onCallList.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="absences">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por técnico ou motivo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="vacation">Férias</SelectItem>
                        <SelectItem value="day_off">Folga</SelectItem>
                        <SelectItem value="medical_exam">Exame Médico</SelectItem>
                        <SelectItem value="training">Treinamento</SelectItem>
                        <SelectItem value="sick_leave">Atestado</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="scheduled">Agendada</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Técnico</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAbsences.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhuma ausência encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAbsences.map((absence) => {
                          const Icon = getAbsenceIcon(absence.absence_type);
                          return (
                            <TableRow key={absence.id}>
                              <TableCell className="font-medium">
                                {absence.technician?.profiles?.full_name || 'Técnico'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  {getAbsenceTypeLabel(absence.absence_type)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {format(new Date(absence.start_date), "dd/MM/yyyy", { locale: ptBR })}
                                {absence.start_date !== absence.end_date && (
                                  <> - {format(new Date(absence.end_date), "dd/MM/yyyy", { locale: ptBR })}</>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {absence.reason || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(absence.status)}>
                                  {getAbsenceStatusLabel(absence.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setDeleteId(absence.id);
                                    setDeleteType('absence');
                                  }}
                                  disabled={absence.status === 'completed'}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
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

            <TabsContent value="oncall">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por técnico ou observação..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Input
                      type="month"
                      value={format(selectedMonth, 'yyyy-MM')}
                      onChange={(e) => {
                        const [year, month] = e.target.value.split('-');
                        setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 15));
                      }}
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
                        <TableHead>Horário</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Observações</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOnCall.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhum sobreaviso encontrado para este período
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOnCall.map((onCall) => (
                          <TableRow key={onCall.id}>
                            <TableCell className="font-medium">
                              {onCall.technician?.profiles?.full_name || 'Técnico'}
                            </TableCell>
                            <TableCell>
                              {format(new Date(onCall.on_call_date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {onCall.start_time?.slice(0, 5)} - {onCall.end_time?.slice(0, 5)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {onCall.is_holiday && <Badge variant="secondary">Feriado</Badge>}
                                {onCall.is_weekend && <Badge variant="outline">FDS</Badge>}
                                {!onCall.is_holiday && !onCall.is_weekend && <Badge variant="default">Normal</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {onCall.notes || '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeleteId(onCall.id);
                                  setDeleteType('oncall');
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="calendar">
          <UnifiedScheduleCalendar
            absences={absences}
            onCallList={onCallList}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </TabsContent>
      </Tabs>

      <NewAbsenceDialog
        open={isAbsenceDialogOpen}
        onOpenChange={setIsAbsenceDialogOpen}
        onSuccess={() => {
          setIsAbsenceDialogOpen(false);
          refetchAbsences();
        }}
      />

      <NewOnCallDialog
        open={isOnCallDialogOpen}
        onOpenChange={setIsOnCallDialogOpen}
        onSuccess={() => {
          setIsOnCallDialogOpen(false);
          refetchOnCall();
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeleteType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'absence' 
                ? 'Tem certeza que deseja excluir esta ausência? Esta ação não pode ser desfeita.'
                : 'Tem certeza que deseja excluir este sobreaviso? O técnico será notificado sobre o cancelamento.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Absences;
