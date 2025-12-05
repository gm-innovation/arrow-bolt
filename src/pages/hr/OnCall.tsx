import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, Trash2, Phone } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOnCall } from '@/hooks/useOnCall';
import { Skeleton } from '@/components/ui/skeleton';
import NewOnCallDialog from '@/components/hr/NewOnCallDialog';
import OnCallCalendar from '@/components/hr/OnCallCalendar';
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

const OnCall = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

  const { onCallList, isLoading, refetch, deleteOnCall } = useOnCall({
    startDate: monthStart,
    endDate: monthEnd,
  });

  const handleDelete = async () => {
    if (deleteId) {
      await deleteOnCall.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Escalas de Sobreaviso</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Escalas de Sobreaviso</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Sobreaviso
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
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Escalas de Sobreaviso - {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
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
                  {onCallList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum sobreaviso encontrado para este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    onCallList.map((onCall) => (
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
                            onClick={() => setDeleteId(onCall.id)}
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

        <TabsContent value="calendar">
          <OnCallCalendar
            onCallList={onCallList}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </TabsContent>
      </Tabs>

      <NewOnCallDialog
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
              Tem certeza que deseja excluir este sobreaviso? O técnico será notificado sobre o cancelamento.
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

export default OnCall;
