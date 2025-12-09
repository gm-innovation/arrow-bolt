import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { format, getDaysInMonth, isWeekend, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimeEntry, MeasurementData, VisitData } from '@/hooks/useHRTimeEntries';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 2,
  },
  period: {
    fontSize: 10,
    color: '#666',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 20,
    alignItems: 'center',
  },
  tableRowWeekend: {
    backgroundColor: '#fee2e2',
  },
  tableRowHoliday: {
    backgroundColor: '#fef3c7',
  },
  tableRowTravel: {
    backgroundColor: '#d1fae5',
  },
  tableRowTotal: {
    backgroundColor: '#f3f4f6',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    color: '#fff',
    fontWeight: 'bold',
    minHeight: 24,
    alignItems: 'center',
  },
  colDay: {
    width: '8%',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  colVessel: {
    width: '30%',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  colOS: {
    width: '14%',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  colBordo: {
    width: '12%',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  colViagem: {
    width: '12%',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  colSob: {
    width: '12%',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  colNoite: {
    width: '12%',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  totalText: {
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
});

interface DayData {
  day: number;
  isWeekend: boolean;
  isHoliday: boolean;
  vesselName: string | null;
  orderNumber: string | null;
  bordo: number;
  viagem: number;
  sobreaviso: number;
  noite: number;
}

interface TechnicianReportPDFProps {
  technicianName: string;
  technicianId: string;
  month: Date;
  entries: TimeEntry[];
  holidays: Date[];
  measurementData?: MeasurementData;
  visitsData?: VisitData[];
}

const processData = (
  technicianId: string,
  month: Date,
  entries: TimeEntry[],
  holidays: Date[],
  measurementData?: MeasurementData,
  visitsData?: VisitData[]
): { days: DayData[], totals: { bordo: number; viagem: number; sobreaviso: number; noite: number } } => {
  const daysInMonth = getDaysInMonth(month);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const days: DayData[] = [];

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
    
    let vesselName: string | null = null;
    let orderNumber: string | null = null;
    let bordo = 0;
    let viagem = 0;
    let sobreaviso = 0;
    let noite = 0;

    // First, check time entries
    dayEntries.forEach((entry) => {
      if (!vesselName) {
        if (entry.service_order?.vessel?.name) {
          vesselName = entry.service_order.vessel.name;
        } else if (entry.task?.service_order?.vessel?.name) {
          vesselName = entry.task.service_order.vessel.name;
        }
      }
      
      if (!orderNumber) {
        if (entry.service_order?.order_number) {
          orderNumber = entry.service_order.order_number;
        } else if (entry.task?.service_order?.order_number) {
          orderNumber = entry.task.service_order.order_number;
        }
      }

      // BORDO: has service_order_id OR has task with service_order
      if (entry.service_order_id || entry.task?.service_order) bordo = 1;
      if (entry.is_travel) viagem = 1;
      if ((entry.hours_standby || 0) > 0) sobreaviso = 1;
      if (entry.is_overnight) noite = 1;
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
      if (measurementData.travels.some(t => t.date === dateStr)) {
        viagem = 1;
      }
      if (measurementData.overnights.some(o => o.date === dateStr)) {
        noite = 1;
      }
    }

    days.push({
      day,
      isWeekend: isWeekend(date),
      isHoliday: hasHoliday,
      vesselName,
      orderNumber,
      bordo,
      viagem,
      sobreaviso,
      noite,
    });
  }

  const totals = days.reduce(
    (acc, d) => ({
      bordo: acc.bordo + d.bordo,
      viagem: acc.viagem + d.viagem,
      sobreaviso: acc.sobreaviso + d.sobreaviso,
      noite: acc.noite + d.noite,
    }),
    { bordo: 0, viagem: 0, sobreaviso: 0, noite: 0 }
  );

  return { days, totals };
};

const TechnicianReportPDFDocument = ({ technicianName, technicianId, month, entries, holidays, measurementData, visitsData }: TechnicianReportPDFProps) => {
  const { days, totals } = processData(technicianId, month, entries, holidays, measurementData, visitsData);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Relatório de Ponto</Text>
          <Text style={styles.subtitle}>{technicianName}</Text>
          <Text style={styles.period}>
            {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
          </Text>
        </View>

        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colDay, styles.headerText]}>DIA</Text>
            <Text style={[styles.colVessel, styles.headerText]}>BARCO</Text>
            <Text style={[styles.colOS, styles.headerText]}>OS</Text>
            <Text style={[styles.colBordo, styles.headerText]}>BORDO</Text>
            <Text style={[styles.colViagem, styles.headerText]}>VIAGEM</Text>
            <Text style={[styles.colSob, styles.headerText]}>SOB.</Text>
            <Text style={[styles.colNoite, styles.headerText]}>NOITE</Text>
          </View>

          {/* Data rows */}
          {days.map((dayData) => (
            <View
              key={dayData.day}
              style={[
                styles.tableRow,
                dayData.isWeekend && styles.tableRowWeekend,
                dayData.isHoliday && styles.tableRowHoliday,
                dayData.viagem > 0 && styles.tableRowTravel,
              ]}
            >
              <Text style={styles.colDay}>{dayData.day}</Text>
              <Text style={styles.colVessel}>{dayData.vesselName || ''}</Text>
              <Text style={styles.colOS}>{dayData.orderNumber || ''}</Text>
              <Text style={styles.colBordo}>{dayData.bordo > 0 ? '1' : ''}</Text>
              <Text style={styles.colViagem}>{dayData.viagem > 0 ? '1' : ''}</Text>
              <Text style={styles.colSob}>{dayData.sobreaviso > 0 ? '1' : ''}</Text>
              <Text style={styles.colNoite}>{dayData.noite > 0 ? '1' : ''}</Text>
            </View>
          ))}

          {/* Totals row */}
          <View style={[styles.tableRow, styles.tableRowTotal]}>
            <Text style={[styles.colDay, styles.totalText]}>TOTAL</Text>
            <Text style={styles.colVessel}></Text>
            <Text style={styles.colOS}></Text>
            <Text style={[styles.colBordo, styles.totalText]}>{totals.bordo}</Text>
            <Text style={[styles.colViagem, styles.totalText]}>{totals.viagem}</Text>
            <Text style={[styles.colSob, styles.totalText]}>{totals.sobreaviso}</Text>
            <Text style={[styles.colNoite, styles.totalText]}>{totals.noite}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </Text>
      </Page>
    </Document>
  );
};

export const generateTechnicianPDF = async (
  technicianName: string,
  technicianId: string,
  month: Date,
  entries: TimeEntry[],
  holidays: Date[],
  measurementData?: MeasurementData,
  visitsData?: VisitData[]
): Promise<Blob> => {
  const blob = await pdf(
    <TechnicianReportPDFDocument
      technicianName={technicianName}
      technicianId={technicianId}
      month={month}
      entries={entries}
      holidays={holidays}
      measurementData={measurementData}
      visitsData={visitsData}
    />
  ).toBlob();
  return blob;
};

export const downloadTechnicianPDF = async (
  technicianName: string,
  technicianId: string,
  month: Date,
  entries: TimeEntry[],
  holidays: Date[],
  measurementData?: MeasurementData,
  visitsData?: VisitData[]
) => {
  const blob = await generateTechnicianPDF(technicianName, technicianId, month, entries, holidays, measurementData, visitsData);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PONTO_${technicianName.replace(/\s+/g, '_')}_${format(month, 'yyyy-MM')}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

export default TechnicianReportPDFDocument;
