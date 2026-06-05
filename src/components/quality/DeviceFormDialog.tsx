import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQualityDevices, type QualityMeasuringDevice } from "@/hooks/useQualityDevices";

interface Props {
  open: boolean;
  onClose: () => void;
  device?: QualityMeasuringDevice | null;
}

const blank = {
  code: "",
  name: "",
  description: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  measurement_range: "",
  unit: "",
  resolution: "",
  accuracy: "",
  location: "",
  criticality: "medium" as const,
  calibration_frequency_months: 12,
  last_calibration_at: "",
  acquired_at: "",
  notes: "",
};

const DeviceFormDialog = ({ open, onClose, device }: Props) => {
  const { upsert } = useQualityDevices();
  const [form, setForm] = useState<any>(blank);

  useEffect(() => {
    if (device) {
      setForm({
        code: device.code,
        name: device.name,
        description: device.description ?? "",
        manufacturer: device.manufacturer ?? "",
        model: device.model ?? "",
        serial_number: device.serial_number ?? "",
        measurement_range: device.measurement_range ?? "",
        unit: device.unit ?? "",
        resolution: device.resolution ?? "",
        accuracy: device.accuracy ?? "",
        location: device.location ?? "",
        criticality: device.criticality,
        calibration_frequency_months: device.calibration_frequency_months,
        last_calibration_at: device.last_calibration_at ?? "",
        acquired_at: device.acquired_at ?? "",
        notes: device.notes ?? "",
      });
    } else {
      setForm(blank);
    }
  }, [device, open]);

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) return;
    await upsert.mutateAsync({
      ...(device?.id ? { id: device.id } : {}),
      ...form,
      last_calibration_at: form.last_calibration_at || null,
      acquired_at: form.acquired_at || null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{device ? "Editar instrumento" : "Novo instrumento"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Código / TAG *</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Fabricante</Label>
            <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
          </div>
          <div>
            <Label>Modelo</Label>
            <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div>
            <Label>Nº Série</Label>
            <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
          </div>
          <div>
            <Label>Local</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label>Faixa de medição</Label>
            <Input value={form.measurement_range} onChange={(e) => setForm({ ...form, measurement_range: e.target.value })} />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div>
            <Label>Resolução</Label>
            <Input value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} />
          </div>
          <div>
            <Label>Exatidão</Label>
            <Input value={form.accuracy} onChange={(e) => setForm({ ...form, accuracy: e.target.value })} />
          </div>
          <div>
            <Label>Criticidade</Label>
            <Select value={form.criticality} onValueChange={(v) => setForm({ ...form, criticality: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Calibrar a cada (meses)</Label>
            <Input type="number" min={1}
              value={form.calibration_frequency_months}
              onChange={(e) => setForm({ ...form, calibration_frequency_months: parseInt(e.target.value) || 12 })} />
          </div>
          <div>
            <Label>Última calibração</Label>
            <Input type="date" value={form.last_calibration_at}
              onChange={(e) => setForm({ ...form, last_calibration_at: e.target.value })} />
          </div>
          <div>
            <Label>Data de aquisição</Label>
            <Input type="date" value={form.acquired_at}
              onChange={(e) => setForm({ ...form, acquired_at: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="col-span-2">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={!form.code.trim() || !form.name.trim() || upsert.isPending}>
            {upsert.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceFormDialog;
