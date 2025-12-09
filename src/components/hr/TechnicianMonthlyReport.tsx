import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit } from 'lucide-react';
import { format, getDaysInMonth, isWeekend, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimeEntry, MeasurementData, VisitData } from '@/hooks/useHRTimeEntries';
import { cn } from '@/lib/utils';

interface AbsenceData {
  id: string;
  absence_type: 'vacation' | 'day_off' | 'medical_exam' | 'training' | 'sick_leave' | 'other';
  start_date: string;
  end_date: string;
}

interface OnCallData {
  id: string;
  on_call_date: string;
  is_weekend: boolean;
  is_holiday: boolean;
}

interface DayData {
  day: number;
  date: Date;
  isWeekend: boolean;
  isHoliday: boolean;
  vesselName: string | null;
  coordinatorName: string | null;
  orderNumber: string | null;
  bordo: number;
  viagem: number;
  sobreaviso: number;
  noite: number;
  entryId?: string;
  entry?: TimeEntry;
  absenceType?: AbsenceData['absence_type'];
  isOnCall?: boolean;
}

interface TechnicianMonthlyReportProps {
  technicianId: string;
  technicianName: string;
  month: Date;
  entries: TimeEntry[];
  holidays: Date[];
  measurementData?: MeasurementData;
  visitsData?: VisitData[];
  absences?: AbsenceData[];
  onCallData?: OnCallData[];
  onEditDay: (day: number, entry?: TimeEntry) => void;
}

const getAbsenceTypeLabel = (type: AbsenceData['absence_type']) => {
  const labels = {
    vacation: 'Férias',
    day_off: 'Folga',
    medical_exam: 'Ex. Médico',
    training: 'Treinamento',
    sick_leave: 'Atestado',
    other: 'Outro',
  };
  return labels[type] || type;
};

const getAbsenceBgColor = (type: AbsenceData['absence_type']) => {
  const colors = {
    vacation: 'bg-blue-100 dark:bg-blue-900/30',
    day_off: 'bg-green-100 dark:bg-green-900/30',
    medical_exam: 'bg-purple-100 dark:bg-purple-900/30',
    training: 'bg-indigo-100 dark:bg-indigo-900/30',
    sick_leave: 'bg-red-100 dark:bg-red-900/30',
    other: 'bg-gray-100 dark:bg-gray-900/30',
  };
  return colors[type] || '';
};

