import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, ShieldOff } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQualityOrgContext, type ExcludedClause } from "@/hooks/useQualityOrgContext";
import { useAuth } from "@/contexts/AuthContext";

const ExcludedClausesCard = () => {
  const { context, saveExclusions } = useQualityOrgContext();
  const { user } = useAuth();
  const exclusions: ExcludedClause[] = context?.excluded_clauses ?? [];

  const [open, setOpen] = useState(false);
  const [clause, setClause] = useState("");
  const [title, setTitle] = useState("");
  const [justification, setJustification] = useState("");

  const reset = () => {
    setClause("");
    setTitle("");
    setJustification("");
  };

  const add = async () => {
    if (!clause || !title || !justification || !user?.id) return;
    const next: ExcludedClause[] = [
      ...exclusions,
      {
        clause: clause.trim(),
        title: title.trim(),
        justification: justification.trim(),
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      },
    ];
    await saveExclusions.mutateAsync(next);
    setOpen(false);
    reset();
  };

  const remove = async (idx: number) => {
    const next = exclusions.filter((_, i) => i !== idx);
    await saveExclusions.mutateAsync(next);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldOff className="h-4 w-4" />
            Exclusões justificadas (§4.3)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Cláusulas da ISO 9001 não aplicáveis ao escopo, com justificativa formal.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar exclusão
        </Button>
      </CardHeader>
      <CardContent>
        {exclusions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma exclusão registrada. Se a organização não projeta produtos/serviços,
            considere excluir formalmente §8.3 (Projeto e Desenvolvimento).
          </p>
        ) : (
          <ul className="divide-y">
            {exclusions.map((e, idx) => (
              <li key={`${e.clause}-${idx}`} className="py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">§{e.clause}</Badge>
                    <span className="font-medium">{e.title}</span>
                    {e.approved_at && (
                      <span className="text-xs text-muted-foreground">
                        Aprovada em {format(parseISO(e.approved_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {e.justification}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(idx)}
                  disabled={saveExclusions.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova exclusão de cláusula</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Cláusula *</Label>
              <Input
                placeholder="Ex.: 8.3"
                value={clause}
                onChange={(e) => setClause(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input
                placeholder="Ex.: Projeto e Desenvolvimento"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Justificativa *</Label>
              <Textarea
                rows={4}
                placeholder="Justifique por que esta cláusula não é aplicável ao escopo do SGQ."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>
              Cancelar
            </Button>
            <Button
              onClick={add}
              disabled={!clause || !title || !justification || saveExclusions.isPending}
            >
              Salvar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ExcludedClausesCard;
