import { useState, useEffect } from "react";
import { useQualityPolicy } from "@/hooks/useQualityPolicy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export default function QualityPolicy() {
  const { policyText, policyVersion, publishedAt, acks, isMaster, publish } = useQualityPolicy();
  const [draft, setDraft] = useState(policyText ?? "");

  useEffect(() => { setDraft(policyText ?? ""); }, [policyText]);

  const adherence = acks.length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Política da Qualidade
        </h2>
        <p className="text-sm text-muted-foreground">
          Texto publicado para toda a empresa. Publicar uma nova versão zera a ciência dos colaboradores.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Versão atual</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">v{policyVersion}</Badge>
            {publishedAt && <span className="text-xs text-muted-foreground">Publicada em {new Date(publishedAt).toLocaleString("pt-BR")}</span>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            placeholder="Escreva a Política da Qualidade aqui…"
            disabled={!isMaster}
          />
          {!isMaster && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Apenas o Master pode editar e publicar a Política da Qualidade.
            </p>
          )}
          <div className="flex justify-end">
            <Button
              onClick={() => publish.mutate(draft)}
              disabled={!isMaster || publish.isPending || !draft.trim() || draft === policyText}
            >
              Publicar nova versão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Adesão</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <p>{adherence} colaborador(es) registraram ciência da versão atual.</p>
        </CardContent>
      </Card>
    </div>
  );
}
