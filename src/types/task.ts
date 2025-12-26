export type TaskStatus = "waiting" | "pending" | "in_progress" | "completed";

export interface Task {
  id: string;
  serviceOrderId?: string;
  orderNumber?: string;
  vesselName: string;
  description: string;
  scheduledDate: Date;
  status: TaskStatus;
  singleReport?: boolean;
  taskName?: string;
}

export interface GroupedTask extends Task {
  tasksList: Task[];
  taskCount: number;
  groupedDescription: string;
}