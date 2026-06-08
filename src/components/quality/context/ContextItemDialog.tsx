import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQualityOrgContext, type ContextCategory, type ContextItem, type ImpactLevel } from "@/hooks/useQualityOrgContext";

interface Props {
  open: boolean;
  onClose: () => void;
  category: ContextCategory;
  item: ContextItem | null;
}

const ContextItemDialog = ({ open, onClose, category, item }: Props) => {
  const { upsertItem } = useQualityOrgContext();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState<ImpactLevel | "">("");

  useEffect(() => {
    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
    setImpact((item?.impact_level ?? "") as any);
  }, [item, open]);

  const save = () => {
    if (!title.trim()) return;
    upsertItem.mutate(
      { id: item?.id, category, title: title.trim(), description: description || null, impact_level: (impact || null) as any },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Editar item" : "Novo item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Dependência de fornecedor único" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
          <div>
            <Label>Nível de Impacto</Label>
            <Select value={impact || undefined} onValueChange={(v) => setImpact(v as ImpactLevel)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixo</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={!title.trim() || upsertItem.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContextItemDialog;
