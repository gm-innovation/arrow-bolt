import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  useEmployeeDependents,
  useEmployeeProfile,
  useSaveRegistryRow,
  useDeleteRegistryRow,
  useUpdateEmployeeProfile,
} from "@/hooks/useEmployeeRegistry";
import { DEPENDENT_RELATION_OPTIONS, formatCPF, isValidCPF, optionLabel } from "@/lib/hr/employeeRegistry";
import { formatLocalDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const empty = {
  name: "",
  relationship: "filho",
  birth_date: "",
  cpf: "",
  has_disability: false,
  for_benefit: false,
  for_income_tax: false,
  for_health_plan: false,
};

/** Dependentes do colaborador + resumo (possui/quantidade) no cadastro. */
export function DependentsTab({ employeeId, companyId }: { employeeId: string; companyId: string }) {
  const { data: dependents = [] } = useEmployeeDependents(employeeId);
  const { data: profile } = useEmployeeProfile(employeeId);
  const save = useSaveRegistryRow("hr_employee_dependents");
  const del = useDeleteRegistryRow("hr_employee_dependents");
  const updateProfile = useUpdateEmployeeProfile();
  const [form, setForm] = useState(empty);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const add = () => {
    if (!form.name.trim()) return;
    if (form.cpf && !isValidCPF(form.cpf)) {
      toast({ title: "CPF inválido", variant: "destructive" });
      return;
    }
    save.mutate(
      {
        ...form,
        cpf: form.cpf ? formatCPF(form.cpf) : null,
        birth_date: form.birth_date || null,
        employee_id: employeeId,
        company_id: companyId,
      },
      { onSuccess: () => setForm(empty) },
    );
  };

  const syncSummary = () =>
    updateProfile.mutate({
      employeeId,
      patch: { has_dependents: dependents.length > 0, dependents_count: dependents.length },
    });

  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">
          {profile?.has_dependents ? "Possui dependentes" : "Sem dependentes"} · informado: {profile?.dependents_count ?? 0}
        </Badge>
        <span>cadastrados: {dependents.length}</span>
        <Button size="sm" variant="outline" onClick={syncSummary} disabled={updateProfile.isPending}>
          Sincronizar resumo
        </Button>
      </div>

      {dependents.length === 0 && <p className="text-sm text-muted-foreground">Nenhum dependente cadastrado.</p>}
      <div className="space-y-2">
        {dependents.map((d) => (
          <div key={d.id} className="flex items-start gap-2 border rounded-md p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {[
                  optionLabel(DEPENDENT_RELATION_OPTIONS, d.relationship),
                  d.birth_date ? formatLocalDate(d.birth_date) : null,
                  d.cpf,
                ].filter(Boolean).join(" · ")}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {d.has_disability && <Badge variant="outline" className="text-xs">PCD</Badge>}
                {d.for_benefit && <Badge variant="outline" className="text-xs">Benefício</Badge>}
                {d.for_income_tax && <Badge variant="outline" className="text-xs">IR</Badge>}
                {d.for_health_plan && <Badge variant="outline" className="text-xs">Plano de saúde</Badge>}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(d.id)} aria-label="Remover dependente">
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
            <Label className="text-xs">Parentesco</Label>
            <Select value={form.relationship} onValueChange={(v) => set("relationship", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEPENDENT_RELATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nascimento</Label>
            <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">CPF</Label>
            <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-2">
            <Checkbox checked={form.has_disability} onCheckedChange={(v) => set("has_disability", !!v)} /> PCD
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={form.for_benefit} onCheckedChange={(v) => set("for_benefit", !!v)} /> Benefício
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={form.for_income_tax} onCheckedChange={(v) => set("for_income_tax", !!v)} /> Imposto de renda
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={form.for_health_plan} onCheckedChange={(v) => set("for_health_plan", !!v)} /> Plano de saúde
          </label>
        </div>
        <Button size="sm" onClick={add} disabled={save.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar dependente
        </Button>
      </div>
    </div>
  );
}
