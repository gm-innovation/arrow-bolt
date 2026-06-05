import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQualityDocuments } from "@/hooks/useQualityDocuments";
import { useQualityDocumentTypes } from "@/hooks/useQualityDocumentTypes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
}

const NewDocumentDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { create } = useQualityDocuments();
  const { types } = useQualityDocumentTypes();
  const [form, setForm] = useState({
    document_type_id: "",
    code: "",
    title: "",
    classification: "",
    normative_reference: "",
    next_review_date: "",
    widely_visible: false,
  });

  useEffect(() => {
    if (open) {
      setForm({
        document_type_id: "",
        code: "",
        title: "",
        classification: "",
        normative_reference: "",
        next_review_date: "",
        widely_visible: false,
      });
    }
  }, [open]);

  const selectedType = types.find((t) => t.id === form.document_type_id);

  const onPickType = (id: string) => {
    const t = types.find((tt) => tt.id === id);
    setForm((f) => ({
      ...f,
      document_type_id: id,
      classification: f.classification || t?.default_classification || "",
    }));
  };

  const submit = async () => {
    if (!form.code || !form.title) return;
    const created = await create.mutateAsync({
      code: form.code.trim(),
      title: form.title.trim(),
      document_type_id: form.document_type_id || null,
      classification: form.classification || null,
      normative_reference: form.normative_reference || null,
      next_review_date: form.next_review_date || null,
      widely_visible: form.widely_visible,
    });
    onOpenChange(false);
    onCreated?.((created as any).id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo Documento</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.document_type_id} onValueChange={onPickType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.code_prefix} — {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {types.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Cadastre tipos em Configurações primeiro.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Código *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder={selectedType ? `${selectedType.code_prefix}-001` : "Ex.: PR-001"}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Classificação</Label>
              <Input
                value={form.classification}
                onChange={(e) => setForm({ ...form, classification: e.target.value })}
                placeholder="Ex.: Confidencial / Interno"
              />
            </div>
            <div className="space-y-1">
              <Label>Próxima Revisão</Label>
              <Input
                type="date"
                value={form.next_review_date}
                onChange={(e) => setForm({ ...form, next_review_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Referência Normativa</Label>
            <Textarea
              rows={2}
              value={form.normative_reference}
              onChange={(e) => setForm({ ...form, normative_reference: e.target.value })}
              placeholder="Ex.: ISO 9001:2015, item 7.5"
            />
          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <Label>Visibilidade ampliada</Label>
              <p className="text-xs text-muted-foreground">
                Quando publicado, fica visível para todos da empresa (ex.: Política da Qualidade).
              </p>
            </div>
            <Switch
              checked={form.widely_visible}
              onCheckedChange={(v) => setForm({ ...form, widely_visible: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!form.code || !form.title || create.isPending}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewDocumentDialog;
