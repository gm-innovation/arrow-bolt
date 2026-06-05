import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Upload, FileCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQualityCalibrations, uploadCalibrationFile, type CalibrationKind, type CalibrationResult } from "@/hooks/useQualityDevices";
import { useQualitySuppliers } from "@/hooks/useQualitySuppliers";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  deviceId: string;
}

interface CheckpointRow {
  nominal_value: number | null;
  measured_value: number | null;
  error: number | null;
  tolerance: number | null;
  pass: boolean | null;
  notes: string | null;
}

const blank = {
  kind: "external_lab" as CalibrationKind,
  calibration_date: new Date().toISOString().slice(0, 10),
  result: "approved" as CalibrationResult,
  provider_supplier_id: "" as string,
  certificate_number: "",
  cost: "",
  measurement_uncertainty: "",
  traceability: "",
  valid_until: "",
  restrictions: "",
  notes: "",
};

const CalibrationDrawer = ({ open, onClose, deviceId }: Props) => {
  const { profile } = useAuth();
  const { create } = useQualityCalibrations(deviceId);
  const { items: allSuppliers } = useQualitySuppliers();
  const calibrationSuppliers = allSuppliers.filter(
    (s) => s.category === "calibration" && (s.status === "approved" || s.status === "conditional"),
  );
  const [form, setForm] = useState<any>(blank);
  const [checkpoints, setCheckpoints] = useState<CheckpointRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ url: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!profile?.company_id) return;
    setUploading(true);
    try {
      const res = await uploadCalibrationFile(profile.company_id, deviceId, file);
      setFileMeta({ url: res.url, name: res.name });
      toast({ title: "Certificado enviado" });
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const addCheckpoint = () =>
    setCheckpoints([...checkpoints, { nominal_value: null, measured_value: null, error: null, tolerance: null, pass: null, notes: null }]);

  const updateCheckpoint = (idx: number, patch: Partial<CheckpointRow>) =>
    setCheckpoints(checkpoints.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const removeCheckpoint = (idx: number) => setCheckpoints(checkpoints.filter((_, i) => i !== idx));

  const reset = () => {
    setForm(blank);
    setCheckpoints([]);
    setFileMeta(null);
  };

  const save = async () => {
    await create.mutateAsync({
      device_id: deviceId,
      kind: form.kind,
      calibration_date: form.calibration_date,
      result: form.result,
      provider_supplier_id: form.provider_supplier_id || null,
      certificate_number: form.certificate_number || null,
      certificate_file_url: fileMeta?.url ?? null,
      certificate_file_name: fileMeta?.name ?? null,
      cost: form.cost ? Number(form.cost) : null,
      measurement_uncertainty: form.measurement_uncertainty || null,
      traceability: form.traceability || null,
      valid_until: form.valid_until || null,
      restrictions: form.restrictions || null,
      notes: form.notes || null,
      checkpoints: checkpoints.length
        ? checkpoints.map((c) => ({
            ...c,
            pass: c.tolerance != null && c.error != null ? Math.abs(c.error) <= c.tolerance : c.pass,
          }))
        : undefined,
    });
    reset();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar calibração</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.calibration_date}
                onChange={(e) => setForm({ ...form, calibration_date: e.target.value })} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external_lab">Laboratório externo</SelectItem>
                  <SelectItem value="internal">Interna</SelectItem>
                  <SelectItem value="manufacturer">Fabricante</SelectItem>
                  <SelectItem value="self_check">Verificação interna</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resultado</Label>
              <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="approved_with_restriction">Aprovado com restrição</SelectItem>
                  <SelectItem value="reproved">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fornecedor (categoria calibração)</Label>
              <Select value={form.provider_supplier_id || "none"} onValueChange={(v) => setForm({ ...form, provider_supplier_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum / Interno —</SelectItem>
                  {calibrationSuppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nº do Certificado</Label>
              <Input value={form.certificate_number} onChange={(e) => setForm({ ...form, certificate_number: e.target.value })} />
            </div>
            <div>
              <Label>Custo (R$)</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <div>
              <Label>Incerteza</Label>
              <Input value={form.measurement_uncertainty} onChange={(e) => setForm({ ...form, measurement_uncertainty: e.target.value })} />
            </div>
            <div>
              <Label>Validade do certificado</Label>
              <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Rastreabilidade (padrão usado)</Label>
              <Input value={form.traceability} onChange={(e) => setForm({ ...form, traceability: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Restrições / observações</Label>
              <Textarea rows={2} value={form.restrictions} onChange={(e) => setForm({ ...form, restrictions: e.target.value })} />
            </div>
          </div>

          {/* Upload certificado */}
          <div>
            <Label>Certificado (PDF)</Label>
            <div className="relative">
              <Button type="button" variant="outline" className="w-full justify-start" disabled={uploading}>
                {fileMeta ? (
                  <><FileCheck className="h-4 w-4 mr-2 text-success" /> {fileMeta.name}</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> {uploading ? "Enviando..." : "Selecionar arquivo"}</>
                )}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/*"
                className="opacity-0 absolute inset-0 cursor-pointer"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </div>
          </div>

          {/* Checkpoints */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Pontos de verificação</h4>
                <Button size="sm" variant="outline" onClick={addCheckpoint}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar ponto
                </Button>
              </div>
              {checkpoints.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhum ponto registrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left p-1">Nominal</th>
                        <th className="text-left p-1">Medido</th>
                        <th className="text-left p-1">Erro</th>
                        <th className="text-left p-1">Tolerância</th>
                        <th className="p-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkpoints.map((c, i) => (
                        <tr key={i}>
                          <td className="p-1"><Input type="number" step="any" value={c.nominal_value ?? ""} onChange={(e) => updateCheckpoint(i, { nominal_value: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                          <td className="p-1"><Input type="number" step="any" value={c.measured_value ?? ""} onChange={(e) => updateCheckpoint(i, { measured_value: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                          <td className="p-1"><Input type="number" step="any" value={c.error ?? ""} onChange={(e) => updateCheckpoint(i, { error: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                          <td className="p-1"><Input type="number" step="any" value={c.tolerance ?? ""} onChange={(e) => updateCheckpoint(i, { tolerance: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                          <td className="p-1"><Button size="icon" variant="ghost" onClick={() => removeCheckpoint(i)}><Trash2 className="h-4 w-4" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <SheetFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={create.isPending || uploading}>
            {create.isPending ? "Registrando..." : "Registrar calibração"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default CalibrationDrawer;
