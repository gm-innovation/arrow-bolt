import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { TechnicianTimeEntry } from '../MeasurementForm';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  // Header with company info
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logo: {
    width: 150,
    height: 60,
    objectFit: 'contain',
  },
  companyInfo: {
    width: '55%',
    textAlign: 'right',
    fontSize: 8,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  companyDetail: {
    marginBottom: 2,
    color: '#333',
  },
  // Title section
  titleSection: {
    marginVertical: 15,
    textAlign: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  // OS Info line
  osInfoLine: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    gap: 30,
  },
  osInfoItem: {
    flexDirection: 'row',
  },
  osInfoLabel: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  osInfoValue: {
    color: '#333',
  },
  // Section
  section: {
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
    backgroundColor: '#f0f0f0',
    padding: 4,
  },
  subSectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 6,
    color: '#555',
    fontStyle: 'italic',
  },
  // Table styles
  table: {
    marginBottom: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    padding: 4,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableCell: {
    fontSize: 8,
  },
  legend: {
    fontSize: 7,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Totals section - right aligned
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    width: 200,
  },
  totalLabel: {
    fontSize: 10,
    textAlign: 'right',
    width: 120,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'right',
    width: 80,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 2,
    borderTopColor: '#333',
    width: 200,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
    width: 120,
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
    width: 80,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#999',
    fontSize: 7,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
  },
});

interface MeasurementPDFContentProps {
  measurement: any;
  serviceOrder: any;
  technicianTimeEntries: TechnicianTimeEntry[];
}

