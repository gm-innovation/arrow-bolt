export type TimeEntry = {
  id: string;
  date: Date;
  type: 'work_normal' | 'work_extra' | 'travel' | 'wait';
  startTime: string;
  endTime: string;
};

export type PhotoWithCaption = {
  file: File;
  caption: string;
};

export type TaskReport = {
  id?: string; // Making it optional for backward compatibility
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
};