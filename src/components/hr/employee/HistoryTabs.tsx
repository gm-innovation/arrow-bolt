import { useEmployeeAssignments, useSensitiveAudit } from "@/hooks/useEmployeeRegistry";
import { useHRDepartments, useHRPositions } from "@/hooks/useHRCatalogs";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { formatLocalDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Histórico de setor/função/gestor gerado automaticamente. */
export function AssignmentHistoryTab({ employeeId }: { employeeId: string }) {
  const { data: rows = [], isLoading } = useEmployeeAssignments(employeeId);
  const { data: departments = [] } = useHRDepartments();
  const { data: positions = [] } = useHRPositions(true);
  const { data: people = [] } = useCompanyUsers();

  const dep = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? (id ? "—" : "—");
  const pos = (id?: string | null, text?: string | null) =>
    positions.find((p) => p.id === id)?.name ?? text ?? "—";
  const person = (id?: string | null) => people.find((p) => p.id === id)?.full_name ?? (id ? "—" : "—");

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Carregando...</p>;
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground py-6">Nenhuma movimentação registrada ainda.</p>;

  return (
    <div className="space-y-3 py-4">
      {rows.map((r) => (
        <div key={r.id} className="border rounded-md p-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {formatLocalDate(r.valid_from)}
              {r.valid_to ? ` → ${formatLocalDate(r.valid_to)}` : " → atual"}
            </p>
            {r.change_reason && <Badge variant="secondary" className="text-xs">{r.change_reason}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            Setor: {dep(r.previous_department_id)} → {dep(r.new_department_id)}
          </p>
          <p className="text-xs text-muted-foreground">
            Função: {pos(r.previous_position_id, r.previous_position_text)} → {pos(r.new_position_id, r.new_position_text)}
          </p>
          <p className="text-xs text-muted-foreground">
            Gestor: {person(r.previous_manager_id)} → {person(r.new_manager_id)}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Auditoria de alterações em dados sensíveis. */
export function SensitiveAuditTab({ employeeId }: { employeeId: string }) {
  const { data: rows = [], isLoading } = useSensitiveAudit(employeeId);
  const { data: people = [] } = useCompanyUsers();
  const person = (id?: string | null) => people.find((p) => p.id === id)?.full_name ?? "Sistema";

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Carregando...</p>;
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground py-6">Nenhuma alteração de dado sensível registrada.</p>;

  return (
    <div className="space-y-2 py-4">
      {rows.map((r) => (
        <div key={r.id} className="border rounded-md p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{r.field_name}</p>
            <Badge variant="outline" className="text-xs">{r.entity}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {r.old_value ? `${r.old_value} → ` : ""}{r.new_value ?? "—"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {person(r.changed_by)} · {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} · origem: {r.origin}
          </p>
        </div>
      ))}
    </div>
  );
}
