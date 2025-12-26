
export interface TaskReport {
  modelInfo: string;
  brandInfo: string;
  serialNumber: string;
  reportedIssue: string;
  executedWork: string;
  result: string;
  nextVisitWork: string;
  suppliedMaterial: string;
  photos: PhotoWithCaption[];
  timeEntries: TimeEntry[];
  materials?: MaterialEntry[];
}

export interface MaterialEntry {
  id: string;
  external_product_id?: number;
  external_product_code?: string;
  name: string;
  unit_value: number;
  quantity: number;
  used: boolean;
  source: 'eva' | 'manual';
}

export interface PhotoWithCaption {
  file?: File;
  caption: string;
  storagePath?: string;
  description?: string;
}

export interface TimeEntry {
  id: string;
  date: Date;
  type: 'work_normal' | 'work_extra' | 'work_night' | 'standby';
  startTime: string;
  endTime: string;
}

// Multi-task report structure for PDF
export interface TaskReportWithInfo {
  taskId: string;
  taskName: string;
  orderNumber?: string;
  report: TaskReport;
}

// Validation errors for a task report
export interface TaskReportValidation {
  isValid: boolean;
  errors: string[];
  missingFields: string[];
}

// Validate a single task report
export const validateTaskReport = (
  report: TaskReport,
  requiredPhotoLabels: string[] = []
): TaskReportValidation => {
  const errors: string[] = [];
  const missingFields: string[] = [];

  // Required equipment fields
  if (!report.modelInfo?.trim()) {
    missingFields.push("Modelo");
  }
  if (!report.brandInfo?.trim()) {
    missingFields.push("Marca");
  }
  if (!report.serialNumber?.trim()) {
    missingFields.push("Número de Série");
  }

  // Required service details
  if (!report.reportedIssue?.trim()) {
    missingFields.push("Defeito Encontrado/Reportado");
  }
  if (!report.executedWork?.trim()) {
    missingFields.push("Trabalhos Executados");
  }
  if (!report.result?.trim()) {
    missingFields.push("Resultado");
  }
  if (!report.nextVisitWork?.trim()) {
    missingFields.push("Trabalho para Próximo Atendimento");
  }
  if (!report.suppliedMaterial?.trim()) {
    missingFields.push("Material Fornecido");
  }

  // At least one time entry with valid times
  const validTimeEntries = report.timeEntries?.filter(
    (entry) => entry.startTime && entry.endTime
  );
  if (!validTimeEntries || validTimeEntries.length === 0) {
    missingFields.push("Pelo menos 1 registro de horário");
  }

  // At least one photo is required
  if (!report.photos || report.photos.length === 0) {
    missingFields.push("Pelo menos 1 foto");
  }

  // Required photos by label (if any)
  if (requiredPhotoLabels.length > 0) {
    const missingPhotos = requiredPhotoLabels.filter(
      (label) => !report.photos?.some((photo) => photo.caption === label)
    );
    if (missingPhotos.length > 0) {
      errors.push(`Fotos obrigatórias faltando: ${missingPhotos.join(", ")}`);
    }
  }

  if (missingFields.length > 0) {
    errors.push(`Campos obrigatórios não preenchidos: ${missingFields.join(", ")}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    missingFields,
  };
};
