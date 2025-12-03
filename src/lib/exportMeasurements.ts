/**
 * Export functions for Measurements (Medições)
 */

import { exportToExcel, formatDateForExport, formatCurrencyForExport } from './exportUtils';

interface Measurement {
  id: string;
  category: string;
  status: string;
  created_at: string;
  finalized_at?: string;
  subtotal_man_hours?: number;
  subtotal_materials?: number;
  subtotal_services?: number;
  subtotal_travels?: number;
  subtotal_expenses?: number;
  subtotal?: number;
  tax_percentage?: number;
  tax_amount?: number;
  total_amount?: number;
  service_order?: {
    order_number: string;
    client?: { name: string };
    vessel?: { name: string };
  };
}

interface ManHour {
  technician_name: string;
  technician_role: string;
  hour_type: string;
  work_type: string;
  entry_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  hourly_rate: number;
  total_value: number;
}

interface Material {
  name: string;
  quantity: number;
  unit_value: number;
  markup_percentage?: number;
  total_value: number;
}

interface Travel {
  travel_type: string;
  from_city: string;
  to_city: string;
  distance_km?: number;
  km_rate?: number;
  fixed_value?: number;
  total_value: number;
  description?: string;
}

interface Expense {
  expense_type: string;
  description?: string;
  base_value: number;
  admin_fee_percentage?: number;
  admin_fee_amount: number;
  total_value: number;
}

interface Service {
  name: string;
  description?: string;
  value: number;
}

