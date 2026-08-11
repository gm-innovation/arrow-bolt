import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { UserRound } from "lucide-react";

const UNASSIGNED = "__none__";

interface Props {
  value?: string | null;
  onChange?: (userId: string | null) => void;
  disabled?: boolean;
  className?: string;
  /** Somente leitura: mostra o nome sem o seletor */
  readOnly?: boolean;
}

/**
 * Seletor de responsável (colaborador da empresa) reutilizável no CRM.
 * Resolve o nome a partir da lista de usuários da empresa, sem expor dados sensíveis.
 */
export const AssigneeSelect = ({ value, onChange, disabled, className, readOnly }: Props) => {
  const { data: users = [] } = useCompanyUsers();
  const current = users.find((u: any) => u.id === value);

  if (readOnly || !onChange) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
        {current?.full_name || <span className="text-muted-foreground">Não atribuído</span>}
      </span>
    );
  }

  return (
    <Select
      value={value || UNASSIGNED}
      onValueChange={(v) => onChange(v === UNASSIGNED ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className={className || "h-8 w-44 text-xs"}>
        <SelectValue placeholder="Não atribuído" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Não atribuído</SelectItem>
        {users.map((u: any) => (
          <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AssigneeSelect;
