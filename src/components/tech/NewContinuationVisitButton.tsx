import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useServiceVisits } from '@/hooks/useServiceVisits';
import { CalendarIcon, Plus } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NewContinuationVisitButtonProps {
  serviceOrderId: string;
}

export const NewContinuationVisitButton = ({ serviceOrderId }: NewContinuationVisitButtonProps) => {
  const { createContinuationVisit, isCreatingContinuation } = useServiceVisits(serviceOrderId);
  const [date, setDate] = useState<Date>(addDays(new Date(), 1));
  const [open, setOpen] = useState(false);

  const handleCreateVisit = () => {
    createContinuationVisit({
      serviceOrderId,
      visitDate: format(date, 'yyyy-MM-dd'),
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Continuar Trabalho
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Nova Visita de Continuação</h4>
            <p className="text-sm text-muted-foreground">
              Selecione a data da próxima visita
            </p>
          </div>

          <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleCreateVisit}
              disabled={isCreatingContinuation}
              className="flex-1"
            >
              Criar Visita
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
