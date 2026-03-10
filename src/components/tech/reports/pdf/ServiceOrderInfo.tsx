import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { format, parse, differenceInMinutes } from 'date-fns';

const styles = StyleSheet.create({
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
    backgroundColor: '#f0f0f0',
    padding: 6,
  },
  infoBlock: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingVertical: 2,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
  },
  value: {
    width: '70%',
  },
  timeEntriesTable: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    padding: 5,
    fontSize: 8,
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
  },
  tableCellDate: {
    width: '20%',
  },
  tableCellType: {
    width: '25%',
  },
  tableCellTime: {
    width: '15%',
  },
  tableCellHours: {
    width: '20%',
  },
});

type TimeEntry = {
  id: string;
  date: Date;
  type: 'work_normal' | 'work_extra' | 'work_night' | 'standby' | 'travel_normal' | 'travel_extra' | 'wait_normal' | 'wait_extra';
  startTime: string;
  endTime: string;
};

type ServiceOrderInfoProps = {
  orderNumber: string;
  clientReference?: string;
  date: Date;
  location: string;
  access: string;
  requester: {
    name: string;
    role: string;
  };
  supervisor: {
    name: string;
  };
  team: {
    leadTechnician: string;
    assistants: string[];
  };
  service: string;
  timeEntries?: TimeEntry[];
};

const timeTypeLabels: Record<string, string> = {
  work_normal: 'Trabalho HN',
  work_extra: 'Trabalho HE',
  travel_normal: 'Viagem HN',
  travel_extra: 'Viagem HE',
  wait_normal: 'Espera HN',
  wait_extra: 'Espera HE',
  work_night: 'Trabalho Noturno',
  standby: 'Espera',
};

const calculateHours = (startTime: string, endTime: string): string => {
  try {
    const start = parse(startTime, 'HH:mm', new Date());
    const end = parse(endTime, 'HH:mm', new Date());
    const minutes = differenceInMinutes(end, start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  } catch {
    return 'N/A';
  }
};

export const ServiceOrderInfo = ({
  orderNumber,
  clientReference,
  date,
  location,
  access,
  requester,
  supervisor,
  team,
  service,
  timeEntries = []
}: ServiceOrderInfoProps) => (
  <View style={styles.section}>
    <View style={styles.infoBlock} wrap={false}>
      <Text style={styles.sectionTitle}>Ordem de Serviço - {orderNumber}</Text>
      
      {clientReference && (
        <View style={styles.row}>
          <Text style={styles.label}>Ref. Cliente:</Text>
          <Text style={styles.value}>{clientReference}</Text>
        </View>
      )}
      <View style={styles.row}>
        <Text style={styles.label}>Data:</Text>
        <Text style={styles.value}>{format(date, 'dd/MM/yyyy')}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Hora:</Text>
        <Text style={styles.value}>
          {timeEntries && timeEntries.length > 0 
            ? timeEntries[0].startTime 
            : format(date, 'HH:mm')}
        </Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Localização:</Text>
        <Text style={styles.value}>{location}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Acesso:</Text>
        <Text style={styles.value}>{access}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Solicitante:</Text>
        <Text style={styles.value}>{`${requester.name} - ${requester.role}`}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Supervisor:</Text>
        <Text style={styles.value}>{supervisor.name}</Text>
      </View>
    </View>
    
    <View style={styles.infoBlock} wrap={false}>
      <Text style={styles.sectionTitle}>Equipe Técnica</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>Técnico Responsável:</Text>
        <Text style={styles.value}>{team.leadTechnician}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Auxiliares:</Text>
        <Text style={styles.value}>{team.assistants.join(', ')}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Serviço:</Text>
        <Text style={styles.value}>{service}</Text>
      </View>
    </View>
    
    {timeEntries && timeEntries.length > 0 && (
      <View style={styles.infoBlock} wrap={false}>
        <Text style={styles.sectionTitle}>Horários de Trabalho</Text>
        <View style={styles.timeEntriesTable}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellDate}>Data</Text>
            <Text style={styles.tableCellType}>Tipo</Text>
            <Text style={styles.tableCellTime}>Início</Text>
            <Text style={styles.tableCellTime}>Fim</Text>
            <Text style={styles.tableCellHours}>Horas</Text>
          </View>
          {timeEntries.map((entry, index) => (
            <View key={entry.id || index} style={styles.tableRow}>
              <Text style={styles.tableCellDate}>{format(entry.date, 'dd/MM/yyyy')}</Text>
              <Text style={styles.tableCellType}>{timeTypeLabels[entry.type] || entry.type}</Text>
              <Text style={styles.tableCellTime}>{entry.startTime}</Text>
              <Text style={styles.tableCellTime}>{entry.endTime}</Text>
              <Text style={styles.tableCellHours}>{calculateHours(entry.startTime, entry.endTime)}</Text>
            </View>
          ))}
        </View>
      </View>
    )}
  </View>
);