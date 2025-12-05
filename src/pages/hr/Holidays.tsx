import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Plus, Trash2, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHolidays } from '@/hooks/useHolidays';
import { Skeleton } from '@/components/ui/skeleton';
import NewHolidayDialog from '@/components/hr/NewHolidayDialog';
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

const Holidays = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { holidays, isLoading, refetch, deleteHoliday } = useHolidays();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteHoliday.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  // Group holidays by year
  const groupedHolidays = holidays.reduce((acc, holiday) => {
    const year = new Date(holiday.holiday_date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(holiday);
    return acc;
  }, {} as Record<number, typeof holidays>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Feriados</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Feriados</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Feriado
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Feriados Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum feriado cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Recorrência</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedHolidays)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([year, yearHolidays]) => (
                    <>
                      <TableRow key={`year-${year}`} className="bg-muted/50">
                        <TableCell colSpan={4} className="font-bold">
                          {year}
                        </TableCell>
                      </TableRow>
                      {yearHolidays.map((holiday) => (
                        <TableRow key={holiday.id}>
                          <TableCell>
                            {format(new Date(holiday.holiday_date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">{holiday.name}</TableCell>
                          <TableCell>
                            {holiday.is_recurring ? (
                              <Badge variant="secondary" className="gap-1">
                                <Repeat className="h-3 w-3" />
                                Anual
                              </Badge>
                            ) : (
                              <Badge variant="outline">Único</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(holiday.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewHolidayDialog
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
              Tem certeza que deseja excluir este feriado?
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

export default Holidays;
