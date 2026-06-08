import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ContextVersion } from "@/hooks/useQualityOrgContext";

const CATEGORY_LABELS: Record<string, string> = {
  swot_strength: "Força", swot_weakness: "Fraqueza", swot_opportunity: "Oportunidade", swot_threat: "Ameaça",
  pestal_political: "Político", pestal_economic: "Econômico", pestal_social: "Social",
  pestal_technological: "Tecnológico", pestal_environmental: "Ambiental", pestal_legal: "Legal",
};

const VersionViewerDialog = ({ version, onClose }: { version: ContextVersion | null; onClose: () => void }) => {
  if (!version) return null;
  return (
    <Dialog open={!!version} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Versão #{version.version_number} (somente leitura)</DialogTitle>
          <DialogDescription>
            Revisado em {format(parseISO(version.reviewed_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {version.approved && <Badge variant="secondary" className="ml-2">Aprovada</Badge>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {version.review_notes && (
            <section>
              <h4 className="font-semibold mb-1">Notas da Revisão</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{version.review_notes}</p>
            </section>
          )}
          <section>
            <h4 className="font-semibold mb-1">Escopo do SGQ</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{version.scope || "—"}</p>
          </section>
          <section>
            <h4 className="font-semibold mb-1">Questões Internas</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{version.internal_issues || "—"}</p>
          </section>
          <section>
            <h4 className="font-semibold mb-1">Questões Externas</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{version.external_issues || "—"}</p>
          </section>
          <section>
            <h4 className="font-semibold mb-2">Itens SWOT/PESTAL ({version.items_snapshot?.length ?? 0})</h4>
            <div className="space-y-2">
              {(version.items_snapshot ?? []).map((it: any, idx: number) => (
                <div key={idx} className="border rounded p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[it.category] ?? it.category}</Badge>
                    {it.impact_level && <Badge variant="secondary" className="text-xs">{it.impact_level}</Badge>}
                  </div>
                  <div className="font-medium">{it.title}</div>
                  {it.description && <p className="text-xs text-muted-foreground mt-1">{it.description}</p>}
                </div>
              ))}
              {(version.items_snapshot ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum item registrado nesta versão.</p>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VersionViewerDialog;
