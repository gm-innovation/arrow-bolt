import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { supabase } from "@/integrations/supabase/client";
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
 * Resolve o nome pela view pública de perfis, sem expor dados sensíveis.
 */
export const AssigneeSelect = ({ value, onChange, disabled, className, readOnly }: Props) => {
  const { data: users = [] } = useCompanyUsers();
  const current = users.find((u) => u.id === value);

  // Fallback: responsável fora da lista carregada (ex.: inativo ou lista parcial)
  const { data: fallbackName } = useQuery({
    queryKey: ["assignee-name", value],
    queryFn: async () => {
      if (!value) return null;
      const { data } = await supabase
        .from("profiles_public")
        .select("full_name")
        .eq("id", value)
        .maybeSingle();
      return data?.full_name ?? null;
    },
    enabled: !!value && !current,
    staleTime: 1000 * 60 * 10,
  });

  const displayName = current?.full_name || fallbackName || null;

  if (readOnly || !onChange) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
        {displayName || <span className="text-muted-foreground">Não atribuído</span>}
      </span>
    );
  }

  const options = current || !value || !displayName
    ? users
    : [...users, { id: value, full_name: displayName }];

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
        {options.map((u) => (
          <SelectItem key={u.id} value={u.id}>{u.full_name || "Sem nome"}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AssigneeSelect;
