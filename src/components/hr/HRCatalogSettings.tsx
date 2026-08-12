import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  useHRDepartments,
  useHRPositions,
  useSavePosition,
  useDeletePosition,
  useSaveDepartmentMeta,
} from "@/hooks/useHRCatalogs";

const NONE = "__none__";
const emptyPosition = {
  name: "",
  code: "",
  cbo: "",
  level: "",
  department_id: NONE,
  requires_driver_license: false,
  driver_license_category: "",
  requires_certification: false,
};

/** Manutenção do catálogo de funções e dos metadados de setores. */
export function HRCatalogSettings() {
  const { data: positions = [] } = useHRPositions(true);
  const { data: departments = [] } = useHRDepartments();
  const savePosition = useSavePosition();
  const deletePosition = useDeletePosition();
  const saveDept = useSaveDepartmentMeta();
  const [form, setForm] = useState(emptyPosition);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const add = () => {
    if (!form.name.trim()) return;
    savePosition.mutate(
      {
        name: form.name.trim(),
        code: form.code || null,
        cbo: form.cbo || null,
        level: form.level || null,
        department_id: form.department_id === NONE ? null : form.department_id,
        requires_driver_license: form.requires_driver_license,
        driver_license_category: form.driver_license_category || null,
        requires_certification: form.requires_certification,
      } as any,
      { onSuccess: () => setForm(emptyPosition) },
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Funções</CardTitle>
          <CardDescription>Catálogo de funções com código, CBO, nível e exigências.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {positions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma função cadastrada.</p>}
            {positions.map((p) => (
              <div key={p.id} className="flex items-center gap-2 border rounded-md p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[p.code, p.cbo ? `CBO ${p.cbo}` : null, p.level, departments.find((d) => d.id === p.department_id)?.name]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                {p.requires_driver_license && (
                  <Badge variant="outline" className="text-xs">CNH {p.driver_license_category || ""}</Badge>
                )}
                {p.requires_certification && <Badge variant="outline" className="text-xs">Certificação</Badge>}
                <Button size="sm" variant="outline" onClick={() => savePosition.mutate({ id: p.id, name: p.name, active: !p.active })}>
                  {p.active ? "Desativar" : "Ativar"}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deletePosition.mutate(p.id)} aria-label="Remover função">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="border rounded-md p-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Código</Label>
                <Input value={form.code} onChange={(e) => set("code", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">CBO</Label>
                <Input value={form.cbo} onChange={(e) => set("cbo", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Nível</Label>
                <Input value={form.level} onChange={(e) => set("level", e.target.value)} placeholder="Ex.: I-C" />
              </div>
              <div>
                <Label className="text-xs">Setor relacionado</Label>
                <Select value={form.department_id} onValueChange={(v) => set("department_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem setor</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria de CNH exigida</Label>
                <Input value={form.driver_license_category} onChange={(e) => set("driver_license_category", e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-2">
                <Checkbox checked={form.requires_driver_license} onCheckedChange={(v) => set("requires_driver_license", !!v)} /> Exige CNH
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={form.requires_certification} onCheckedChange={(v) => set("requires_certification", !!v)} /> Exige certificação
              </label>
            </div>
            <Button size="sm" onClick={add} disabled={savePosition.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar função
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setores</CardTitle>
          <CardDescription>Código, centro de custo e limite de ausências simultâneas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {departments.map((d) => (
            <DepartmentRow key={d.id} department={d} onSave={(patch) => saveDept.mutate({ id: d.id, ...patch })} />
          ))}
          {departments.length === 0 && <p className="text-sm text-muted-foreground">Nenhum setor cadastrado.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function DepartmentRow({
  department,
  onSave,
}: {
  department: { id: string; name: string; code: string | null; cost_center: string | null; allow_simultaneous_absences: boolean; max_simultaneous_absences: number | null };
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [code, setCode] = useState(department.code ?? "");
  const [costCenter, setCostCenter] = useState(department.cost_center ?? "");
  const [allow, setAllow] = useState(department.allow_simultaneous_absences);
  const [max, setMax] = useState(department.max_simultaneous_absences?.toString() ?? "");

  return (
    <div className="border rounded-md p-3 space-y-2">
      <p className="text-sm font-medium">{department.name}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Código</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Centro de custo</Label>
          <Input value={costCenter} onChange={(e) => setCostCenter(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Máx. ausentes simultâneos</Label>
          <Input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={allow} onCheckedChange={(v) => setAllow(!!v)} /> Permite ausências simultâneas
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onSave({
              code: code || null,
              cost_center: costCenter || null,
              allow_simultaneous_absences: allow,
              max_simultaneous_absences: max === "" ? null : Number(max),
            })
          }
        >
          Salvar setor
        </Button>
      </div>
    </div>
  );
}
