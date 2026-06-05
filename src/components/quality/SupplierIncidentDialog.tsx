import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQualitySupplierIncidents } from "@/hooks/useQualitySuppliers";
import { useQualityNCRs } from "@/hooks/useQualityNCRs";

interface Props {
  open: boolean;
  onClose: () => void;
  supplierId: string;
}

const SupplierIncidentDialog = ({ open, onClose, supplierId }: Props) => {
  const { create } = useQualitySupplierIncidents(supplierId);
  const { ncrs } = useQualityNCRs();
  const openNcrs = ncrs.filter((n: any) => !["closed", "cancelled"].includes(n.status));

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [description, setDescription] = useState("");
  const [linkedNcr, setLinkedNcr] = useState<string>("none");

  const save = async () => {
    if (!description.trim()) return;
    await create.mutateAsync({
      supplier_id: supplierId,
      incident_date: date,
      severity,
      description,
      linked_ncr_id: linkedNcr === "none" ? null : linkedNcr,
    });
    setDescription(""); setLinkedNcr("none"); setSeverity("medium");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar incidente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Severidade</Label>
              <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Vincular à NCR (opcional)</Label>
            <Select value={linkedNcr} onValueChange={setLinkedNcr}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {openNcrs.map((n: any) => (
                  <SelectItem key={n.id} value={n.id}>
                    NCR-{String(n.ncr_number).padStart(4, "0")} — {n.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={!description.trim() || create.isPending}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierIncidentDialog;
