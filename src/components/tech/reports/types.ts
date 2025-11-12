
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
