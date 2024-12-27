import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import { TaskReport } from './types';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    marginTop: 15,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
  },
  timeEntry: {
    marginBottom: 10,
  }
});

interface ReportPDFProps {
  report: TaskReport;
  taskId: string;
}

export const ReportPDFContent = ({ report, taskId }: ReportPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.title}>Relatório de Serviço #{taskId}</Text>
        
        <Text style={styles.subtitle}>Informações do Equipamento</Text>
        <Text style={styles.text}>Modelo: {report.modelInfo || 'N/A'}</Text>
        <Text style={styles.text}>Marca: {report.brandInfo || 'N/A'}</Text>
        <Text style={styles.text}>Número de Série: {report.serialNumber || 'N/A'}</Text>

        <Text style={styles.subtitle}>Detalhes do Serviço</Text>
        <Text style={styles.text}>Defeito Encontrado: {report.reportedIssue || 'N/A'}</Text>
        <Text style={styles.text}>Trabalhos Executados: {report.executedWork || 'N/A'}</Text>
        <Text style={styles.text}>Resultado: {report.result || 'N/A'}</Text>
        <Text style={styles.text}>Próximo Atendimento: {report.nextVisitWork || 'N/A'}</Text>
        <Text style={styles.text}>Material Fornecido: {report.suppliedMaterial || 'N/A'}</Text>

        <Text style={styles.subtitle}>Horários</Text>
        {(report.timeEntries || []).map((entry, index) => (
          <View key={index} style={styles.timeEntry}>
            <Text style={styles.text}>
              Data: {entry.date ? format(entry.date, 'dd/MM/yyyy') : 'N/A'}
            </Text>
            <Text style={styles.text}>Tipo: {entry.type || 'N/A'}</Text>
            <Text style={styles.text}>
              Horário: {entry.startTime || 'N/A'} - {entry.endTime || 'N/A'}
            </Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export const ReportPDFViewer = ({ report, taskId }: ReportPDFProps) => (
  <PDFViewer style={{ width: '100%', height: '600px' }}>
    <ReportPDFContent report={report} taskId={taskId} />
  </PDFViewer>
);