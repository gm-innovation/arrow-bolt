import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, Search, Trash2, Umbrella, Stethoscope, GraduationCap } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAbsences, getAbsenceTypeLabel, getAbsenceStatusLabel, Absence } from '@/hooks/useAbsences';
import { Skeleton } from '@/components/ui/skeleton';
import NewAbsenceDialog from '@/components/hr/NewAbsenceDialog';
import AbsenceCalendar from '@/components/hr/AbsenceCalendar';
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

  const { absences, isLoading, refetch, deleteAbsence } = useAbsences({
    startDate: monthStart,
    endDate: monthEnd,
  });

  const filteredAbsences = absences.filter((absence) => {
    const matchesSearch = 
      absence.technician?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      absence.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || absence.absence_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || absence.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAbsence.mutateAsync(deleteId);
      setDeleteId(null);
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
        <h1 className="text-3xl font-bold">Gestão de Ausências</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestão de Ausências</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Ausência
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
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
                              onClick={() => setDeleteId(absence.id)}
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

        <TabsContent value="calendar">
          <AbsenceCalendar
            absences={absences}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </TabsContent>
      </Tabs>

      <NewAbsenceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          setIsDialogOpen(false);
          refetch();
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ausência? Esta ação não pode ser desfeita.
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
