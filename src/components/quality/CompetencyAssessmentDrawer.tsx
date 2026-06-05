import { useEffect, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQualityMatrix, useUserCompetencyDetail } from "@/hooks/useQualityMatrix";
import type { CompetencyLevel } from "@/hooks/useQualityRoleRequirements";
import { format, parseISO } from "date-fns";
import { Sparkles, Save } from "lucide-react";

interface Props {
  userId: string;
  competencyId: string;
  open: boolean;
  onClose: () => void;
}

const LEVELS: CompetencyLevel[] = ["none", "basic", "intermediate", "advanced", "expert"];

const CompetencyAssessmentDrawer = ({ userId, competencyId, open, onClose }: Props) => {
  const { setManualLevel, acceptAutoSuggestion } = useQualityMatrix();
  const { data, isLoading } = useUserCompetencyDetail(userId, competencyId);
  const [level, setLevel] = useState<CompetencyLevel>("none");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (data?.competency) {
      setLevel(data.competency.current_level);
      setNotes(data.competency.assessment_notes ?? "");
    }
  }, [data?.competency]);

  const save = async () => {
    await setManualLevel.mutateAsync({ user_id: userId, competency_id: competencyId, level, notes });
    onClose();
  };
  const accept = async () => {
    await acceptAutoSuggestion.mutateAsync({ user_id: userId, competency_id: competencyId });
    onClose();
  };

  const auto = data?.competency?.auto_suggested_level ?? "none";
  const manualOverride = !!data?.competency?.manual_override;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Avaliar competência</SheetTitle>
          <SheetDescription>Defina o nível manualmente ou aceite a auto-sugestão.</SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground mt-6">Carregando…</p>
        ) : (
          <div className="space-y-5 mt-6">
            <div className="rounded-md border p-3 space-y-1 text-sm">
              <div>Auto-sugerido: <b>{auto}</b></div>
              <div className="text-xs text-muted-foreground">
                {data?.competency?.auto_suggestion_reason ?? "Sem evidências"}
              </div>
              {manualOverride && (
                <Badge variant="warning" className="mt-1">Nível manual ativo</Badge>
              )}
            </div>

            <div className="space-y-1">
              <Label>Nível atual</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as CompetencyLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Notas da avaliação</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            <div className="flex gap-2">
              <Button onClick={save} disabled={setManualLevel.isPending} className="flex-1">
                <Save className="h-4 w-4 mr-1" />Salvar manual
              </Button>
              <Button variant="outline" onClick={accept} disabled={acceptAutoSuggestion.isPending}>
                <Sparkles className="h-4 w-4 mr-1" />Aceitar auto-sugestão
              </Button>
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Evidências</Label>
              {(data?.evidences ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Sem evidências registradas.</p>
              ) : (
                <ul className="text-sm divide-y mt-2">
                  {(data?.evidences ?? []).map((ev: any) => (
                    <li key={ev.id} className="py-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{ev.source_label ?? ev.evidence_type}</div>
                        <div className="text-xs text-muted-foreground">
                          {ev.evidence_type} · {ev.evidence_date ? format(parseISO(ev.evidence_date), "dd/MM/yyyy") : "—"}
                        </div>
                      </div>
                      <Badge variant="outline">{ev.level_contribution}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CompetencyAssessmentDrawer;
