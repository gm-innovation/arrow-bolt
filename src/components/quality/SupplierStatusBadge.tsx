import { Badge } from "@/components/ui/badge";
import type { SupplierStatus } from "@/hooks/useQualitySuppliers";

const labels: Record<SupplierStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  conditional: "Condicional",
  suspended: "Suspenso",
  disqualified: "Desqualificado",
};

const variantFor = (s: SupplierStatus): "default" | "secondary" | "destructive" | "success" | "warning" | "outline" => {
  switch (s) {
    case "approved": return "success";
    case "conditional": return "warning";
    case "suspended": return "destructive";
    case "disqualified": return "destructive";
    case "pending": return "outline";
    default: return "secondary";
  }
};

const SupplierStatusBadge = ({ status }: { status: SupplierStatus }) => (
  <Badge variant={variantFor(status) as any}>{labels[status]}</Badge>
);

export default SupplierStatusBadge;

export const gradeVariant = (grade: string | null): "default" | "secondary" | "destructive" | "success" | "warning" | "outline" => {
  if (!grade) return "secondary";
  if (grade === "A") return "success";
  if (grade === "B") return "default";
  if (grade === "C") return "warning";
  return "destructive";
};