export const exportMeasurementToExcel = (
  measurement: Measurement,
  manHours: ManHour[],
  materials: Material[],
  travels: Travel[],
  expenses: Expense[],
  services: Service[]
) => {
  const sheets = [];

  // Sheet 1: Resumo da Medição
  sheets.push({
    name: "Resumo",
    data: [
      { campo: "Nº OS", valor: measurement.service_order?.order_number || "N/A" },
      { campo: "Cliente", valor: measurement.service_order?.client?.name || "N/A" },
      { campo: "Embarcação", valor: measurement.service_order?.vessel?.name || "N/A" },
      { campo: "Categoria", valor: translateCategory(measurement.category) },
      { campo: "Status", valor: measurement.status === "finalized" ? "Finalizada" : "Rascunho" },
      { campo: "Data de Criação", valor: formatDateForExport(measurement.created_at) },
      { campo: "Data de Finalização", valor: measurement.finalized_at ? formatDateForExport(measurement.finalized_at) : "N/A" },
      { campo: "", valor: "" },
      { campo: "SUBTOTAIS", valor: "" },
      { campo: "Mão de Obra", valor: formatCurrencyForExport(measurement.subtotal_man_hours || 0) },
      { campo: "Materiais", valor: formatCurrencyForExport(measurement.subtotal_materials || 0) },
      { campo: "Serviços", valor: formatCurrencyForExport(measurement.subtotal_services || 0) },
      { campo: "Viagens", valor: formatCurrencyForExport(measurement.subtotal_travels || 0) },
      { campo: "Despesas", valor: formatCurrencyForExport(measurement.subtotal_expenses || 0) },
      { campo: "", valor: "" },
      { campo: "Subtotal", valor: formatCurrencyForExport(measurement.subtotal || 0) },
      { campo: `Impostos (${measurement.tax_percentage || 0}%)`, valor: formatCurrencyForExport(measurement.tax_amount || 0) },
      { campo: "TOTAL", valor: formatCurrencyForExport(measurement.total_amount || 0) },
    ],
    headers: { campo: "Campo", valor: "Valor" }
  });

  // Sheet 2: Mão de Obra
  if (manHours.length > 0) {
    sheets.push({
      name: "Mão de Obra",
      data: manHours.map(h => ({
        tecnico: h.technician_name,
        funcao: translateRole(h.technician_role),
        tipoHora: translateHourType(h.hour_type),
        tipoTrabalho: translateWorkType(h.work_type),
        data: formatDateForExport(h.entry_date),
        inicio: h.start_time,
        fim: h.end_time,
        totalHoras: h.total_hours.toFixed(2),
        valorHora: formatCurrencyForExport(h.hourly_rate),
        valorTotal: formatCurrencyForExport(h.total_value),
      })),
      headers: {
        tecnico: "Técnico",
        funcao: "Função",
        tipoHora: "Tipo de Hora",
        tipoTrabalho: "Tipo de Trabalho",
        data: "Data",
        inicio: "Início",
        fim: "Fim",
        totalHoras: "Total Horas",
        valorHora: "Valor/Hora",
        valorTotal: "Valor Total",
      }
    });
  }

  // Sheet 3: Materiais
  if (materials.length > 0) {
    sheets.push({
      name: "Materiais",
      data: materials.map(m => ({
        nome: m.name,
        quantidade: m.quantity,
        valorUnit: formatCurrencyForExport(m.unit_value),
        markup: `${m.markup_percentage || 0}%`,
        valorTotal: formatCurrencyForExport(m.total_value),
      })),
      headers: {
        nome: "Material",
        quantidade: "Quantidade",
        valorUnit: "Valor Unitário",
        markup: "Markup",
        valorTotal: "Valor Total",
      }
    });
  }

  // Sheet 4: Viagens
  if (travels.length > 0) {
    sheets.push({
      name: "Viagens",
      data: travels.map(t => ({
        tipo: translateTravelType(t.travel_type),
        origem: t.from_city,
        destino: t.to_city,
        distanciaKm: t.distance_km || "N/A",
        valorKm: t.km_rate ? formatCurrencyForExport(t.km_rate) : "N/A",
        valorFixo: t.fixed_value ? formatCurrencyForExport(t.fixed_value) : "N/A",
        valorTotal: formatCurrencyForExport(t.total_value),
        descricao: t.description || "",
      })),
      headers: {
        tipo: "Tipo",
        origem: "Origem",
        destino: "Destino",
        distanciaKm: "Distância (km)",
        valorKm: "Valor/km",
        valorFixo: "Valor Fixo",
        valorTotal: "Valor Total",
        descricao: "Descrição",
      }
    });
  }

  // Sheet 5: Despesas
  if (expenses.length > 0) {
    sheets.push({
      name: "Despesas",
      data: expenses.map(e => ({
        tipo: translateExpenseType(e.expense_type),
        descricao: e.description || "",
        valorBase: formatCurrencyForExport(e.base_value),
        taxaAdmin: `${e.admin_fee_percentage || 0}%`,
        valorTaxa: formatCurrencyForExport(e.admin_fee_amount),
        valorTotal: formatCurrencyForExport(e.total_value),
      })),
      headers: {
        tipo: "Tipo",
        descricao: "Descrição",
        valorBase: "Valor Base",
        taxaAdmin: "Taxa Admin",
        valorTaxa: "Valor Taxa",
        valorTotal: "Valor Total",
      }
    });
  }

  // Sheet 6: Serviços
  if (services.length > 0) {
    sheets.push({
      name: "Serviços",
      data: services.map(s => ({
        nome: s.name,
        descricao: s.description || "",
        valor: formatCurrencyForExport(s.value),
      })),
      headers: {
        nome: "Serviço",
        descricao: "Descrição",
        valor: "Valor",
      }
    });
  }

  const orderNumber = measurement.service_order?.order_number || measurement.id.substring(0, 8);
  exportToExcel({
    filename: `medicao-${orderNumber}-${new Date().toISOString().split('T')[0]}`,
    sheets: sheets.length > 0 ? sheets : [{ name: "Vazio", data: [{ msg: "Sem dados" }], headers: { msg: "Mensagem" } }]
  });
};

// Helper functions
const translateCategory = (category: string) => {
  const map: Record<string, string> = {
    CATIVO: "Cativo",
    LABORATORIO: "Laboratório",
    EXTERNO: "Externo",
  };
  return map[category] || category;
};

const translateRole = (role: string) => {
  const map: Record<string, string> = {
    tecnico: "Técnico",
    auxiliar: "Auxiliar",
    engenheiro: "Engenheiro",
    supervisor: "Supervisor",
  };
  return map[role] || role;
};

const translateHourType = (type: string) => {
  const map: Record<string, string> = {
    work_normal: "Normal",
    work_extra: "Extra",
    work_night: "Noturna",
    standby: "Sobreaviso",
  };
  return map[type] || type;
};

const translateWorkType = (type: string) => {
  const map: Record<string, string> = {
    trabalho: "Trabalho",
    espera_deslocamento: "Espera/Deslocamento",
    laboratorio: "Laboratório",
  };
  return map[type] || type;
};

const translateTravelType = (type: string) => {
  const map: Record<string, string> = {
    carro_proprio: "Carro Próprio",
    carro_alugado: "Carro Alugado",
    passagem_aerea: "Passagem Aérea",
  };
  return map[type] || type;
};

const translateExpenseType = (type: string) => {
  const map: Record<string, string> = {
    hospedagem: "Hospedagem",
    alimentacao: "Alimentação",
  };
  return map[type] || type;
};
