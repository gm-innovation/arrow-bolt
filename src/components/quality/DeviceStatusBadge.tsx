import { Badge } from "@/components/ui/badge";
import type { DeviceStatus } from "@/hooks/useQualityDevices";

const labels: Record<DeviceStatus, string> = {
  active: "Ativo",
  in_calibration: "Em calibração",
  out_of_service: "Fora de serviço",
  retired: "Aposentado",
  overdue: "Vencido",
};

const variantFor = (s: DeviceStatus): "default" | "secondary" | "destructive" | "success" | "warning" | "outline" => {
  switch (s) {
    case "active": return "success";
    case "in_calibration": return "warning";
    case "overdue": return "destructive";
    case "out_of_service": return "destructive";
    case "retired": return "secondary";
    default: return "outline";
  }
};

const DeviceStatusBadge = ({ status }: { status: DeviceStatus }) => (
  <Badge variant={variantFor(status) as any}>{labels[status]}</Badge>
);

export default DeviceStatusBadge;
