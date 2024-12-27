import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
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
});

export const CompanyHeader = () => (
  <View style={styles.header}>
    <Image 
      src="/placeholder.svg"
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
);