import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { AuvoTaskReportView } from "./AuvoTaskReportView";
import type { AuvoServiceMember } from "@/hooks/useAuvoServiceGroups";

interface Props {
  members: AuvoServiceMember[];
  initialTaskUid?: string | null;
}

const label = (m: AuvoServiceMember) => {
  const date = m.task_date ? format(parseISO(m.task_date), "dd/MM", { locale: ptBR }) : "s/ data";
  const tech = (m.technician_name ?? "").split(" ")[0] || "—";
  return `${date} · ${tech}`;
};

/** Um serviço pode ter vários atendimentos/relatórios — exibe todos, um por aba. */
export const AuvoServiceReportTabs = ({ members, initialTaskUid }: Props) => {
  const [active, setActive] = useState<string | null>(
    initialTaskUid ?? members[0]?.id ?? null,
  );

  if (members.length === 0) {
    return (
      <p className="rounded-md border p-4 text-sm text-muted-foreground">
        Nenhum atendimento vinculado a este serviço.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {members.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {members.length} atendimentos neste serviço:
          </span>
          {members.map((m) => (
            <Button
              key={m.id}
              size="sm"
              variant={active === m.id ? "default" : "outline"}
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setActive(m.id)}
            >
              <FileText className="h-3 w-3" />
              {label(m)}
              {!m.hasReport && (
                <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
                  s/ relatório
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}
      <AuvoTaskReportView auvoTaskUid={active} />
    </div>
  );
};
