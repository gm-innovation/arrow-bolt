
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

interface CompanyData {
  name: string;
  address: string;
  cep: string;
  phone: string;
  cnpj: string;
  email: string;
  logoUrl?: string;
}

interface CompanyHeaderProps {
  company: CompanyData;
}

export const CompanyHeader = ({ company }: CompanyHeaderProps) => (
  <View style={styles.header}>
    <Image 
      src={company.logoUrl || "/lovable-uploads/99776afb-688e-4743-927c-a8dfb9f3d1de.png"}
      style={styles.logo}
    />
    <View style={styles.companyInfo}>
      <Text>{company.name}</Text>
      <Text>{company.address}</Text>
      {company.cep?.trim() && <Text>CEP: {company.cep.trim()}</Text>}
      {company.phone && <Text>Tel: {company.phone}</Text>}
      {company.cnpj && <Text>CNPJ: {company.cnpj}</Text>}
    </View>
  </View>
);
