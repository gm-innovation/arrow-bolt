
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logo: {
    width: 200,
    height: 80,
    objectFit: 'contain',
  },
  companyInfo: {
    width: '50%',
    textAlign: 'right',
  },
});

export const CompanyHeader = () => (
  <View style={styles.header}>
    <Image 
      src="/lovable-uploads/99776afb-688e-4743-927c-a8dfb9f3d1de.png"
      style={styles.logo}
    />
    <View style={styles.companyInfo}>
      <Text>Google Marine LTDA</Text>
      <Text>Rua Example, 123 - Cidade/UF</Text>
      <Text>CEP: 12345-678</Text>
      <Text>Tel: (11) 1234-5678</Text>
      <Text>CNPJ: 12.345.678/0001-90</Text>
    </View>
  </View>
);
