import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Absence, getAbsenceTypeLabel } from '@/hooks/useAbsences';
import { cn } from '@/lib/utils';

interface Props {
  absences: Absence[];
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

const AbsenceCalendar = ({ absences, selectedMonth, onMonthChange }: Props) => {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAbsencesForDay = (day: Date) => {
    return absences.filter((abs) => {
      const start = new Date(abs.start_date);
      const end = new Date(abs.end_date);
      return isWithinInterval(day, { start, end }) && abs.status !== 'cancelled';
    });
  };

  const getTypeColor = (type: Absence['absence_type']) => {
    const colors = {
      vacation: 'bg-blue-500',
      day_off: 'bg-green-500',
      medical_exam: 'bg-yellow-500',
      training: 'bg-purple-500',
      sick_leave: 'bg-red-500',
      other: 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => onMonthChange(subMonths(selectedMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => onMonthChange(addMonths(selectedMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
            <div key={d} className="text-center text-sm font-medium text-muted-foreground py-2">{d}</div>
          ))}
          {days.map((day) => {
            const dayAbsences = getAbsencesForDay(day);
            return (
              <div key={day.toISOString()} className={cn('min-h-[80px] border rounded-md p-1', !isSameMonth(day, selectedMonth) && 'opacity-50')}>
                <div className="text-sm font-medium">{format(day, 'd')}</div>
                <div className="space-y-1">
                  {dayAbsences.slice(0, 3).map((abs) => (
                    <div key={abs.id} className={cn('text-xs text-white px-1 rounded truncate', getTypeColor(abs.absence_type))} title={`${abs.technician?.profiles?.full_name} - ${getAbsenceTypeLabel(abs.absence_type)}`}>
                      {abs.technician?.profiles?.full_name?.split(' ')[0]}
                    </div>
                  ))}
                  {dayAbsences.length > 3 && <div className="text-xs text-muted-foreground">+{dayAbsences.length - 3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AbsenceCalendar;