export const MeasurementPDFContent = ({ 
  measurement, 
  serviceOrder, 
  technicianTimeEntries 
}: MeasurementPDFContentProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Get company data from serviceOrder
  const company = serviceOrder?.company || {};
  const clientName = serviceOrder?.client?.name || 'N/A';
  const vesselName = serviceOrder?.vessel?.name || 'N/A';

  // Hour type labels
  const hourTypeLabels: Record<string, string> = {
    work_normal: 'HN',
    work_extra: 'HE',
    work_night: 'Noturna',
    standby: 'Espera',
  };

  // Work type labels
  const workTypeLabels: Record<string, string> = {
    trabalho: 'Trabalho',
    espera_deslocamento: 'Espera/Deslocamento',
    laboratorio: 'Laboratório',
  };

  // Role labels
  const roleLabels: Record<string, string> = {
    tecnico: 'Técnico',
    auxiliar: 'Auxiliar',
    engenheiro: 'Engenheiro',
    supervisor: 'Supervisor',
  };

  // Calculate totals including technician entries
  const technicianHoursTotal = technicianTimeEntries.reduce((sum, e) => sum + e.total_value, 0);
  const manualHoursTotal = (measurement.measurement_man_hours || []).reduce(
    (sum: number, e: any) => sum + (Number(e.total_value) || 0), 
    0
  );
  const totalManHours = technicianHoursTotal + manualHoursTotal;

  const hasManHours = technicianTimeEntries.length > 0 || (measurement.measurement_man_hours?.length > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Company Info */}
        <View style={styles.header}>
          <Image 
            src={company.logo_url || "/lovable-uploads/99776afb-688e-4743-927c-a8dfb9f3d1de.png"}
            style={styles.logo}
          />
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name || 'Empresa'}</Text>
            {company.email && <Text style={styles.companyDetail}>{company.email}</Text>}
            {company.cnpj && <Text style={styles.companyDetail}>CNPJ: {company.cnpj}</Text>}
            {company.address && <Text style={styles.companyDetail}>{company.address}</Text>}
            {company.cep && <Text style={styles.companyDetail}>CEP: {company.cep}</Text>}
            {company.phone && <Text style={styles.companyDetail}>Tel: {company.phone}</Text>}
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Medição Final</Text>
        </View>

        {/* OS Info Line */}
        <View style={styles.osInfoLine}>
          <View style={styles.osInfoItem}>
            <Text style={styles.osInfoLabel}>Ordem de Serviço:</Text>
            <Text style={styles.osInfoValue}>{serviceOrder?.order_number || 'N/A'}</Text>
          </View>
          <View style={styles.osInfoItem}>
            <Text style={styles.osInfoLabel}>Cliente:</Text>
            <Text style={styles.osInfoValue}>{clientName}</Text>
          </View>
          <View style={styles.osInfoItem}>
            <Text style={styles.osInfoLabel}>Embarcação:</Text>
            <Text style={styles.osInfoValue}>{vesselName}</Text>
          </View>
        </View>

        {/* Man Hours Table - Combined from technician entries and manual entries */}
        {hasManHours && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mão de Obra</Text>
            
            {/* Technician Time Entries (automatic) */}
            {technicianTimeEntries.length > 0 && (
              <>
                <Text style={styles.subSectionTitle}>Horas dos Técnicos (registros automáticos)</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, { width: '12%' }]}>Data</Text>
                    <Text style={[styles.tableCell, { width: '10%' }]}>Início</Text>
                    <Text style={[styles.tableCell, { width: '10%' }]}>Fim</Text>
                    <Text style={[styles.tableCell, { width: '8%' }]}>Total</Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>Técnico</Text>
                    <Text style={[styles.tableCell, { width: '10%' }]}>Função</Text>
                    <Text style={[styles.tableCell, { width: '10%' }]}>Tipo</Text>
                    <Text style={[styles.tableCell, { width: '10%' }]}>Taxa/h</Text>
                    <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' }]}>Valor</Text>
                  </View>
                  {technicianTimeEntries.map((entry, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { width: '12%' }]}>{formatDate(entry.entry_date)}</Text>
                      <Text style={[styles.tableCell, { width: '10%' }]}>{entry.start_time?.substring(0, 5)}</Text>
                      <Text style={[styles.tableCell, { width: '10%' }]}>{entry.end_time?.substring(0, 5)}</Text>
                      <Text style={[styles.tableCell, { width: '8%' }]}>{entry.total_hours.toFixed(2)}h</Text>
                      <Text style={[styles.tableCell, { width: '20%' }]}>{entry.technician_name}</Text>
                      <Text style={[styles.tableCell, { width: '10%' }]}>{roleLabels[entry.role_type]}</Text>
                      <Text style={[styles.tableCell, { width: '10%' }]}>{hourTypeLabels[entry.entry_type] || entry.entry_type}</Text>
                      <Text style={[styles.tableCell, { width: '10%' }]}>{formatCurrency(entry.hourly_rate)}</Text>
                      <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' }]}>
                        {formatCurrency(entry.total_value)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Manual Man Hour Entries */}
            {measurement.measurement_man_hours?.length > 0 && (
              <>
                <Text style={styles.subSectionTitle}>
                  {technicianTimeEntries.length > 0 ? 'Entradas Adicionais (coordenador)' : ''}
                </Text>
                <View style={styles.table}>
                  {technicianTimeEntries.length === 0 && (
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, { width: '10%' }]}>Data</Text>
                      <Text style={[styles.tableCell, { width: '10%' }]}>Início</Text>
                      <Text style={[styles.tableCell, { width: '10%' }]}>Fim</Text>
                      <Text style={[styles.tableCell, { width: '10%' }]}>Total HH</Text>
                      <Text style={[styles.tableCell, { width: '28%' }]}>Descrição</Text>
                      <Text style={[styles.tableCell, { width: '10%' }]}>Horário</Text>
                      <Text style={[styles.tableCell, { width: '10%' }]}>Valor HH</Text>
                      <Text style={[styles.tableCell, { width: '12%', textAlign: 'right' }]}>Valor Total</Text>
                    </View>
                  )}
                  {measurement.measurement_man_hours.map((entry: any, index: number) => {
                    const workTypeLabel = workTypeLabels[entry.work_type] || entry.work_type;
                    const roleLabel = roleLabels[entry.technician_role] || entry.technician_role;
                    const hourTypeLabel = hourTypeLabels[entry.hour_type] || entry.hour_type;
                    const description = `${workTypeLabel} + 1 ${roleLabel}`;
                    
                    return (
                      <View key={index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '10%' }]}>{formatDate(entry.entry_date)}</Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>{entry.start_time?.substring(0, 5)}</Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>{entry.end_time?.substring(0, 5)}</Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>{Number(entry.total_hours).toFixed(2)}</Text>
                        <Text style={[styles.tableCell, { width: '28%' }]}>{description}</Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>{hourTypeLabel}</Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>{formatCurrency(entry.hourly_rate)}</Text>
                        <Text style={[styles.tableCell, { width: '12%', textAlign: 'right' }]}>
                          {formatCurrency(entry.total_value)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
            
            <Text style={styles.legend}>HN = Hora Normal | HE = Hora Extra</Text>
          </View>
        )}

        {/* Materials Table */}
        {measurement.measurement_materials?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Materiais</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '50%' }]}>Material</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Quantidade</Text>
                <Text style={[styles.tableCell, { width: '17%' }]}>Valor Unitário</Text>
                <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>Valor Total</Text>
              </View>
              {measurement.measurement_materials.map((material: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '50%' }]}>{material.name}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{material.quantity}</Text>
                  <Text style={[styles.tableCell, { width: '17%' }]}>{formatCurrency(material.unit_value)}</Text>
                  <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>
                    {formatCurrency(material.total_value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Services Table */}
        {measurement.measurement_services?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Serviços</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '50%' }]}>Serviço</Text>
                <Text style={[styles.tableCell, { width: '30%' }]}>Descrição</Text>
                <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>Valor</Text>
              </View>
              {measurement.measurement_services.map((service: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '50%' }]}>{service.name}</Text>
                  <Text style={[styles.tableCell, { width: '30%' }]}>{service.description || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                    {formatCurrency(service.value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Travels Table */}
        {measurement.measurement_travels?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deslocamentos</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '25%' }]}>Origem</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>Destino</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Distância</Text>
                <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>Valor</Text>
              </View>
              {measurement.measurement_travels.map((travel: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '25%' }]}>{travel.from_city}</Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>{travel.to_city}</Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{travel.distance_km ? `${travel.distance_km} km` : '-'}</Text>
                  <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>
                    {formatCurrency(travel.total_value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Expenses Table */}
        {measurement.measurement_expenses?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Despesas</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '30%' }]}>Tipo</Text>
                <Text style={[styles.tableCell, { width: '40%' }]}>Descrição</Text>
                <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>Valor</Text>
              </View>
              {measurement.measurement_expenses.map((expense: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '30%' }]}>
                    {expense.expense_type === 'hospedagem' ? 'Hospedagem' : 'Alimentação'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '40%' }]}>{expense.description || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>
                    {formatCurrency(expense.total_value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Totals - Right Aligned */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>SubTotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(measurement.subtotal + technicianHoursTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ISS {measurement.tax_percentage}%:</Text>
            <Text style={styles.totalValue}>{formatCurrency(measurement.tax_amount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(measurement.total_amount + technicianHoursTotal)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Documento gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </Text>
      </Page>
    </Document>
  );
};
