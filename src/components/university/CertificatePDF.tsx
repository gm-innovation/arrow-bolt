import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const COLORS = {
  navy: '#1a365d',
  blue: '#2b6cb0',
  gold: '#b7922b',
  goldLight: '#c5a44e',
  goldPale: '#f5e6b8',
  textDark: '#2d3748',
  textMid: '#4a5568',
  textLight: '#718096',
  textMuted: '#a0aec0',
  bgLight: '#f0f5fa',
  white: '#FFFFFF',
  borderLight: '#e2e8f0',
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: COLORS.white,
    padding: 0,
  },
  topStrip: {
    height: 28,
    backgroundColor: COLORS.navy,
    marginHorizontal: 12,
    marginTop: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  outerBorder: {
    marginHorizontal: 12,
    marginBottom: 12,
    border: `3pt solid ${COLORS.navy}`,
    borderTop: 'none',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    padding: 6,
    flex: 1,
  },
  goldBorder: {
    border: `1.5pt solid ${COLORS.goldLight}`,
    borderRadius: 2,
    padding: 4,
    flex: 1,
  },
  innerBorder: {
    border: `1pt solid ${COLORS.blue}`,
    borderRadius: 2,
    padding: 20,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 320,
    height: 120,
    objectFit: 'contain',
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.gold,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.navy,
    marginBottom: 14,
    letterSpacing: 2,
  },
  certifyText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
    paddingHorizontal: 40,
  },
  userNameLine: {
    width: 250,
    height: 1.5,
    backgroundColor: COLORS.goldLight,
    marginBottom: 12,
  },
  courseLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 3,
  },
  courseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.navy,
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
    color: COLORS.textMuted,
    marginBottom: 2,
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 11,
    color: COLORS.textMid,
  },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 30,
  },
  signatureBlock: {
    alignItems: 'center',
    width: 200,
  },
  signatureLine: {
    width: '100%',
    borderBottom: `1pt solid ${COLORS.goldLight}`,
    marginBottom: 4,
    height: 20,
  },
  signatureName: {
    fontSize: 10,
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  signatureRole: {
    fontSize: 8,
    color: COLORS.textLight,
    marginTop: 2,
  },
  footer: {
    width: '100%',
    marginTop: 6,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: COLORS.bgLight,
    borderRadius: 2,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: COLORS.textMuted,
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
  companyLogoUrl,
  durationMinutes,
  hrSignerName,
  directorSignerName,
}: CertificatePDFProps) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.topStrip} />
      <View style={styles.outerBorder}>
        <View style={styles.goldBorder}>
          <View style={styles.innerBorder}>
            {companyLogoUrl && (
              <Image src={companyLogoUrl} style={styles.logo} />
            )}
            <Text style={styles.title}>Certificado</Text>
            <Text style={styles.subtitle}>de Conclusão</Text>
            <Text style={styles.certifyText}>Certificamos que</Text>
            <Text style={styles.userName}>{userName}</Text>
            <View style={styles.userNameLine} />
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
            </View>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);

export default CertificatePDF;
