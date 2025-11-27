import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';

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
});

type ServiceOrderInfoProps = {
  orderNumber: string;
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
};

export const ServiceOrderInfo = ({
  orderNumber,
  date,
  location,
  access,
  requester,
  supervisor,
  team,
  service
}: ServiceOrderInfoProps) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Ordem de Serviço - {orderNumber}</Text>
    
    <View style={styles.row}>
      <Text style={styles.label}>Data:</Text>
      <Text style={styles.value}>{format(date, 'dd/MM/yyyy')}</Text>
    </View>
    
    <View style={styles.row}>
      <Text style={styles.label}>Hora:</Text>
      <Text style={styles.value}>{format(date, 'HH:mm')}</Text>
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
);