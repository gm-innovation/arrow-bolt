import { useMemo } from "react";
import { AIAgent, AIAgentWriteAction } from "@/hooks/useAIAgents";
import { useAIAssistantActions } from "@/hooks/useAIAssistantActions";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type ModuleRow = { table: string; label: string };
type Group = { area: string; items: ModuleRow[] };

const GROUPS: Group[] = [
  { area: "Operações", items: [
    { table: "service_orders", label: "Ordens de Serviço" },
    { table: "technicians", label: "Técnicos" },
    { table: "measurements", label: "Medições" },
  ]},
  { area: "CRM / Comercial", items: [
    { table: "clients", label: "Clientes" },
    { table: "vessels", label: "Embarcações" },
    { table: "crm_opportunities", label: "Oportunidades" },
    { table: "crm_sales", label: "Vendas" },
    { table: "crm_products", label: "Produtos" },
    { table: "crm_recurrences", label: "Recorrências" },
    { table: "crm_tasks", label: "Tarefas" },
    { table: "crm_buyers", label: "Compradores" },
  ]},
  { area: "Suprimentos", items: [
    { table: "purchase_requests", label: "Requisições de compra" },
  ]},
  { area: "Financeiro", items: [
    { table: "finance_payables", label: "Contas a pagar" },
    { table: "finance_receivables", label: "Contas a receber" },
  ]},
  { area: "RH", items: [
    { table: "profiles", label: "Colaboradores" },
    { table: "technician_absences", label: "Ausências" },
    { table: "hr_vacation_requests", label: "Solicitações de férias" },
    { table: "hr_health_exams", label: "Exames ocupacionais" },
  ]},
  { area: "Qualidade", items: [
    { table: "quality_ncrs", label: "NCRs" },
    { table: "quality_audits", label: "Auditorias" },
    { table: "quality_documents", label: "Lista Mestra" },
    { table: "quality_company_documents", label: "Documentos da empresa" },
  ]},
  { area: "Corporativo", items: [
    { table: "corp_requests", label: "Solicitações internas" },
  ]},
];

const ALL_TABLES = GROUPS.flatMap(g => g.items.map(i => i.table));

interface Props {
  agent: AIAgent;
  draft: Partial<AIAgent>;
  setDraft: (d: Partial<AIAgent>) => void;
}

export function WriteActionsTab({ agent, draft, setDraft }: Props) {
  const currentScope = { ...(agent.scope ?? {}), ...(draft.scope ?? {}) };
  const wa = (currentScope.write_actions ?? {}) as Record<string, AIAgentWriteAction>;

  const isOn = (table: string, action: keyof AIAgentWriteAction) => {
    const cfg = wa[table];
    if (!cfg) return true; // default
    return cfg[action] !== false;
  };

  const setAction = (table: string, action: keyof AIAgentWriteAction, value: boolean) => {
    const next: Record<string, AIAgentWriteAction> = { ...wa };
    next[table] = { create: isOn(table, "create"), update: isOn(table, "update"), delete: isOn(table, "delete"), [action]: value };
    setDraft({ ...draft, scope: { ...currentScope, write_actions: next } });
  };

  const applyAll = (value: boolean) => {
    const next: Record<string, AIAgentWriteAction> = {};
    for (const t of ALL_TABLES) next[t] = { create: value, update: value, delete: value };
    setDraft({ ...draft, scope: { ...currentScope, write_actions: next } });
  };

  const { data: actions, isLoading } = useAIAssistantActions(agent.id, 20);

  const summary = useMemo(() => {
    let allowed = 0, denied = 0;
    for (const t of ALL_TABLES) {
      (["create", "update", "delete"] as const).forEach(a => (isOn(t, a) ? allowed++ : denied++));
    }
    return { allowed, denied };
  }, [wa]);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8 space-y-4">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            Controle o que a assistente pode <b>criar, editar ou excluir</b> por módulo. Mesmo com tudo habilitado aqui, a assistente
            sempre respeita as permissões RLS do usuário logado — se o usuário não pode fazer pela tela, a assistente também não consegue.
            Exclusões exigem <b>dupla confirmação textual</b> no chat.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {summary.allowed} ações permitidas · {summary.denied} bloqueadas
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => applyAll(true)}>Habilitar tudo</Button>
            <Button size="sm" variant="outline" onClick={() => applyAll(false)}>Somente leitura</Button>
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Módulo</th>
                <th className="text-center px-3 py-2 font-medium w-24">Criar</th>
                <th className="text-center px-3 py-2 font-medium w-24">Editar</th>
                <th className="text-center px-3 py-2 font-medium w-32">Excluir</th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map(group => (
                <>
                  <tr key={group.area} className="bg-muted/30">
                    <td colSpan={4} className="px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
                      {group.area}
                    </td>
                  </tr>
                  {group.items.map(item => (
                    <tr key={item.table} className="border-t">
                      <td className="px-3 py-2">
                        <div>{item.label}</div>
                        <div className="text-xs text-muted-foreground font-mono">{item.table}</div>
                      </td>
                      <td className="text-center">
                        <Switch checked={isOn(item.table, "create")} onCheckedChange={v => setAction(item.table, "create", v)} />
                      </td>
                      <td className="text-center">
                        <Switch checked={isOn(item.table, "update")} onCheckedChange={v => setAction(item.table, "update", v)} />
                      </td>
                      <td className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Switch checked={isOn(item.table, "delete")} onCheckedChange={v => setAction(item.table, "delete", v)} />
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">2 etapas</Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Últimas ações auditadas</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Todas as tentativas de escrita da assistente ficam registradas em <code>ai_assistant_actions</code>.
        </p>
        <ScrollArea className="h-[520px] border rounded-md p-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground p-2">Carregando…</p>
          ) : !actions?.length ? (
            <p className="text-xs text-muted-foreground p-2">Nenhuma ação registrada ainda para este agente.</p>
          ) : (
            <ul className="space-y-2">
              {actions.map(a => (
                <li key={a.id} className="text-xs border rounded-md p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{a.tool_name}</span>
                    {a.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </div>
                  <div className="text-muted-foreground font-mono">{a.table_name}{a.row_id ? ` · ${a.row_id.slice(0, 8)}` : ""}</div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{a.role ?? "—"}</span>
                    <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}</span>
                  </div>
                  {!a.success && a.error_message && (
                    <div className="text-destructive line-clamp-2">{a.error_message}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
