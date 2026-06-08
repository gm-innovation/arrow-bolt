import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Crown, Check, X } from "lucide-react";
import { useQualitySettings, type ApprovalScope } from "@/hooks/useQualitySettings";
import { useCentralApprovalsQueue } from "@/hooks/useCentralApproval";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { format, parseISO } from "date-fns";

const SCOPE_LABELS: Record<keyof ApprovalScope, string> = {
  document: "Documentos do SGQ",
  company_document: "Documentos da Empresa",
  process: "Processos",
  policy: "Política da Qualidade",
  context_official: "Snapshot oficial de Contexto",
  ncr: "Não-Conformidades (fechamento)",
  deviation: "Desvios",
};

const ENTITY_LABELS: Record<string, string> = {
  document: "Documento",
  company_document: "Documento da Empresa",
  process: "Processo",
  policy: "Política",
  context_official: "Contexto (oficial)",
  ncr: "NC",
  deviation: "Desvio",
};

const CentralApproval = () => {
  const { settings, approvalScope, isMaster, upsert } = useQualitySettings();
  const { data: users = [] } = useCompanyUsers();
  const { pending, decide } = useCentralApprovalsQueue();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Aprovação central / workflow</h3>
        <p className="text-sm text-muted-foreground">Designe o Master de Qualidade e defina os tipos de registro que exigem aprovação central.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Crown className="h-4 w-4" />Master de Qualidade</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label>Usuário designado (aprova centralmente)</Label>
          <Select
            value={settings?.quality_master_user_id || "none"}
            onValueChange={(v) => upsert.mutate({ quality_master_user_id: v === "none" ? null : v })}
          >
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Nenhum —</SelectItem>
              {(users as any[]).map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          {isMaster && <Badge className="bg-emerald-600">Você é o Master desta empresa</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Escopo da aprovação central</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {(Object.keys(SCOPE_LABELS) as (keyof ApprovalScope)[]).map(k => (
            <div key={k} className="flex items-center justify-between border rounded p-3">
              <Label className="cursor-pointer">{SCOPE_LABELS[k]}</Label>
              <Switch
                checked={approvalScope[k]}
                onCheckedChange={(v) => upsert.mutate({ approval_scope: { [k]: v } as any })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fila de aprovações pendentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!isMaster ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Apenas o Master designado pode decidir as aprovações desta fila.
              {pending.length > 0 && <div className="mt-1">{pending.length} pendente(s) aguardando o Master.</div>}
            </div>
          ) : pending.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sem aprovações pendentes.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tipo</TableHead><TableHead>Solicitada em</TableHead><TableHead>Notas</TableHead><TableHead className="w-40"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pending.map(a => (
                  <TableRow key={a.id}>
                    <TableCell><Badge variant="outline">{ENTITY_LABELS[a.entity_type] || a.entity_type}</Badge></TableCell>
                    <TableCell className="text-sm">{format(parseISO(a.requested_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="text-sm">{a.notes || "—"}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="default" onClick={() => decide.mutate({ id: a.id, status: "approved" })}>
                        <Check className="h-4 w-4 mr-1" />Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => decide.mutate({ id: a.id, status: "rejected" })}>
                        <X className="h-4 w-4 mr-1" />Rejeitar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CentralApproval;
