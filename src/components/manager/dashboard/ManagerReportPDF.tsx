import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "23%",
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statLabel: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  statSubtext: {
    fontSize: 7,
    color: "#94a3b8",
    marginTop: 2,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e40af",
    padding: 8,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    padding: 8,
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  tableCell: {
    fontSize: 9,
    color: "#374151",
  },
  col1: { width: "25%" },
  col2: { width: "15%" },
  col3: { width: "15%" },
  col4: { width: "15%" },
  col5: { width: "15%" },
  col6: { width: "15%" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  highlight: {
    color: "#16a34a",
    fontWeight: "bold",
  },
  highlightNegative: {
    color: "#dc2626",
    fontWeight: "bold",
  },
  trendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 4,
    marginBottom: 8,
  },
  forecastCard: {
    padding: 10,
    backgroundColor: "#faf5ff",
    borderRadius: 4,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#8b5cf6",
  },
  accuracyCard: {
    padding: 10,
    backgroundColor: "#f0f9ff",
    borderRadius: 4,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
  },
  badgeGreen: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  badgeYellow: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
  },
  badgeRed: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  summaryBox: {
    padding: 15,
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    marginTop: 10,
  },
  summaryText: {
    fontSize: 10,
    color: "#1e40af",
    lineHeight: 1.5,
  },
});

interface ManagerReportData {
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    coordinators: number;
    completionRate: number;
  };
  trends: {
    currentYearTotal: number;
    previousYearTotal: number;
    growthRate: number;
    monthlyData: Array<{
      month: string;
      currentYear: number;
      previousYear: number;
    }>;
  };
  forecasts?: {
    predictions: Array<{
      month: string;
      predicted_orders: number;
      predicted_completed: number;
      confidence: string;
    }>;
    trend_analysis: string;
    growth_rate: number;
    recommendations: string[];
  };
  accuracy?: {
    overallAccuracy: number;
    mapeOrders: number;
    accuracyRate: number;
    forecasts: Array<{
      forecast_month: string;
      predicted_orders: number;
      actual_orders: number;
      orderAccuracy: number;
    }>;
  };
  filters: {
    startDate?: Date;
    endDate?: Date;
    coordinatorId?: string;
    clientId?: string;
  };
  generatedAt: Date;
}

