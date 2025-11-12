import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #333',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    borderBottom: '1 solid #ddd',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '40%',
    fontWeight: 'bold',
    color: '#555',
  },
  value: {
    width: '60%',
    color: '#333',
  },
  table: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 5,
    fontWeight: 'bold',
    borderBottom: '1 solid #333',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: '1 solid #e0e0e0',
  },
  tableCell: {
    fontSize: 9,
  },
  summary: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    border: '1 solid #ddd',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#555',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '2 solid #333',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    borderTop: '1 solid #ddd',
    paddingTop: 10,
  },
});

interface MeasurementPDFContentProps {
  measurement: any;
  serviceOrder: any;
}

export const MeasurementPDFContent = ({ measurement, serviceOrder }: MeasurementPDFContentProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const categoryLabels = {
    CATIVO: 'Cativo',
    LABORATORIO: 'Laboratório',
    EXTERNO: 'Externo',
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>MEDIÇÃO FINAL</Text>
          <Text style={styles.subtitle}>OS #{serviceOrder.order_number}</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Categoria:</Text>
            <Text style={styles.value}>{categoryLabels[measurement.category]}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Data de Criação:</Text>
            <Text style={styles.value}>{formatDate(measurement.created_at)}</Text>
          </View>
          {measurement.finalized_at && (
            <View style={styles.row}>
              <Text style={styles.label}>Data de Finalização:</Text>
              <Text style={styles.value}>{formatDate(measurement.finalized_at)}</Text>
            </View>
          )}
        </View>

        {/* Man Hours */}
        {measurement.measurement_man_hours?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Horas Homem</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '15%' }]}>Data</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Técnico</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Função</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Tipo Hora</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Horas</Text>
                <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>Valor</Text>
              </View>
              {measurement.measurement_man_hours.map((entry: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{formatDate(entry.entry_date)}</Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{entry.technician_name}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{entry.technician_role}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{entry.hour_type}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{entry.total_hours}h</Text>
                  <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                    {formatCurrency(entry.total_value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Materials */}
        {measurement.measurement_materials?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Materiais</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '40%' }]}>Material</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Qtd</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Valor Unit.</Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>Markup</Text>
                <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>Total</Text>
              </View>
              {measurement.measurement_materials.map((material: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '40%' }]}>{material.name}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{material.quantity}</Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{formatCurrency(material.unit_value)}</Text>
                  <Text style={[styles.tableCell, { width: '10%' }]}>{material.markup_percentage}%</Text>
                  <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
                    {formatCurrency(material.total_value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Services */}
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

        {/* Travels */}
        {measurement.measurement_travels?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deslocamentos</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '20%' }]}>Tipo</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Origem</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Destino</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Distância</Text>
                <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>Valor</Text>
              </View>
              {measurement.measurement_travels.map((travel: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{travel.travel_type}</Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{travel.from_city}</Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{travel.to_city}</Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{travel.distance_km ? `${travel.distance_km} km` : '-'}</Text>
                  <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                    {formatCurrency(travel.total_value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Expenses */}
        {measurement.measurement_expenses?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Despesas</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '25%' }]}>Tipo</Text>
                <Text style={[styles.tableCell, { width: '30%' }]}>Descrição</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Valor Base</Text>
                <Text style={[styles.tableCell, { width: '25%', textAlign: 'right' }]}>Total</Text>
              </View>
              {measurement.measurement_expenses.map((expense: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '25%' }]}>{expense.expense_type}</Text>
                  <Text style={[styles.tableCell, { width: '30%' }]}>{expense.description || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{formatCurrency(expense.base_value)}</Text>
                  <Text style={[styles.tableCell, { width: '25%', textAlign: 'right' }]}>
                    {formatCurrency(expense.total_value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Horas Homem:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(measurement.subtotal_man_hours || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Materiais:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(measurement.subtotal_materials || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Serviços:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(measurement.subtotal_services || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Deslocamentos:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(measurement.subtotal_travels || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Despesas:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(measurement.subtotal_expenses || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Geral:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(measurement.subtotal || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Impostos ({measurement.tax_percentage}%):</Text>
            <Text style={styles.summaryValue}>{formatCurrency(measurement.tax_amount || 0)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL GERAL:</Text>
            <Text style={styles.totalValue}>{formatCurrency(measurement.total_amount || 0)}</Text>
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