const TechnicianMonthlyReport = ({
  technicianId,
  technicianName,
  month,
  entries,
  holidays,
  measurementData,
  visitsData,
  absences = [],
  onCallData = [],
  onEditDay,
}: TechnicianMonthlyReportProps) => {
  const daysData = useMemo(() => {
    const daysInMonth = getDaysInMonth(month);
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const data: DayData[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayEntries = entries.filter((e) => {
        const entryDate = e.check_in_at ? new Date(e.check_in_at) : new Date(e.entry_date);
        return entryDate.getDate() === day && 
               entryDate.getMonth() === monthIndex && 
               entryDate.getFullYear() === year;
      });

      // Get visits for this technician on this day
      const dayVisits = (visitsData || []).filter(v => 
        v.technicianId === technicianId && v.visitDate === dateStr
      );

      const hasHoliday = holidays.some((h) => isSameDay(h, date));
      
      // Check for absence on this day
      const dayAbsence = absences.find(a => 
        dateStr >= a.start_date && dateStr <= a.end_date
      );

      // Check for on-call on this day
      const dayOnCall = onCallData.find(oc => oc.on_call_date === dateStr);
      
      // Aggregate data for the day
      let vesselName: string | null = null;
      let coordinatorName: string | null = null;
      let orderNumber: string | null = null;
      let bordo = 0;
      let viagem = 0;
      let sobreaviso = dayOnCall ? 1 : 0; // Auto-fill from on-call data
      let noite = 0;
      let mainEntry: TimeEntry | undefined;

      // First, check time entries
      dayEntries.forEach((entry) => {
        mainEntry = entry;
        
        // Get vessel - priority: manual vessel_name > direct service_order > task.service_order
        if (!vesselName) {
          if (entry.vessel_name) {
            vesselName = entry.vessel_name;
          } else if (entry.service_order?.vessel?.name) {
            vesselName = entry.service_order.vessel.name;
          } else if (entry.task?.service_order?.vessel?.name) {
            vesselName = entry.task.service_order.vessel.name;
          }
        }

        // Get coordinator - priority: manual coordinator_name > direct service_order > task.service_order
        if (!coordinatorName) {
          if (entry.coordinator_name) {
            coordinatorName = entry.coordinator_name;
          } else if (entry.service_order?.coordinator?.full_name) {
            coordinatorName = entry.service_order.coordinator.full_name;
          } else if (entry.task?.service_order?.coordinator?.full_name) {
            coordinatorName = entry.task.service_order.coordinator.full_name;
          }
        }
        
        if (!orderNumber) {
          if (entry.service_order?.order_number) {
            orderNumber = entry.service_order.order_number;
          } else if (entry.task?.service_order?.order_number) {
            orderNumber = entry.task.service_order.order_number;
          }
        }

        // BORDO: is_onboard flag OR has service_order_id OR has task with service_order
        if (entry.is_onboard || entry.service_order_id || entry.task?.service_order) {
          bordo = 1;
        }

        // VIAGEM: is_travel flag from time_entry
        if (entry.is_travel) {
          viagem = 1;
        }

        // SOBREAVISO: is_standby flag (checkbox) OR from on-call data
        if (entry.is_standby) {
          sobreaviso = 1;
        }

        // NOITE (pernoite): is_overnight flag from time_entry
        if (entry.is_overnight) {
          noite = 1;
        }
      });

      // Then, check visits data (from visit_technicians)
      if (dayVisits.length > 0) {
        const visit = dayVisits[0];
        
        // Use visit data if not already set from time_entries
        if (!vesselName && visit.vesselName) {
          vesselName = visit.vesselName;
        }
        if (!orderNumber && visit.orderNumber) {
          orderNumber = visit.orderNumber;
        }
        
        // If there's a visit, mark as BORDO
        bordo = 1;
      }

      // Check measurement data for travel and overnight (from coordinator closing)
      if (measurementData) {
        // Check if there's travel data for this date from measurements
        const hasMeasurementTravel = measurementData.travels.some(t => t.date === dateStr);
        if (hasMeasurementTravel) {
          viagem = 1;
        }

        // Check if there's overnight/hospedagem data for this date from measurements
        const hasMeasurementOvernight = measurementData.overnights.some(o => o.date === dateStr);
        if (hasMeasurementOvernight) {
          noite = 1;
        }
      }

      data.push({
        day,
        date,
        isWeekend: isWeekend(date),
        isHoliday: hasHoliday,
        vesselName,
        coordinatorName,
        orderNumber,
        bordo,
        viagem,
        sobreaviso,
        noite,
        entryId: mainEntry?.id,
        entry: mainEntry,
        absenceType: dayAbsence?.absence_type,
        isOnCall: !!dayOnCall,
      });
    }

    return data;
  }, [month, entries, holidays, measurementData, visitsData, technicianId, absences, onCallData]);

  const totals = useMemo(() => {
    return daysData.reduce(
      (acc, day) => ({
        bordo: acc.bordo + day.bordo,
        viagem: acc.viagem + day.viagem,
        sobreaviso: acc.sobreaviso + day.sobreaviso,
        noite: acc.noite + day.noite,
      }),
      { bordo: 0, viagem: 0, sobreaviso: 0, noite: 0 }
    );
  }, [daysData]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">DIA</TableHead>
            <TableHead>BARCO</TableHead>
            <TableHead>COORDENADOR</TableHead>
            <TableHead className="w-20">OS</TableHead>
            <TableHead className="w-16 text-center">BORDO</TableHead>
            <TableHead className="w-16 text-center">VIAGEM</TableHead>
            <TableHead className="w-16 text-center">SOB.</TableHead>
            <TableHead className="w-16 text-center">NOITE</TableHead>
            <TableHead className="w-24 text-center">SITUAÇÃO</TableHead>
            <TableHead className="w-12 text-center">AÇÕES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {daysData.map((dayData) => (
            <TableRow
              key={dayData.day}
              className={cn(
                dayData.absenceType && getAbsenceBgColor(dayData.absenceType),
                !dayData.absenceType && dayData.isWeekend && 'bg-rose-50 dark:bg-rose-950/20',
                !dayData.absenceType && dayData.isHoliday && 'bg-amber-50 dark:bg-amber-950/20',
                !dayData.absenceType && dayData.viagem > 0 && 'bg-emerald-50 dark:bg-emerald-950/20'
              )}
            >
              <TableCell className="text-center font-medium">
                {dayData.day}
              </TableCell>
              <TableCell className="text-sm">
                {dayData.vesselName || ''}
              </TableCell>
              <TableCell className="text-sm">
                {dayData.coordinatorName || ''}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {dayData.orderNumber || ''}
              </TableCell>
              <TableCell className="text-center">
                {dayData.bordo > 0 ? '1' : ''}
              </TableCell>
              <TableCell className="text-center">
                {dayData.viagem > 0 ? '1' : ''}
              </TableCell>
              <TableCell className="text-center">
                {dayData.sobreaviso > 0 ? '1' : ''}
              </TableCell>
              <TableCell className="text-center">
                {dayData.noite > 0 ? '1' : ''}
              </TableCell>
              <TableCell className="text-center">
                {dayData.absenceType ? (
                  <Badge variant="secondary" className="text-xs">
                    {getAbsenceTypeLabel(dayData.absenceType)}
                  </Badge>
                ) : dayData.isOnCall ? (
                  <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900/30">
                    📞 Sobreaviso
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => onEditDay(dayData.day, dayData.entry)}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {/* Totals row */}
          <TableRow className="bg-muted/50 font-semibold">
            <TableCell className="text-center">TOTAL</TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell className="text-center">{totals.bordo}</TableCell>
            <TableCell className="text-center">{totals.viagem}</TableCell>
            <TableCell className="text-center">{totals.sobreaviso}</TableCell>
            <TableCell className="text-center">{totals.noite}</TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default TechnicianMonthlyReport;