import { Document, Page, Text, View, StyleSheet, PDFViewer, Image } from '@react-pdf/renderer';
import { TaskReport } from './types';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 60,
  },
  companyInfo: {
    width: '50%',
    textAlign: 'right',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
  },
  value: {
    width: '70%',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  photoContainer: {
    width: '45%',
  },
  photo: {
    width: '100%',
    height: 150,
  },
  photoCaption: {
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
  },
  surveySection: {
    marginTop: 20,
    border: '1pt solid black',
    padding: 10,
  },
  surveyQuestion: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  checkbox: {
    width: 15,
    height: 15,
    border: '1pt solid black',
    marginLeft: 10,
  },
  commentsBox: {
    border: '1pt solid black',
    height: 100,
    marginTop: 10,
    marginBottom: 20,
  },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderTop: '1pt solid black',
    marginTop: 50,
    marginBottom: 5,
  },
  signatureLabel: {
    textAlign: 'center',
  },
});

interface ReportPDFProps {
  report: TaskReport;
  taskId: string;
}

export const ReportPDFContent = ({ report, taskId }: ReportPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Cabeçalho com Logo e Informações da Empresa */}
      <View style={styles.header}>
        <Image 
          src="/placeholder.svg"  // Substitua pelo caminho real do logo
          style={styles.logo}
        />
        <View style={styles.companyInfo}>
          <Text>Nome da Empresa LTDA</Text>
          <Text>Rua Example, 123 - Cidade/UF</Text>
          <Text>CEP: 12345-678</Text>
          <Text>Tel: (11) 1234-5678</Text>
          <Text>CNPJ: 12.345.678/0001-90</Text>
        </View>
      </View>

      <Text style={styles.title}>Relatório de Serviço #{taskId}</Text>

      {/* Informações da OS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações da Ordem de Serviço</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Cliente:</Text>
          <Text style={styles.value}>Nome do Cliente</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Data:</Text>
          <Text style={styles.value}>{format(new Date(), 'dd/MM/yyyy')}</Text>
        </View>
      </View>

      {/* Informações do Equipamento */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações do Equipamento</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Modelo:</Text>
          <Text style={styles.value}>{report.modelInfo || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Marca:</Text>
          <Text style={styles.value}>{report.brandInfo || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Número de Série:</Text>
          <Text style={styles.value}>{report.serialNumber || 'N/A'}</Text>
        </View>
      </View>

      {/* Detalhes do Serviço */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalhes do Serviço</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Defeito Encontrado:</Text>
          <Text style={styles.value}>{report.reportedIssue || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Trabalhos Executados:</Text>
          <Text style={styles.value}>{report.executedWork || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Resultado:</Text>
          <Text style={styles.value}>{report.result || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Próximo Atendimento:</Text>
          <Text style={styles.value}>{report.nextVisitWork || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Material Fornecido:</Text>
          <Text style={styles.value}>{report.suppliedMaterial || 'N/A'}</Text>
        </View>
      </View>

      {/* Fotos */}
      {report.photos && report.photos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotos do Serviço</Text>
          <View style={styles.photosGrid}>
            {report.photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image src={URL.createObjectURL(photo.file)} style={styles.photo} />
                <Text style={styles.photoCaption}>{photo.caption}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Horários */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Horários</Text>
        {(report.timeEntries || []).map((entry, index) => (
          <View key={index} style={styles.row}>
            <Text>
              {entry.date ? format(entry.date, 'dd/MM/yyyy') : 'N/A'} - {entry.type || 'N/A'} - 
              {entry.startTime || 'N/A'} até {entry.endTime || 'N/A'}
            </Text>
          </View>
        ))}
      </View>

      {/* Pesquisa de Satisfação */}
      <View style={styles.surveySection}>
        <Text style={styles.sectionTitle}>Pesquisa de Satisfação</Text>
        
        <View style={styles.surveyQuestion}>
          <Text>Satisfeito com o serviço prestado?</Text>
          <Text style={styles.checkbox}> </Text>
          <Text>Sim</Text>
          <Text style={styles.checkbox}> </Text>
          <Text>Não</Text>
        </View>

        <View style={styles.surveyQuestion}>
          <Text>Equipe cordial e educada?</Text>
          <Text style={styles.checkbox}> </Text>
          <Text>Sim</Text>
          <Text style={styles.checkbox}> </Text>
          <Text>Não</Text>
        </View>

        <Text>Comentários:</Text>
        <View style={styles.commentsBox} />

        {/* Assinaturas */}
        <View style={styles.signatures}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Assinatura do Cliente</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Assinatura do Técnico</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);

export const ReportPDFViewer = ({ report, taskId }: ReportPDFProps) => (
  <PDFViewer style={{ width: '100%', height: '600px' }}>
    <ReportPDFContent report={report} taskId={taskId} />
  </PDFViewer>
);