import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import SupplierStatusBadge, { gradeVariant } from "./SupplierStatusBadge";
import type { QualitySupplier } from "@/hooks/useQualitySuppliers";

const categoryLabel: Record<string, string> = {
  material: "Material",
  service: "Serviço",
  calibration: "Calibração",
  training: "Treinamento",
  software: "Software",
  logistics: "Logística",
  other: "Outros",
};

const criticalityLabel: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

interface Props {
  suppliers: QualitySupplier[];
  emptyText?: string;
}

const SupplierRegisterTable = ({ suppliers, emptyText = "Nenhum fornecedor." }: Props) => {
  const navigate = useNavigate();

  if (suppliers.length === 0) {
    return (
      <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">{emptyText}</CardContent></Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-left p-3 font-medium">Categoria</th>
              <th className="text-left p-3 font-medium">Criticidade</th>
              <th className="text-left p-3 font-medium">Nota</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Próx. Reavaliação</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => {
              const overdue = s.next_evaluation_due && new Date(s.next_evaluation_due) < new Date();
              return (
                <tr key={s.id} className="border-t hover:bg-muted/20">
                  <td className="p-3">
                    <div className="font-medium">{s.name}</div>
                    {s.tax_id && <div className="text-xs text-muted-foreground">{s.tax_id}</div>}
                  </td>
                  <td className="p-3">{categoryLabel[s.category] ?? s.category}</td>
                  <td className="p-3">{criticalityLabel[s.criticality] ?? s.criticality}</td>
                  <td className="p-3">
                    {s.current_grade ? (
                      <Badge variant={gradeVariant(s.current_grade) as any}>
                        {s.current_grade} {s.current_score != null ? `(${s.current_score})` : ""}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3"><SupplierStatusBadge status={s.status} /></td>
                  <td className={`p-3 text-xs ${overdue ? "text-destructive font-medium" : ""}`}>
                    {s.next_evaluation_due ? format(parseISO(s.next_evaluation_due), "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/quality/suppliers/${s.id}`)}>
                      Abrir
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default SupplierRegisterTable;
