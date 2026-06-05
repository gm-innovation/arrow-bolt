import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQualitySuppliers, type QualitySupplier } from "@/hooks/useQualitySuppliers";

interface Props {
  open: boolean;
  onClose: () => void;
  supplier?: QualitySupplier | null;
}

const blank = {
  name: "",
  tax_id: "",
  category: "material" as const,
  criticality: "medium" as const,
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  scope_description: "",
  notes: "",
  requalification_frequency_months: 12,
};

const SupplierFormDialog = ({ open, onClose, supplier }: Props) => {
  const { upsert } = useQualitySuppliers();
  const [form, setForm] = useState<any>(blank);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        tax_id: supplier.tax_id ?? "",
        category: supplier.category,
        criticality: supplier.criticality,
        contact_name: supplier.contact_name ?? "",
        contact_email: supplier.contact_email ?? "",
        contact_phone: supplier.contact_phone ?? "",
        scope_description: supplier.scope_description ?? "",
        notes: supplier.notes ?? "",
        requalification_frequency_months: supplier.requalification_frequency_months,
      });
    } else {
      setForm(blank);
    }
  }, [supplier, open]);

  const save = async () => {
    if (!form.name.trim()) return;
    await upsert.mutateAsync({
      ...(supplier?.id ? { id: supplier.id } : {}),
      ...form,
      tax_id: form.tax_id || null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>CNPJ/CPF</Label>
            <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="service">Serviço</SelectItem>
                <SelectItem value="calibration">Calibração</SelectItem>
                <SelectItem value="training">Treinamento</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="logistics">Logística</SelectItem>
                <SelectItem value="other">Outros</SelectItem>
              </SelectContent>
            </Select>
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
            <Label>Reavaliar a cada (meses)</Label>
            <Input
              type="number" min={1}
              value={form.requalification_frequency_months}
              onChange={(e) => setForm({ ...form, requalification_frequency_months: parseInt(e.target.value) || 12 })}
            />
          </div>
          <div>
            <Label>Contato — Nome</Label>
            <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Escopo de fornecimento</Label>
            <Textarea value={form.scope_description} onChange={(e) => setForm({ ...form, scope_description: e.target.value })} rows={2} />
          </div>
          <div className="col-span-2">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={!form.name.trim() || upsert.isPending}>
            {upsert.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierFormDialog;
