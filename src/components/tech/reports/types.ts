export type TimeEntry = {
  id: string;
  date: Date;
  type: "work_normal" | "work_extra" | "travel_normal" | "travel_extra" | "wait_normal" | "wait_extra";
  startTime: string;
  endTime: string;
};

export type TaskReport = {
  modelInfo: string;
  brandInfo: string;
  serialNumber: string;
  reportedIssue: string;
  executedWork: string;
  result: string;
  nextVisitWork: string;
  suppliedMaterial: string;
  photos: File[];
  timeEntries: TimeEntry[];
};