import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import CompetencyMatrixHeatmap from "@/components/quality/CompetencyMatrixHeatmap";
import RoleRequirementEditor from "@/components/quality/RoleRequirementEditor";
import CompetencyMappingDialog from "@/components/quality/CompetencyMappingDialog";
import DocumentPrerequisitesEditor from "@/components/quality/DocumentPrerequisitesEditor";
import { useQualityCompetencies, type CompetencyCategory } from "@/hooks/useQualityCompetencies";
import { useQualityCompetencyMappings } from "@/hooks/useQualityCompetencyMappings";

const CATEGORIES: CompetencyCategory[] = ["technical", "behavioral", "regulatory", "safety", "management"];

const CompetencyMatrixPage = () => {
  const { items, upsert, remove } = useQualityCompetencies();
  const { items: mappings, remove: removeMap } = useQualityCompetencyMappings();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState<CompetencyCategory>("technical");
  const [mappingOpen, setMappingOpen] = useState(false);

  const addCompetency = () => {
    if (!name.trim()) return;
    upsert.mutate({ name, description: desc, category: cat });
    setName(""); setDesc("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Matriz de Competência</h2>
        <p className="text-muted-foreground">ISO 9001 §7.2 — competências requeridas, nível atual, gaps e plano de capacitação.</p>
      </div>

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Matriz</TabsTrigger>
          <TabsTrigger value="catalog">Competências</TabsTrigger>
          <TabsTrigger value="requirements">Requisitos por Cargo</TabsTrigger>
          <TabsTrigger value="mappings">Mapeamentos</TabsTrigger>
          <TabsTrigger value="prereqs">Documentos × Cursos</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-4">
          <CompetencyMatrixHeatmap />
        </TabsContent>

        <TabsContent value="catalog" className="mt-4 space-y-3">
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select value={cat} onValueChange={(v) => setCat(v as CompetencyCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addCompetency}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
              <div className="md:col-span-4 space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma competência cadastrada.</p>
              ) : (
                <ul className="divide-y">
                  {items.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.category} · {c.description ?? "—"}</div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="mt-4">
          <RoleRequirementEditor />
        </TabsContent>

        <TabsContent value="mappings" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setMappingOpen(true)}><Plus className="h-4 w-4 mr-1" />Novo mapeamento</Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {mappings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum mapeamento cadastrado.</p>
              ) : (
                <ul className="divide-y">
                  {mappings.map((m) => {
                    const compName = items.find((c) => c.id === m.competency_id)?.name ?? m.competency_id;
                    return (
                      <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <div className="font-medium">{compName}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.evidence_type} · {m.source_label ?? m.source_id} · concede <b>{m.grants_level}</b>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeMap.mutate(m.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          {mappingOpen && (
            <CompetencyMappingDialog open={mappingOpen} onClose={() => setMappingOpen(false)} />
          )}
        </TabsContent>

        <TabsContent value="prereqs" className="mt-4">
          <DocumentPrerequisitesEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompetencyMatrixPage;
