import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import RiskRegisterTable from "@/components/quality/RiskRegisterTable";
import RiskAssessmentDrawer from "@/components/quality/RiskAssessmentDrawer";
import RiskMatrix5x5 from "@/components/quality/RiskMatrix5x5";
import { useQualityRisks, type QualityRisk } from "@/hooks/useQualityRisks";

const QualityRisksPage = () => {
  const { items } = useQualityRisks();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<QualityRisk | null>(null);
  const [cellFilter, setCellFilter] = useState<{ probability: number; impact: number } | null>(null);

  const risks = items.filter((r) => r.kind === "risk");
  const opportunities = items.filter((r) => r.kind === "opportunity");

  const matrixFilteredRisks = cellFilter
    ? risks.filter((r) => r.probability === cellFilter.probability && r.impact === cellFilter.impact)
    : risks;

  const openNew = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (r: QualityRisk) => { setEditing(r); setDrawerOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Riscos & Oportunidades</h2>
          <p className="text-muted-foreground">ISO 9001 §6.1 — identificação, tratamento e revisão periódica.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo</Button>
      </div>

      <Tabs defaultValue="risks">
        <TabsList>
          <TabsTrigger value="risks">Riscos ({risks.length})</TabsTrigger>
          <TabsTrigger value="opportunities">Oportunidades ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="matrix">Matriz 5×5</TabsTrigger>
        </TabsList>

        <TabsContent value="risks" className="mt-4">
          <RiskRegisterTable risks={risks} onEdit={openEdit} emptyText="Nenhum risco cadastrado." />
        </TabsContent>

        <TabsContent value="opportunities" className="mt-4">
          <RiskRegisterTable risks={opportunities} onEdit={openEdit} emptyText="Nenhuma oportunidade cadastrada." />
        </TabsContent>

        <TabsContent value="matrix" className="mt-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-shrink-0">
              <RiskMatrix5x5
                risks={risks}
                selected={cellFilter}
                onCellClick={(p, i) => {
                  setCellFilter((c) => c?.probability === p && c?.impact === i ? null : { probability: p, impact: i });
                }}
              />
              {cellFilter && (
                <div className="text-xs text-muted-foreground mt-2">
                  Filtrando P={cellFilter.probability}, I={cellFilter.impact}.
                  <Button size="sm" variant="link" onClick={() => setCellFilter(null)}>Limpar</Button>
                </div>
              )}
            </div>
            <div className="flex-1">
              <RiskRegisterTable risks={matrixFilteredRisks} onEdit={openEdit} emptyText="Nenhum risco nesta célula." />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <RiskAssessmentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} risk={editing} />
    </div>
  );
};

export default QualityRisksPage;
