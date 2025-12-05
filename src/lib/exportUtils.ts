/**
 * Utility functions for exporting data to CSV and Excel formats
 */

import * as XLSX from 'xlsx';

export const exportToCSV = (data: any[], filename: string, headers?: Record<string, string>) => {
  if (data.length === 0) {
    throw new Error("Nenhum dado para exportar");
  }

  // Get headers from the first data item if not provided
  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerLabels = headers ? Object.values(headers) : keys;

  // Create CSV content
  const csvContent = [
    // Header row
    headerLabels.join(","),
    // Data rows
    ...data.map(item => 
      keys.map(key => {
        let value = item[key];
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          return "";
        }
        
        // Convert to string and escape
        value = String(value);
        
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        if (value.includes(",") || value.includes("\n") || value.includes('"')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(",")
    )
  ].join("\n");

  // Create blob and download
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export const formatDateForExport = (date: string | Date): string => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR");
};

export const formatBooleanForExport = (value: boolean): string => {
  return value ? "Sim" : "Não";
};

export const formatCurrencyForExport = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatPercentageForExport = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Excel Export Types
interface ExcelSheet {
  name: string;
  data: any[];
  headers?: Record<string, string>;
}

interface ExcelExportOptions {
  filename: string;
  sheets: ExcelSheet[];
}

/**
 * Export data to Excel file with multiple sheets
 */
export const exportToExcel = (options: ExcelExportOptions) => {
  const { filename, sheets } = options;
  
  if (sheets.length === 0) {
    throw new Error("Nenhuma planilha para exportar");
  }

  const workbook = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    if (sheet.data.length === 0) return;

    const keys = sheet.headers ? Object.keys(sheet.headers) : Object.keys(sheet.data[0]);
    const headerLabels = sheet.headers ? Object.values(sheet.headers) : keys;

    const worksheetData = [
      headerLabels,
      ...sheet.data.map(item => keys.map(key => {
        const value = item[key];
        if (value === null || value === undefined) return "";
        return value;
      }))
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    const colWidths = headerLabels.map((header, i) => {
      const maxDataLength = Math.max(
        ...sheet.data.map(row => String(row[keys[i]] || "").length),
        String(header).length
      );
      return { wch: Math.min(Math.max(maxDataLength + 2, 10), 50) };
    });
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.substring(0, 31));
  });

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export interface ManagerReportExcelData {
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
    monthlyData: { month: string; currentYear: number; previousYear: number }[];
  };
  accuracy?: {
    overallAccuracy: number;
    mapeOrders: number;
    accuracyRate: number;
    forecasts: any[];
  };
  generatedAt: Date;
}

export const exportManagerReportToExcel = (data: ManagerReportExcelData) => {
  const sheets: ExcelSheet[] = [];

  sheets.push({
    name: "Métricas Principais",
    data: [
      { metrica: "Total de OSs", valor: data.stats.total },
      { metrica: "OSs Concluídas", valor: data.stats.completed },
      { metrica: "OSs Em Andamento", valor: data.stats.inProgress },
      { metrica: "OSs Pendentes", valor: data.stats.pending },
      { metrica: "Coordenadores Ativos", valor: data.stats.coordinators },
      { metrica: "Taxa de Conclusão", valor: `${data.stats.completionRate}%` },
    ],
    headers: { metrica: "Métrica", valor: "Valor" }
  });

  if (data.trends.monthlyData.length > 0) {
    const currentYear = new Date().getFullYear();
    sheets.push({
      name: "Comparativo Anual",
      data: data.trends.monthlyData.map(m => ({
        mes: m.month,
        anoAtual: m.currentYear,
        anoAnterior: m.previousYear,
        variacao: m.previousYear > 0 
          ? `${(((m.currentYear - m.previousYear) / m.previousYear) * 100).toFixed(1)}%`
          : "N/A"
      })),
      headers: {
        mes: "Mês",
        anoAtual: `${currentYear}`,
        anoAnterior: `${currentYear - 1}`,
        variacao: "Variação %"
      }
    });

    sheets.push({
      name: "Resumo Anual",
      data: [
        { metrica: `Total ${currentYear}`, valor: data.trends.currentYearTotal },
        { metrica: `Total ${currentYear - 1}`, valor: data.trends.previousYearTotal },
        { metrica: "Crescimento", valor: `${data.trends.growthRate.toFixed(1)}%` },
      ],
      headers: { metrica: "Métrica", valor: "Valor" }
    });
  }

  if (data.accuracy && data.accuracy.forecasts.length > 0) {
    sheets.push({
      name: "Acurácia Previsões",
      data: data.accuracy.forecasts.map(f => ({
        mes: formatDateForExport(f.forecast_month),
        previsto: f.predicted_orders,
        real: f.actual_orders || 0,
        acuracia: `${f.orderAccuracy.toFixed(1)}%`,
        confianca: f.confidence
      })),
      headers: {
        mes: "Mês",
        previsto: "Previsto",
        real: "Real",
        acuracia: "Acurácia",
        confianca: "Confiança"
      }
    });

    sheets.push({
      name: "Resumo Acurácia",
      data: [
        { metrica: "Acurácia Geral", valor: `${data.accuracy.overallAccuracy.toFixed(1)}%` },
        { metrica: "MAPE", valor: `${data.accuracy.mapeOrders.toFixed(1)}%` },
        { metrica: "Taxa de Acertos (±15%)", valor: `${data.accuracy.accuracyRate.toFixed(1)}%` },
      ],
      headers: { metrica: "Métrica", valor: "Valor" }
    });
  }

  sheets.push({
    name: "Informações",
    data: [
      { info: "Relatório Gerado em", valor: formatDateForExport(data.generatedAt) },
      { info: "Sistema", valor: "Arrow - Dashboard Gerencial" },
    ],
    headers: { info: "Informação", valor: "Valor" }
  });

  exportToExcel({
    filename: `relatorio-gerencial-${new Date().toISOString().split('T')[0]}`,
    sheets
  });
};

export const exportServiceOrdersToExcel = (orders: any[], filename: string = "ordens-servico") => {
  exportToExcel({
    filename,
    sheets: [{
      name: "Ordens de Serviço",
      data: orders.map(order => ({
        numero: order.order_number,
        cliente: order.client?.name || "N/A",
        embarcacao: order.vessel?.name || "N/A",
        status: translateStatus(order.status),
        dataAgendada: order.scheduled_date ? formatDateForExport(order.scheduled_date) : "N/A",
        dataConclusao: order.completed_date ? formatDateForExport(order.completed_date) : "N/A",
        local: order.location || "N/A",
        descricao: order.description || "N/A",
        criadoEm: formatDateForExport(order.created_at)
      })),
      headers: {
        numero: "Nº OS",
        cliente: "Cliente",
        embarcacao: "Embarcação",
        status: "Status",
        dataAgendada: "Data Agendada",
        dataConclusao: "Data Conclusão",
        local: "Local",
        descricao: "Descrição",
        criadoEm: "Criado em"
      }
    }]
  });
};

const translateStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "Pendente",
    in_progress: "Em Andamento",
    completed: "Concluído",
    cancelled: "Cancelado"
  };
  return statusMap[status] || status;
};
