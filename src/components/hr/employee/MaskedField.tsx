import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { maskSensitive } from "@/lib/hr/employeeRegistry";

const PRIVILEGED = ["hr", "director", "super_admin"];

interface MaskedFieldProps {
  value?: string | null;
  employeeId: string;
  companyId?: string | null;
  fieldName: string;
  format?: (v: string) => string;
}

/**
 * Exibe CPF/RG/CNH mascarado. A ação "revelar" é restrita a RH, diretoria e
 * super admin e registra o acesso na auditoria de dados sensíveis.
 */
export function MaskedField({ value, employeeId, companyId, fieldName, format }: MaskedFieldProps) {
  const { userRole, user } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const canReveal = !!userRole && (PRIVILEGED.includes(userRole) || user?.id === employeeId);

  if (!value) return <span className="text-muted-foreground">—</span>;

  const reveal = async () => {
    setRevealed(true);
    if (user?.id !== employeeId) {
      await supabase.from("hr_sensitive_data_audit").insert({
        company_id: companyId ?? null,
        employee_id: employeeId,
        entity: "visualizacao",
        field_name: fieldName,
        new_value: "revelado",
        changed_by: user?.id ?? null,
        origin: "manual",
      } as any);
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono">{revealed ? (format ? format(value) : value) : maskSensitive(value)}</span>
      {canReveal && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => (revealed ? setRevealed(false) : reveal())}
          aria-label={revealed ? "Ocultar" : "Revelar"}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      )}
    </span>
  );
}
