import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 0,
  },
  border: {
    margin: 15,
    border: '3pt solid #1a365d',
    borderRadius: 4,
    padding: 25,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerBorder: {
    border: '1pt solid #bee3f8',
    borderRadius: 2,
    padding: 20,
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 45,
    objectFit: 'contain',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 15,
  },
  certifyText: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 6,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 12,
    borderBottom: '1pt solid #e2e8f0',
    paddingBottom: 4,
    paddingHorizontal: 40,
  },
  courseLabel: {
    fontSize: 11,
    color: '#718096',
    marginBottom: 3,
  },
  courseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 10,
    textAlign: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 14,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 9,
    color: '#a0aec0',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 11,
    color: '#4a5568',
  },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 30,
  },
  signatureBlock: {
    alignItems: 'center',
    width: 200,
  },
  signatureLine: {
    width: '100%',
    borderBottom: '1pt dotted #4a5568',
    marginBottom: 4,
    height: 20,
  },
  signatureName: {
    fontSize: 10,
    color: '#2d3748',
    fontWeight: 'bold',
  },
  signatureRole: {
    fontSize: 8,
    color: '#718096',
    marginTop: 2,
  },
  footer: {
    width: '100%',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1pt solid #e2e8f0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#a0aec0',
  },
});

interface CertificatePDFProps {
  userName: string;
  courseTitle: string;
  issuedAt: string;
  certificateCode: string;
  companyName: string;
  companyLogoUrl?: string;
  durationMinutes?: number | null;
  hrSignerName?: string;
  directorSignerName?: string;
}

const formatDuration = (minutes: number | null | undefined) => {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h${mins}min`;
  if (hours) return `${hours}h`;
  return `${mins}min`;
};

const CertificatePDF = ({
  userName,
  courseTitle,
  issuedAt,
  certificateCode,
  companyName,
  companyLogoUrl,
  durationMinutes,
  hrSignerName,
  directorSignerName,
}: CertificatePDFProps) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.border}>
        <View style={styles.innerBorder}>
          {companyLogoUrl && (
            <Image src={companyLogoUrl} style={styles.logo} />
          )}
          <Text style={styles.title}>Certificado</Text>
          <Text style={styles.subtitle}>de Conclusão</Text>
          <Text style={styles.certifyText}>Certificamos que</Text>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.courseLabel}>concluiu com êxito o curso</Text>
          <Text style={styles.courseName}>{courseTitle}</Text>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>DATA DE EMISSÃO</Text>
              <Text style={styles.detailValue}>
                {new Date(issuedAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            {formatDuration(durationMinutes) && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>CARGA HORÁRIA</Text>
                <Text style={styles.detailValue}>{formatDuration(durationMinutes)}</Text>
              </View>
            )}
          </View>

          {/* Signatures */}
          <View style={styles.signaturesRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{hrSignerName || 'Responsável RH'}</Text>
              <Text style={styles.signatureRole}>Recursos Humanos</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{directorSignerName || 'Diretor(a)'}</Text>
              <Text style={styles.signatureRole}>Diretoria</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Código de validação: {certificateCode}</Text>
            <Text style={styles.footerText}>{companyName} — Universidade Corporativa</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);

export default CertificatePDF;
