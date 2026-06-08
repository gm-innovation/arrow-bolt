import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, Plus, ExternalLink, AlertTriangle, FileWarning } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  useQualityDevice,
  useQualityDevices,
  useQualityCalibrations,
  type DeviceStatus,
} from "@/hooks/useQualityDevices";
import DeviceStatusBadge from "@/components/quality/DeviceStatusBadge";
import DeviceFormDialog from "@/components/quality/DeviceFormDialog";
import CalibrationDrawer from "@/components/quality/CalibrationDrawer";

const resultLabel: Record<string, string> = {
  approved: "Aprovado",
  approved_with_restriction: "Aprovado c/ restrição",
  reproved: "Reprovado",
};
const kindLabel: Record<string, string> = {
  external_lab: "Laboratório externo",
  internal: "Interna",
  manufacturer: "Fabricante",
  self_check: "Verificação",
};

const DeviceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: device, isLoading } = useQualityDevice(id);
  const { upsert } = useQualityDevices();
  const { items: calibrations } = useQualityCalibrations(id);

  const [editOpen, setEditOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!device) return <div className="p-6">Instrumento não encontrado.</div>;

  const handleStatusChange = async (s: DeviceStatus) => {
    await upsert.mutateAsync({ id: device.id, code: device.code, name: device.name, status: s });
  };

  const overdue = device.next_calibration_due && new Date(device.next_calibration_due) < new Date();

  // §7.1.5 — calibração reprovada nos últimos 180 dias gera alerta crítico
  const reprovedRecent = calibrations.find((c) => {
    if (c.result !== "reproved") return false;
    const date = new Date(c.calibration_date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);
    return date >= cutoff;
  });

  const openNcrFromCalibration = () => {
    if (!reprovedRecent) return;
    const params = new URLSearchParams({
      origin: "calibration",
      device_id: device.id,
      device_code: device.code,
      device_name: device.name,
      calibration_id: reprovedRecent.id,
      title: `Calibração reprovada — ${device.code} ${device.name}`,
      severity: "high",
    });
    navigate(`/quality/ncrs?tab=ncrs&new=1&${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/quality/devices")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            <span className="font-mono text-base text-muted-foreground mr-2">{device.code}</span>
            {device.name}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <DeviceStatusBadge status={device.status} />
            <Badge variant="outline">Criticidade: {device.criticality}</Badge>
            {device.manufacturer && (
              <span className="text-sm text-muted-foreground">{device.manufacturer} {device.model}</span>
            )}
      </div>

      {reprovedRecent && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-destructive">
                Calibração REPROVADA em {format(parseISO(reprovedRecent.calibration_date), "dd/MM/yyyy")}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Este instrumento foi reprovado em calibração recente. Avalie segregar o dispositivo,
                investigar medições realizadas no período e abrir uma Não Conformidade.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={openNcrFromCalibration}>
              <FileWarning className="h-4 w-4 mr-1" />
              Abrir NCR
            </Button>
          </CardContent>
        </Card>
      )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={device.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="in_calibration">Em calibração</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="out_of_service">Fora de serviço</SelectItem>
              <SelectItem value="retired">Aposentado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Local</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{device.location ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Frequência</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{device.calibration_frequency_months} meses</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Última calibração</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">
            {device.last_calibration_at ? format(parseISO(device.last_calibration_at), "dd/MM/yyyy") : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Próx. calibração</CardTitle></CardHeader>
          <CardContent className={`text-lg font-semibold ${overdue ? "text-destructive" : ""}`}>
            {device.next_calibration_due ? format(parseISO(device.next_calibration_due), "dd/MM/yyyy") : "—"}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="history">Histórico ({calibrations.length})</TabsTrigger>
          <TabsTrigger value="certificates">Certificados</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Características técnicas</CardTitle></CardHeader>
            <CardContent className="text-sm grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Nº Série:</span> {device.serial_number ?? "—"}</div>
              <div><span className="text-muted-foreground">Faixa:</span> {device.measurement_range ?? "—"}</div>
              <div><span className="text-muted-foreground">Unidade:</span> {device.unit ?? "—"}</div>
              <div><span className="text-muted-foreground">Resolução:</span> {device.resolution ?? "—"}</div>
              <div><span className="text-muted-foreground">Exatidão:</span> {device.accuracy ?? "—"}</div>
              <div><span className="text-muted-foreground">Aquisição:</span> {device.acquired_at ? format(parseISO(device.acquired_at), "dd/MM/yyyy") : "—"}</div>
            </CardContent>
          </Card>
          {device.description && (
            <Card>
              <CardHeader><CardTitle className="text-base">Descrição</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{device.description}</CardContent>
            </Card>
          )}
          {device.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{device.notes}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setCalOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova calibração</Button>
          </div>
          {calibrations.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhuma calibração registrada.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-3 font-medium">Data</th>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th className="text-left p-3 font-medium">Resultado</th>
                      <th className="text-left p-3 font-medium">Certificado</th>
                      <th className="text-left p-3 font-medium">Validade</th>
                      <th className="text-left p-3 font-medium">Incerteza</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibrations.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="p-3">{format(parseISO(c.calibration_date), "dd/MM/yyyy")}</td>
                        <td className="p-3 text-xs">{kindLabel[c.kind] ?? c.kind}</td>
                        <td className="p-3">
                          <Badge variant={c.result === "approved" ? ("success" as any) : c.result === "reproved" ? "destructive" : ("warning" as any)}>
                            {resultLabel[c.result] ?? c.result}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs">{c.certificate_number ?? "—"}</td>
                        <td className="p-3 text-xs">{c.valid_until ? format(parseISO(c.valid_until), "dd/MM/yyyy") : "—"}</td>
                        <td className="p-3 text-xs">{c.measurement_uncertainty ?? "—"}</td>
                        <td className="p-3 text-right">
                          {c.certificate_file_url && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={c.certificate_file_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="certificates" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              {calibrations.filter((c) => c.certificate_file_url).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum certificado anexado.</p>
              ) : (
                calibrations.filter((c) => c.certificate_file_url).map((c) => (
                  <div key={c.id} className="flex items-center justify-between border rounded p-2">
                    <div className="text-sm">
                      <div className="font-medium">{c.certificate_file_name ?? c.certificate_number ?? "Certificado"}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(c.calibration_date), "dd/MM/yyyy")} — {resultLabel[c.result]}
                        {c.valid_until && ` · Válido até ${format(parseISO(c.valid_until), "dd/MM/yyyy")}`}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" asChild>
                      <a href={c.certificate_file_url!} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeviceFormDialog open={editOpen} onClose={() => setEditOpen(false)} device={device} />
      <CalibrationDrawer open={calOpen} onClose={() => setCalOpen(false)} deviceId={device.id} />
    </div>
  );
};

export default DeviceDetailPage;
