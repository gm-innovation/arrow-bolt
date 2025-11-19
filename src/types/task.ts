export type TaskStatus = "waiting" | "pending" | "in_progress" | "completed";

export interface Task {
  id: string;
  orderNumber?: string;
  vesselName: string;
  description: string;
  scheduledDate: Date;
  status: TaskStatus;
}