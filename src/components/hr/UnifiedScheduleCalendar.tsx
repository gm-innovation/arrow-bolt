import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Phone, Umbrella, Calendar, Stethoscope, GraduationCap, UserX } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWeekend, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Absence } from '@/hooks/useAbsences';
import { OnCall } from '@/hooks/useOnCall';

interface Props {
  absences: Absence[];
  onCallList: OnCall[];
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

const UnifiedScheduleCalendar = ({ absences, onCallList, selectedMonth, onMonthChange }: Props) => {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAbsencesForDay = (day: Date) => {
    return absences.filter(absence => {
      const start = new Date(absence.start_date);
      const end = new Date(absence.end_date);
      return day >= start && day <= end && absence.status !== 'cancelled';
    });
  };

  const getOnCallForDay = (day: Date) => {
    return onCallList.filter(onCall => {
      const onCallDate = new Date(onCall.on_call_date);
      return isSameDay(day, onCallDate);
    });
  };

  const getAbsenceColor = (type: Absence['absence_type']) => {
    const colors = {
      vacation: 'bg-blue-100 text-blue-800 border-blue-300',
      day_off: 'bg-green-100 text-green-800 border-green-300',
      medical_exam: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      training: 'bg-purple-100 text-purple-800 border-purple-300',
      sick_leave: 'bg-red-100 text-red-800 border-red-300',
      other: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[type] || colors.other;
  };

  const getAbsenceIcon = (type: Absence['absence_type']) => {
    const icons = {
      vacation: Umbrella,
      day_off: Calendar,
      medical_exam: Stethoscope,
      training: GraduationCap,
      sick_leave: Stethoscope,
      other: UserX,
    };
    return icons[type] || Calendar;
  };

  const prevMonth = () => {
    onMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 15));
  };

  const nextMonth = () => {
    onMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 15));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Legenda */}
        <div className="flex flex-wrap gap-2 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
            <span>Férias</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
            <span>Folga</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
            <span>Exame</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300" />
            <span>Treinamento</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
            <span>Atestado</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-orange-600" />
            <span>Sobreaviso</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {/* Empty cells for days before month start */}
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] bg-muted/20 rounded" />
          ))}
          
          {days.map((day) => {
            const dayAbsences = getAbsencesForDay(day);
            const dayOnCall = getOnCallForDay(day);
            const isWeekendDay = isWeekend(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] p-1 border rounded ${
                  isWeekendDay ? 'bg-muted/30' : 'bg-background'
                } ${!isSameMonth(day, selectedMonth) ? 'opacity-50' : ''}`}
              >
                <div className={`text-xs font-medium mb-1 ${isWeekendDay ? 'text-muted-foreground' : ''}`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-0.5 overflow-hidden">
                  {/* Ausências */}
                  {dayAbsences.slice(0, 2).map((absence) => {
                    const Icon = getAbsenceIcon(absence.absence_type);
                    return (
                      <div
                        key={absence.id}
                        className={`text-[10px] px-1 py-0.5 rounded border truncate flex items-center gap-1 ${getAbsenceColor(absence.absence_type)}`}
                        title={`${absence.technician?.profiles?.full_name} - ${absence.absence_type}`}
                      >
                        <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">
                          {absence.technician?.profiles?.full_name?.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                  
                  {/* Sobreavisos */}
                  {dayOnCall.slice(0, 2).map((onCall) => (
                    <div
                      key={onCall.id}
                      className="text-[10px] px-1 py-0.5 rounded border truncate flex items-center gap-1 bg-orange-100 text-orange-800 border-orange-300"
                      title={`Sobreaviso: ${onCall.technician?.profiles?.full_name}`}
                    >
                      <Phone className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">
                        {onCall.technician?.profiles?.full_name?.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                  
                  {/* Show count if more items */}
                  {(dayAbsences.length + dayOnCall.length > 4) && (
                    <div className="text-[9px] text-muted-foreground text-center">
                      +{dayAbsences.length + dayOnCall.length - 4} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedScheduleCalendar;
