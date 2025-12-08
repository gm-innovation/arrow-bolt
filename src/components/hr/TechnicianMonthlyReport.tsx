import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { format, getDaysInMonth, isWeekend, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimeEntry } from '@/hooks/useHRTimeEntries';
import { cn } from '@/lib/utils';

interface DayData {
  day: number;
  date: Date;
  isWeekend: boolean;
  isHoliday: boolean;
  vesselName: string | null;
  orderNumber: string | null;
  bordo: number;
  viagem: number;
  sobreaviso: number;
  noite: number;
  entryId?: string;
  entry?: TimeEntry;
}

interface TechnicianMonthlyReportProps {
  technicianId: string;
  technicianName: string;
  month: Date;
  entries: TimeEntry[];
  holidays: Date[];
  onEditDay: (day: number, entry?: TimeEntry) => void;
}

const TechnicianMonthlyReport = ({
  technicianId,
  technicianName,
  month,
  entries,
  holidays,
  onEditDay,
}: TechnicianMonthlyReportProps) => {
  const daysData = useMemo(() => {
    const daysInMonth = getDaysInMonth(month);
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const data: DayData[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dayEntries = entries.filter((e) => {
        const entryDate = e.check_in_at ? new Date(e.check_in_at) : new Date(e.entry_date);
        return entryDate.getDate() === day && 
               entryDate.getMonth() === monthIndex && 
               entryDate.getFullYear() === year;
      });

      const hasHoliday = holidays.some((h) => isSameDay(h, date));
      
      // Aggregate data for the day
      let vesselName: string | null = null;
      let orderNumber: string | null = null;
      let bordo = 0;
      let viagem = 0;
      let sobreaviso = 0;
      let noite = 0;
      let mainEntry: TimeEntry | undefined;

      dayEntries.forEach((entry) => {
        mainEntry = entry;
        
        // Get vessel and order from service_order
        if (entry.service_order?.vessel?.name) {
          vesselName = entry.service_order.vessel.name;
        } else if (entry.task?.service_order?.vessel?.name) {
          vesselName = entry.task.service_order.vessel.name;
        }
        
        if (entry.service_order?.order_number) {
          orderNumber = entry.service_order.order_number;
        } else if (entry.task?.service_order?.order_number) {
          orderNumber = entry.task.service_order.order_number;
        }

        // BORDO: has service_order_id
        if (entry.service_order_id) {
          bordo = 1;
        }

        // VIAGEM: is_travel flag
        if (entry.is_travel) {
          viagem = 1;
        }

        // SOBREAVISO: has standby hours
        if ((entry.hours_standby || 0) > 0) {
          sobreaviso = 1;
        }

        // NOITE (pernoite): is_overnight flag
        if (entry.is_overnight) {
          noite = 1;
        }
      });

      data.push({
        day,
        date,
        isWeekend: isWeekend(date),
        isHoliday: hasHoliday,
        vesselName,
        orderNumber,
        bordo,
        viagem,
        sobreaviso,
        noite,
        entryId: mainEntry?.id,
        entry: mainEntry,
      });
    }

    return data;
  }, [month, entries, holidays]);

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
            <TableHead className="w-20">OS</TableHead>
            <TableHead className="w-16 text-center">BORDO</TableHead>
            <TableHead className="w-16 text-center">VIAGEM</TableHead>
            <TableHead className="w-16 text-center">SOB.</TableHead>
            <TableHead className="w-16 text-center">NOITE</TableHead>
            <TableHead className="w-12 text-center">AÇÕES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {daysData.map((dayData) => (
            <TableRow
              key={dayData.day}
              className={cn(
                dayData.isWeekend && 'bg-rose-50 dark:bg-rose-950/20',
                dayData.isHoliday && 'bg-amber-50 dark:bg-amber-950/20',
                dayData.viagem > 0 && 'bg-emerald-50 dark:bg-emerald-950/20'
              )}
            >
              <TableCell className="text-center font-medium">
                {dayData.day}
              </TableCell>
              <TableCell className="text-sm">
                {dayData.vesselName || ''}
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
            <TableCell className="text-center">{totals.bordo}</TableCell>
            <TableCell className="text-center">{totals.viagem}</TableCell>
            <TableCell className="text-center">{totals.sobreaviso}</TableCell>
            <TableCell className="text-center">{totals.noite}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default TechnicianMonthlyReport;
