import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQualitySupplierDocuments } from "@/hooks/useQualitySuppliers";

interface Props {
  supplierId: string;
}

const SupplierDocumentsList = ({ supplierId }: Props) => {
  const { items, create, remove } = useQualitySupplierDocuments(supplierId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ document_type: "", file_name: "", file_url: "", valid_until: "" });

  const save = async () => {
    if (!form.document_type || !form.file_name || !form.file_url) return;
    await create.mutateAsync({
      supplier_id: supplierId,
      document_type: form.document_type,
      file_name: form.file_name,
      file_url: form.file_url,
      valid_until: form.valid_until || null,
    });
    setForm({ document_type: "", file_name: "", file_url: "", valid_until: "" });
    setOpen(false);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">Documentos do fornecedor</h4>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum documento.</p>
        ) : (
          <div className="space-y-2">
            {items.map((d) => {
              const expired = d.valid_until && new Date(d.valid_until) < new Date();
              return (
                <div key={d.id} className="flex items-center justify-between border rounded p-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.document_type}
                      {d.valid_until && (
                        <span className={`ml-2 ${expired ? "text-destructive font-medium" : ""}`}>
                          Validade: {format(parseISO(d.valid_until), "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" asChild>
                      <a href={d.file_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar documento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Tipo *</Label>
                <Input
                  placeholder="Ex.: Cartão CNPJ, ISO 9001, Contrato"
                  value={form.document_type}
                  onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                />
              </div>
              <div>
                <Label>Nome do arquivo *</Label>
                <Input value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} />
              </div>
              <div>
                <Label>URL do arquivo *</Label>
                <Input
                  placeholder="https://..."
                  value={form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                />
              </div>
              <div>
                <Label>Validade (opcional)</Label>
                <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={!form.document_type || !form.file_name || !form.file_url}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SupplierDocumentsList;
