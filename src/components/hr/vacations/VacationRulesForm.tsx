import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateVacationRules, useVacationRules, VacationRules } from "@/hooks/useVacations";

const NUMERIC: { key: keyof VacationRules; label: string; hint: string }[] = [
  { key: "max_ferias_por_mes", label: "Máx. colaboradores em férias por mês", hint: "Limite geral da empresa" },
  { key: "max_tecnicos_simultaneos", label: "Máx. técnicos simultâneos", hint: "Técnicos com férias sobrepostas" },
  { key: "max_dias_abono", label: "Máx. dias de abono (venda)", hint: "Limite legal: 10 dias" },
  { key: "max_parcelas", label: "Máx. parcelas por período", hint: "Só vale se a divisão for permitida" },
  { key: "antecedencia_minima_solicitacao_dias", label: "Antecedência mínima (dias)", hint: "Para novas solicitações" },
  { key: "tolerancia_sobreposicao_dias", label: "Tolerância de sobreposição (dias)", hint: "Sobreposição aceita entre técnicos" },
];

const FLAGS: { key: keyof VacationRules; label: string }[] = [
  { key: "permite_divisao_ferias", label: "Permitir divisão das férias em parcelas" },
  { key: "permite_ferias_em_periodo_experiencia", label: "Permitir férias durante a experiência" },
  { key: "notificar_financeiro", label: "Notificar o Financeiro nas aprovações" },
];

export function VacationRulesForm({ canEdit }: { canEdit: boolean }) {
  const { profile } = useAuth();
  const rules = useVacationRules(profile?.company_id);
  const update = useUpdateVacationRules();
  const [form, setForm] = useState<VacationRules | null>(null);

  useEffect(() => {
    if (rules.data) setForm(rules.data);
  }, [rules.data]);

  if (rules.isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Carregando regras...</p>;
  }
  if (!form) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma regra de férias cadastrada para esta empresa.
      </p>
    );
  }

  const save = () => {
    const { id, company_id: _c, ...patch } = form;
    update.mutate({ id, patch, updated_by: profile?.id });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limites operacionais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {NUMERIC.map((f) => (
            <div key={f.key as string}>
              <Label>{f.label}</Label>
              <Input
                type="number"
                min={0}
                disabled={!canEdit}
                value={String(form[f.key] ?? 0)}
                onChange={(e) =>
                  setForm({ ...form, [f.key]: Number(e.target.value) || 0 } as VacationRules)
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Políticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FLAGS.map((f) => (
            <div key={f.key as string} className="flex items-center justify-between gap-4">
              <Label className="cursor-pointer">{f.label}</Label>
              <Switch
                disabled={!canEdit}
                checked={Boolean(form[f.key])}
                onCheckedChange={(v) => setForm({ ...form, [f.key]: v } as VacationRules)}
              />
            </div>
          ))}
          <div>
            <Label>Observações</Label>
            <Textarea
              rows={3}
              disabled={!canEdit}
              value={form.observacoes ?? ""}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? "Salvando..." : "Salvar regras"}
          </Button>
        </div>
      )}
    </div>
  );
}
