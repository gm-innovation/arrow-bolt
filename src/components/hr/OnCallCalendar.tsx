import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OnCall } from '@/hooks/useOnCall';
import { cn } from '@/lib/utils';

interface Props {
  onCallList: OnCall[];
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

const OnCallCalendar = ({ onCallList, selectedMonth, onMonthChange }: Props) => {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getOnCallForDay = (day: Date) => onCallList.filter((oc) => isSameDay(new Date(oc.on_call_date), day));

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
            const dayOnCall = getOnCallForDay(day);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            return (
              <div key={day.toISOString()} className={cn('min-h-[80px] border rounded-md p-1', isWeekend && 'bg-muted/30')}>
                <div className="text-sm font-medium">{format(day, 'd')}</div>
                <div className="space-y-1">
                  {dayOnCall.map((oc) => (
                    <div key={oc.id} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-1 rounded truncate">
                      <Phone className="h-3 w-3" />
                      {oc.technician?.profiles?.full_name?.split(' ')[0]}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OnCallCalendar;
