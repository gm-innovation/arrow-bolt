import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import DeviceStatusBadge from "./DeviceStatusBadge";
import type { QualityMeasuringDevice } from "@/hooks/useQualityDevices";

const criticalityLabel: Record<string, string> = {
  low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica",
};

interface Props {
  devices: QualityMeasuringDevice[];
  emptyText?: string;
}

const DeviceRegisterTable = ({ devices, emptyText = "Nenhum instrumento." }: Props) => {
  const navigate = useNavigate();

  if (devices.length === 0) {
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
              <th className="text-left p-3 font-medium">Código</th>
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-left p-3 font-medium">Local</th>
              <th className="text-left p-3 font-medium">Criticidade</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Próx. Calibração</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => {
              const overdue = d.next_calibration_due && new Date(d.next_calibration_due) < new Date();
              return (
                <tr key={d.id} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-mono text-xs">{d.code}</td>
                  <td className="p-3">
                    <div className="font-medium">{d.name}</div>
                    {d.manufacturer && <div className="text-xs text-muted-foreground">{d.manufacturer} {d.model}</div>}
                  </td>
                  <td className="p-3 text-xs">{d.location ?? "—"}</td>
                  <td className="p-3">{criticalityLabel[d.criticality] ?? d.criticality}</td>
                  <td className="p-3"><DeviceStatusBadge status={d.status} /></td>
                  <td className={`p-3 text-xs ${overdue ? "text-destructive font-medium" : ""}`}>
                    {d.next_calibration_due ? format(parseISO(d.next_calibration_due), "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/quality/devices/${d.id}`)}>
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

export default DeviceRegisterTable;
