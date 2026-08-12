import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEmployeeProfile, useUpdateEmployeeProfile } from "@/hooks/useEmployeeRegistry";
import { useHRDepartments, useHRPositions } from "@/hooks/useHRCatalogs";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import {
  EMPLOYEE_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  optionLabel,
  tenureLabel,
} from "@/lib/hr/employeeRegistry";
import { formatLocalDate } from "@/lib/utils";

const NONE = "__none__";

/** Bloco profissional: vínculo, setor, função, matrícula, desligamento. */
export function ProfessionalTab({ employeeId }: { employeeId: string }) {
  const { data: profile, isLoading } = useEmployeeProfile(employeeId);
  const { data: departments = [] } = useHRDepartments();
  const { data: positions = [] } = useHRPositions();
  const { data: colleagues = [] } = useCompanyUsers();
  const update = useUpdateEmployeeProfile();
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (profile) {
      setForm({
        registration_number: profile.registration_number ?? "",
        source_code: profile.source_code ?? "",
        employment_type: profile.employment_type ?? NONE,
        department_id: profile.department_id ?? NONE,
        position_id: profile.position_id ?? NONE,
        position_level: profile.position_level ?? "",
        position_start_date: profile.position_start_date ?? "",
        hire_date: profile.hire_date ?? "",
        direct_manager_id: profile.direct_manager_id ?? NONE,
        employee_status: profile.employee_status ?? "ativo",
        termination_date: profile.termination_date ?? "",
        termination_reason: profile.termination_reason ?? "",
        hr_notes: profile.hr_notes ?? "",
      });
    }
  }, [profile]);

  if (isLoading || !profile) return <p className="text-sm text-muted-foreground py-6">Carregando...</p>;

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const clean = (v: any) => (v === NONE || v === "" ? null : v);

  const save = () =>
    update.mutate({
      employeeId,
      patch: {
        registration_number: clean(form.registration_number),
        source_code: clean(form.source_code),
        employment_type: clean(form.employment_type),
        department_id: clean(form.department_id),
        position_id: clean(form.position_id),
        position_level: clean(form.position_level),
        position_start_date: clean(form.position_start_date),
        hire_date: clean(form.hire_date),
        direct_manager_id: clean(form.direct_manager_id),
        employee_status: form.employee_status,
        termination_date: clean(form.termination_date),
        termination_reason: clean(form.termination_reason),
        hr_notes: clean(form.hr_notes),
      },
    });

  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{optionLabel(EMPLOYEE_STATUS_OPTIONS, profile.employee_status)}</Badge>
        <span className="text-xs text-muted-foreground">
          Admissão: {profile.hire_date ? formatLocalDate(profile.hire_date) : "—"} · Tempo de casa: {tenureLabel(profile.hire_date)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Matrícula</Label>
          <Input value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Código de origem</Label>
          <Input value={form.source_code} onChange={(e) => set("source_code", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Tipo de vínculo</Label>
          <Select value={form.employment_type} onValueChange={(v) => set("employment_type", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Não informado</SelectItem>
              {EMPLOYMENT_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Setor</Label>
          <Select value={form.department_id} onValueChange={(v) => set("department_id", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sem setor</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Função</Label>
          <Select value={form.position_id} onValueChange={(v) => set("position_id", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sem função no catálogo</SelectItem>
              {positions.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {profile.position && (
            <p className="text-[11px] text-muted-foreground mt-1">Texto atual: {profile.position}</p>
          )}
        </div>
        <div>
          <Label className="text-xs">Nível da função</Label>
          <Input value={form.position_level} onChange={(e) => set("position_level", e.target.value)} placeholder="Ex.: I-C" />
        </div>
        <div>
          <Label className="text-xs">Início na função</Label>
          <Input type="date" value={form.position_start_date} onChange={(e) => set("position_start_date", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Data de admissão</Label>
          <Input type="date" value={form.hire_date} onChange={(e) => set("hire_date", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Gestor direto</Label>
          <Select value={form.direct_manager_id} onValueChange={(v) => set("direct_manager_id", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sem gestor</SelectItem>
              {colleagues.filter((c) => c.id !== employeeId).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.full_name || "Sem nome"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Situação</Label>
          <Select value={form.employee_status} onValueChange={(v) => set("employee_status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EMPLOYEE_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Data de desligamento</Label>
          <Input type="date" value={form.termination_date} onChange={(e) => set("termination_date", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Motivo do desligamento</Label>
          <Input value={form.termination_reason} onChange={(e) => set("termination_reason", e.target.value)} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Observações cadastrais (restrito ao RH)</Label>
        <Textarea rows={3} value={form.hr_notes} onChange={(e) => set("hr_notes", e.target.value)} />
      </div>

      <Button onClick={save} disabled={update.isPending}>
        {update.isPending ? "Salvando..." : "Salvar dados profissionais"}
      </Button>
    </div>
  );
}
