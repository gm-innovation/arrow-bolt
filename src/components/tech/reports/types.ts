
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
