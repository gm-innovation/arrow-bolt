import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  useQualitySupplierEvaluations,
  type SupplierCriterionCode,
  type SupplierEvaluationKind,
} from "@/hooks/useQualitySuppliers";

interface Props {
  open: boolean;
  onClose: () => void;
  supplierId: string;
}

const criterionLabel: Record<SupplierCriterionCode, string> = {
  quality: "Qualidade",
  delivery: "Prazo de entrega",
  price: "Preço",
  support: "Suporte / Atendimento",
  compliance: "Conformidade documental",
  safety: "SSMA / Segurança",
};

const defaultCriteria = (Object.keys(criterionLabel) as SupplierCriterionCode[]).map((c) => ({
  criterion_code: c,
  weight: 1,
  score: 80,
  notes: "" as string,
}));

const SupplierEvaluationDrawer = ({ open, onClose, supplierId }: Props) => {
  const { create } = useQualitySupplierEvaluations(supplierId);
  const [kind, setKind] = useState<SupplierEvaluationKind>("periodic");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [summary, setSummary] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [criteria, setCriteria] = useState(defaultCriteria);

  const totalWeight = criteria.reduce((s, c) => s + (c.weight || 0), 0);
  const previewScore = totalWeight > 0
    ? Math.round((criteria.reduce((s, c) => s + (c.score || 0) * (c.weight || 0), 0) / totalWeight) * 100) / 100
    : 0;
  const previewGrade =
    previewScore >= 90 ? "A" : previewScore >= 75 ? "B" : previewScore >= 60 ? "C" : "D";

  const save = async () => {
    await create.mutateAsync({
      supplier_id: supplierId,
      kind,
      evaluation_date: date,
      period_start: periodStart || null,
      period_end: periodEnd || null,
      summary: summary || null,
      recommendations: recommendations || null,
      criteria,
    });
    // reset
    setSummary(""); setRecommendations(""); setPeriodStart(""); setPeriodEnd("");
    setCriteria(defaultCriteria);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova avaliação</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v: any) => setKind(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="initial">Qualificação inicial</SelectItem>
                <SelectItem value="periodic">Periódica</SelectItem>
                <SelectItem value="incident">Pós-incidente</SelectItem>
                <SelectItem value="requalification">Requalificação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Período de</Label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div>
            <Label>Período até</Label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Label>Critérios (peso × nota 0-100)</Label>
          {criteria.map((c, i) => (
            <Card key={c.criterion_code}>
              <CardContent className="p-3 grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4 text-sm font-medium pt-1">{criterionLabel[c.criterion_code]}</div>
                <div className="col-span-2">
                  <Label className="text-xs">Peso</Label>
                  <Input
                    type="number" min={0} step="0.5"
                    value={c.weight}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setCriteria((arr) => arr.map((x, idx) => (idx === i ? { ...x, weight: v } : x)));
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Nota</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={c.score}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setCriteria((arr) => arr.map((x, idx) => (idx === i ? { ...x, score: v } : x)));
                    }}
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Obs.</Label>
                  <Input
                    value={c.notes}
                    onChange={(e) => setCriteria((arr) => arr.map((x, idx) => (idx === i ? { ...x, notes: e.target.value } : x)))}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="text-sm text-muted-foreground text-right">
            Prévia: <span className="font-mono font-semibold">{previewScore}</span> → Conceito <span className="font-semibold">{previewGrade}</span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <Label>Resumo</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Recomendações</Label>
            <Textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} rows={2} />
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={create.isPending}>
            {create.isPending ? "Salvando..." : "Registrar avaliação"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default SupplierEvaluationDrawer;