const ManagerReportDocument = ({ data }: { data: ManagerReportData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Relatorio Gerencial Consolidado</Text>
        <Text style={styles.subtitle}>
          Gerado em {format(data.generatedAt, "dd 'de' MMMM 'de' yyyy 'as' HH:mm", { locale: ptBR })}
        </Text>
        {(data.filters.startDate || data.filters.endDate) && (
          <Text style={styles.subtitle}>
            Periodo: {data.filters.startDate ? format(data.filters.startDate, "dd/MM/yyyy") : "Inicio"} 
            {" - "} 
            {data.filters.endDate ? format(data.filters.endDate, "dd/MM/yyyy") : "Atual"}
          </Text>
        )}
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Metricas Principais</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total de OSs</Text>
            <Text style={styles.statValue}>{data.stats.total}</Text>
            <Text style={styles.statSubtext}>Ordens de servico</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Concluidas</Text>
            <Text style={[styles.statValue, { color: "#16a34a" }]}>{data.stats.completed}</Text>
            <Text style={styles.statSubtext}>{data.stats.completionRate}% do total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Em Andamento</Text>
            <Text style={[styles.statValue, { color: "#ca8a04" }]}>{data.stats.inProgress}</Text>
            <Text style={styles.statSubtext}>{data.stats.pending} pendentes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Coordenadores</Text>
            <Text style={styles.statValue}>{data.stats.coordinators}</Text>
            <Text style={styles.statSubtext}>Ativos</Text>
          </View>
        </View>
      </View>

      {/* Trends Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comparacao Anual</Text>
        <View style={styles.row}>
          <View style={[styles.statCard, { width: "30%", marginRight: 10 }]}>
            <Text style={styles.statLabel}>Ano Atual</Text>
            <Text style={styles.statValue}>{data.trends.currentYearTotal}</Text>
          </View>
          <View style={[styles.statCard, { width: "30%", marginRight: 10 }]}>
            <Text style={styles.statLabel}>Ano Anterior</Text>
            <Text style={styles.statValue}>{data.trends.previousYearTotal}</Text>
          </View>
          <View style={[styles.statCard, { width: "30%" }]}>
            <Text style={styles.statLabel}>Crescimento</Text>
            <Text style={[
              styles.statValue, 
              data.trends.growthRate >= 0 ? { color: "#16a34a" } : { color: "#dc2626" }
            ]}>
              {data.trends.growthRate >= 0 ? "+" : ""}{data.trends.growthRate.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Monthly Trend Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>Mes</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Ano Atual</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Ano Anterior</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Variacao</Text>
          </View>
          {data.trends.monthlyData.slice(-6).map((month, index) => {
            const variation = month.previousYear > 0 
              ? ((month.currentYear - month.previousYear) / month.previousYear * 100)
              : 0;
            return (
              <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.col1]}>{month.month}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{month.currentYear}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{month.previousYear}</Text>
                <Text style={[
                  styles.tableCell, 
                  styles.col2,
                  variation >= 0 ? { color: "#16a34a" } : { color: "#dc2626" }
                ]}>
                  {variation >= 0 ? "+" : ""}{variation.toFixed(1)}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Forecasts Section */}
      {data.forecasts && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Previsoes de Demanda (IA)</Text>
          {data.forecasts.predictions.map((pred, index) => (
            <View key={index} style={styles.forecastCard}>
              <View style={styles.row}>
                <Text style={{ fontWeight: "bold", flex: 1 }}>{pred.month}</Text>
                <Text style={[
                  styles.badge,
                  pred.confidence === "alta" ? styles.badgeGreen :
                  pred.confidence === "media" ? styles.badgeYellow : styles.badgeRed
                ]}>
                  Confianca: {pred.confidence}
                </Text>
              </View>
              <Text style={{ marginTop: 4 }}>
                Previsao: {pred.predicted_orders} OSs ({pred.predicted_completed} concluidas)
              </Text>
            </View>
          ))}
          
          <View style={styles.summaryBox}>
            <Text style={{ fontWeight: "bold", marginBottom: 5 }}>Analise de Tendencias</Text>
            <Text style={styles.summaryText}>{data.forecasts.trend_analysis}</Text>
          </View>

          <Text style={{ fontWeight: "bold", marginTop: 10, marginBottom: 5 }}>Recomendacoes:</Text>
          {data.forecasts.recommendations.map((rec, index) => (
            <Text key={index} style={{ marginBottom: 3, paddingLeft: 10 }}>
              {index + 1}. {rec}
            </Text>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Relatorio gerado automaticamente pelo Sistema de Gestao de Servicos</Text>
        <Text>Pagina 1 de 1</Text>
      </View>
    </Page>

    {/* Page 2 - Accuracy Metrics */}
    {data.accuracy && (
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Precisao das Previsoes</Text>
          <Text style={styles.subtitle}>Analise de Desempenho do Modelo Preditivo</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metricas de Precisao</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Precisao Geral</Text>
              <Text style={[
                styles.statValue,
                data.accuracy.overallAccuracy >= 85 ? { color: "#16a34a" } :
                data.accuracy.overallAccuracy >= 70 ? { color: "#ca8a04" } : { color: "#dc2626" }
              ]}>
                {data.accuracy.overallAccuracy.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>MAPE (Erro Medio)</Text>
              <Text style={styles.statValue}>{data.accuracy.mapeOrders.toFixed(1)}%</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Taxa de Acerto</Text>
              <Text style={[styles.statValue, { color: "#16a34a" }]}>
                {data.accuracy.accuracyRate.toFixed(1)}%
              </Text>
              <Text style={styles.statSubtext}>Erro menor que 15%</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historico de Previsoes vs Resultados</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.col1]}>Mes</Text>
              <Text style={[styles.tableHeaderText, styles.col2]}>Previsto</Text>
              <Text style={[styles.tableHeaderText, styles.col2]}>Real</Text>
              <Text style={[styles.tableHeaderText, styles.col2]}>Erro</Text>
              <Text style={[styles.tableHeaderText, styles.col2]}>Precisao</Text>
            </View>
            {data.accuracy.forecasts.map((forecast, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.col1]}>
                  {format(new Date(forecast.forecast_month), "MMM yyyy", { locale: ptBR })}
                </Text>
                <Text style={[styles.tableCell, styles.col2]}>{forecast.predicted_orders}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{forecast.actual_orders}</Text>
                <Text style={[styles.tableCell, styles.col2]}>
                  {Math.abs(forecast.predicted_orders - forecast.actual_orders)}
                </Text>
                <Text style={[
                  styles.tableCell, 
                  styles.col2,
                  forecast.orderAccuracy >= 85 ? { color: "#16a34a" } :
                  forecast.orderAccuracy >= 70 ? { color: "#ca8a04" } : { color: "#dc2626" }
                ]}>
                  {forecast.orderAccuracy.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Relatorio gerado automaticamente pelo Sistema de Gestao de Servicos</Text>
          <Text>Pagina 2 de 2</Text>
        </View>
      </Page>
    )}
  </Document>
);

export const generateManagerReport = async (data: ManagerReportData): Promise<Blob> => {
  const blob = await pdf(<ManagerReportDocument data={data} />).toBlob();
  return blob;
};

export const downloadManagerReport = async (data: ManagerReportData) => {
  const blob = await generateManagerReport(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-gerencial-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
