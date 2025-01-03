export type TaskStatus = "waiting" | "in_progress" | "completed";

export interface Task {
  id: string;
  vesselName: string;
  description: string;
  scheduledDate: Date;
  status: TaskStatus;
}