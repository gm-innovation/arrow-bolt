import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ServiceOrderHoverCard } from "./ServiceOrderHoverCard";
import { cn } from "@/lib/utils";
import { categoryStyles, classifyEvent } from "./eventStyles";


const formatShortName = (fullName: string) => {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

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
    auvo_team_name?: string;
    auvo_technician_names?: string[];
      event_source?: "arrow" | "auvo";
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
      auvo: "bg-cyan-500",
    };
    return colors[status] || "bg-gray-500";
  };

  // Build technician display array with short names
  const technicianDisplay: string[] = [];
  
  if (order.lead_technician) {
    technicianDisplay.push(formatShortName(order.lead_technician));
    if (order.auxiliary_technicians && order.auxiliary_technicians.length > 0) {
      technicianDisplay.push(...order.auxiliary_technicians.map(formatShortName));
    }
  } else if (order.technician_names && order.technician_names.length > 0) {
    technicianDisplay.push(...order.technician_names.map(formatShortName));
  } else if (order.auvo_team_name) {
    technicianDisplay.push(order.auvo_team_name);
  } else if (order.auvo_technician_names && order.auvo_technician_names.length > 0) {
    technicianDisplay.push(...order.auvo_technician_names.map(formatShortName));
  } else if (order.supervisor_name) {
    technicianDisplay.push(formatShortName(order.supervisor_name));
  }

  const category = classifyEvent(order);
  const style = categoryStyles[category];
  const CategoryIcon = style.icon;
  const normalizedTitle = (order.vessel_name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
  const normalizedLabel = style.label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const showTitle = normalizedTitle.length > 0 && normalizedTitle !== normalizedLabel;

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded border-l-2 hover:shadow cursor-pointer transition-all",
            style.item,
            compact && "py-1"
          )}
          onClick={onClick}
        >
          <div className="flex-1 min-w-0 text-sm">
            <div className="flex items-center gap-1.5">
              {order.scheduled_time && (
                <span className="text-xs opacity-70">{order.scheduled_time}</span>
              )}
              <span
                className={cn(
                  "flex items-center gap-1 rounded-sm border px-1 text-[10px] font-semibold",
                  style.badge
                )}
              >
                <CategoryIcon className="h-2.5 w-2.5" />
                {category === "os" ? order.order_number : style.label}
              </span>
              {showTitle && <span className="font-medium truncate">{order.vessel_name}</span>}
            </div>

            {!compact && technicianDisplay.length > 0 && (
              <div className="text-xs opacity-75 space-y-0.5 mt-1">
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
      <HoverCardContent 
        side="bottom" 
        align="start" 
        className="w-auto max-w-md z-[100]" 
        sideOffset={8}
        collisionPadding={16}
        avoidCollisions={true}
        sticky="always"
      >
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
            auvo_team_name: order.auvo_team_name,
            auvo_technician_names: order.auvo_technician_names,
            event_source: order.event_source,
          }}
        />
      </HoverCardContent>
    </HoverCard>
  );
};
