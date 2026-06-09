import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useObjectiveRisks, useObjectiveParties } from "@/hooks/useQualityObjectiveLinks";
import { useQualityRisks } from "@/hooks/useQualityRisks";
import { useQualityInterestedParties } from "@/hooks/useQualityInterestedParties";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  objectiveId: string | null;
}

const ObjectiveTraceabilityPanel = ({ objectiveId }: Props) => {
  const { linkedRiskIds, set: setRisks } = useObjectiveRisks(objectiveId);
  const { linkedPartyIds, set: setParties } = useObjectiveParties(objectiveId);
  const { risks } = useQualityRisks();
  const { parties } = useQualityInterestedParties();

  const availableRisks = useMemo(() => risks.filter((r) => !linkedRiskIds.includes(r.id)), [risks, linkedRiskIds]);
  const availableParties = useMemo(() => parties.filter((p) => !linkedPartyIds.includes(p.id)), [parties, linkedPartyIds]);

  if (!objectiveId) {
    return (
      <p className="text-xs text-muted-foreground">
        Salve o objetivo primeiro para vincular riscos e partes interessadas.
      </p>
    );
  }

  const addRisk = (id: string) => setRisks.mutate([...linkedRiskIds, id]);
  const removeRisk = (id: string) => setRisks.mutate(linkedRiskIds.filter((r) => r !== id));
  const addParty = (id: string) => setParties.mutate([...linkedPartyIds, id]);
  const removeParty = (id: string) => setParties.mutate(linkedPartyIds.filter((p) => p !== id));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Riscos vinculados</Label>
        <div className="flex flex-wrap gap-2">
          {linkedRiskIds.map((id) => {
            const r = risks.find((x) => x.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1">
                {r?.code ?? "?"} — {r?.title ?? "(removido)"}
                <Button size="icon" variant="ghost" className="h-4 w-4 p-0" onClick={() => removeRisk(id)}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
          {linkedRiskIds.length === 0 && (
            <span className="text-xs text-muted-foreground">Nenhum risco vinculado.</span>
          )}
        </div>
        {availableRisks.length > 0 && (
          <Select value="" onValueChange={addRisk}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Adicionar risco…" /></SelectTrigger>
            <SelectContent>
              {availableRisks.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.code} — {r.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label>Partes interessadas vinculadas</Label>
        <div className="flex flex-wrap gap-2">
          {linkedPartyIds.map((id) => {
            const p = parties.find((x) => x.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1">
                {p?.name ?? "(removida)"}
                <Button size="icon" variant="ghost" className="h-4 w-4 p-0" onClick={() => removeParty(id)}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
          {linkedPartyIds.length === 0 && (
            <span className="text-xs text-muted-foreground">Nenhuma parte interessada vinculada.</span>
          )}
        </div>
        {availableParties.length > 0 && (
          <Select value="" onValueChange={addParty}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Adicionar parte interessada…" /></SelectTrigger>
            <SelectContent>
              {availableParties.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
};

export default ObjectiveTraceabilityPanel;
