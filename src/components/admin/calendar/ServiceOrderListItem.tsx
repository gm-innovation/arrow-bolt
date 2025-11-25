import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ServiceOrderHoverCard } from "./ServiceOrderHoverCard";
import { cn } from "@/lib/utils";

interface ServiceOrderListItemProps {
  order: {
    id: string;
    order_number: string;
    vessel_name: string;
    client_name?: string;
    supervisor_name?: string;
    status: string;
    scheduled_time: string;
    duration?: string;
    task_type?: string;
    description?: string;
    location?: string;
    technician_names?: string[];
    lead_technician?: string;
    auxiliary_technicians?: string[];
  };
  compact?: boolean;
  onClick?: () => void;
}

export const ServiceOrderListItem = ({ order, compact = false, onClick }: ServiceOrderListItemProps) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500",
      in_progress: "bg-blue-500",
      completed: "bg-green-500",
      cancelled: "bg-red-500",
      waiting: "bg-gray-500",
    };
    return colors[status] || "bg-gray-500";
  };

  // Build technician display array
  const technicianDisplay: string[] = [];
  
  if (order.lead_technician) {
    technicianDisplay.push(order.lead_technician);
    if (order.auxiliary_technicians && order.auxiliary_technicians.length > 0) {
      technicianDisplay.push(...order.auxiliary_technicians);
    }
  } else if (order.technician_names && order.technician_names.length > 0) {
    technicianDisplay.push(...order.technician_names);
  } else if (order.supervisor_name) {
    technicianDisplay.push(order.supervisor_name);
  }

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 cursor-pointer transition-colors",
            compact && "py-1"
          )}
          onClick={onClick}
        >
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusColor(order.status))} />
          <div className="flex-1 min-w-0 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{order.scheduled_time}</span>
              <span className="font-medium truncate">{order.vessel_name}</span>
            </div>
            {!compact && technicianDisplay.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                {technicianDisplay.map((name, idx) => (
                  <div key={idx} className="truncate">
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-auto">
        <ServiceOrderHoverCard
          order={{
            order_number: order.order_number,
            status: order.status,
            task_type: order.task_type,
            client_name: order.client_name,
            duration: order.duration,
            supervisor_name: order.supervisor_name,
            description: order.description,
            location: order.location,
            technician_names: order.technician_names,
            lead_technician: order.lead_technician,
            auxiliary_technicians: order.auxiliary_technicians,
          }}
        />
      </HoverCardContent>
    </HoverCard>
  );
};
