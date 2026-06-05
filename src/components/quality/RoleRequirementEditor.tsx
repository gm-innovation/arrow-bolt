import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { useQualityCompetencies } from "@/hooks/useQualityCompetencies";
import { useQualityRoleRequirements, type CompetencyLevel } from "@/hooks/useQualityRoleRequirements";

const ROLES = [
  "super_admin", "director", "coordinator", "qualidade", "manager", "technician",
  "hr", "commercial", "financeiro", "compras", "marketing", "admin",
];
const LEVELS: CompetencyLevel[] = ["none", "basic", "intermediate", "advanced", "expert"];

const RoleRequirementEditor = () => {
  const [role, setRole] = useState<string>("technician");
  const [competencyId, setCompetencyId] = useState<string>("");
  const [level, setLevel] = useState<CompetencyLevel>("basic");
  const [mandatory, setMandatory] = useState(true);

  const { items: competencies } = useQualityCompetencies();
  const { items, upsert, remove } = useQualityRoleRequirements(role);

  const compById = useMemo(() => Object.fromEntries(competencies.map((c) => [c.id, c.name])), [competencies]);
  const available = competencies.filter((c) => !items.some((i) => i.competency_id === c.id));

  const add = () => {
    if (!competencyId) return;
    upsert.mutate({ role, competency_id: competencyId, required_level: level, is_mandatory: mandatory });
    setCompetencyId("");
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Cargo</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label className="text-xs">Competência</Label>
            <Select value={competencyId} onValueChange={setCompetencyId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {available.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nível requerido</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as CompetencyLevel)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch checked={mandatory} onCheckedChange={setMandatory} id="req-mand" />
            <Label htmlFor="req-mand" className="text-sm cursor-pointer">Obrigatório</Label>
          </div>
          <Button onClick={add} disabled={!competencyId}>
            <Plus className="h-4 w-4 mr-1" />Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma competência requerida para este cargo.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{compById[r.competency_id] ?? r.competency_id}</div>
                    <div className="text-xs text-muted-foreground">
                      Nível: {r.required_level} · {r.is_mandatory ? "obrigatório" : "desejável"}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleRequirementEditor;
