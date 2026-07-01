import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQualityOrgContext, type ContextCategory, type ContextItem, type ImpactLevel } from "@/hooks/useQualityOrgContext";
import { useDepartments } from "@/hooks/useDepartments";

interface Props {
  open: boolean;
  onClose: () => void;
  category: ContextCategory;
  item: ContextItem | null;
  defaultDepartmentId?: string | null;
  defaultAnalysisPeriod?: string | null;
}

const isSwot = (c: ContextCategory) => c.startsWith("swot_");

const ContextItemDialog = ({ open, onClose, category, item, defaultDepartmentId, defaultAnalysisPeriod }: Props) => {
  const { upsertItem } = useQualityOrgContext();
  const { departments } = useDepartments();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState<ImpactLevel | "">("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [analysisPeriod, setAnalysisPeriod] = useState<string>("");

  useEffect(() => {
    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
    setImpact((item?.impact_level ?? "") as any);
    setDepartmentId(item?.department_id ?? defaultDepartmentId ?? "");
    setAnalysisPeriod(item?.analysis_period ?? defaultAnalysisPeriod ?? "");
  }, [item, open, defaultDepartmentId, defaultAnalysisPeriod]);

  const save = () => {
    if (!title.trim()) return;
    upsertItem.mutate(
      {
        id: item?.id,
        category,
        title: title.trim(),
        description: description || null,
        impact_level: (impact || null) as any,
        department_id: departmentId || null,
        analysis_period: analysisPeriod?.trim() || null,
      },
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
          <div className="grid grid-cols-2 gap-3">
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
            {isSwot(category) && (
              <div>
                <Label>Departamento</Label>
                <Select
                  value={departmentId || "all"}
                  onValueChange={(v) => setDepartmentId(v === "all" ? "" : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">— Organização toda —</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {isSwot(category) && (
            <div>
              <Label>Período de análise</Label>
              <Input
                value={analysisPeriod}
                onChange={(e) => setAnalysisPeriod(e.target.value)}
                placeholder="Ex.: 2026, 2026-Q1, 2026-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Usado para manter SWOTs históricas sem sobrescrever análises antigas.</p>
            </div>
          )}
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
