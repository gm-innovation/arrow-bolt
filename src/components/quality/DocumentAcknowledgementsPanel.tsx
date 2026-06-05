import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, ShieldCheck, ShieldAlert } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useDocumentAcknowledgements } from "@/hooks/useQualityAcknowledgements";

interface Props {
  documentId: string;
  currentVersionId: string | null;
  requiresStrong: boolean;
}

const DocumentAcknowledgementsPanel = ({
  documentId,
  currentVersionId,
  requiresStrong,
}: Props) => {
  const {
    items,
    assign,
    cancel,
    setRequiresStrong,
    total,
    acknowledged,
    pending,
    cancelled,
    progress,
  } = useDocumentAcknowledgements(documentId, undefined);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>("");

  const { data: candidates = [] } = useQuery({
    queryKey: ["ack_candidates", search],
    queryFn: async () => {
      const term = search.trim();
      if (term.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(20);
      return (data ?? []) as any[];
    },
  });

  const alreadyAssignedIds = new Set(
    items
      .filter((i: any) => i.version_id === currentVersionId && i.status !== "cancelled")
      .map((i: any) => i.user_id),
  );

  const toggleSelect = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    if (!currentVersionId || selected.length === 0) return;
    await assign.mutateAsync({
      user_ids: selected,
      version_id: currentVersionId,
      due_date: dueDate || null,
    });
    setSelected([]);
    setSearch("");
    setDueDate("");
  };

  if (!currentVersionId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-6">
            Publique uma versão do documento para começar a atribuir ciências.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {requiresStrong ? (
                <ShieldAlert className="h-5 w-5 text-destructive" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="strong-ack" className="font-medium cursor-pointer">
                  Exige assinatura eletrônica
                </Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativo, a ciência exige a assinatura cadastrada do colaborador (não
                  apenas o clique).
                </p>
              </div>
            </div>
            <Switch
              id="strong-ack"
              checked={requiresStrong}
              onCheckedChange={(v) => setRequiresStrong.mutate(v)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Atribuídos</p>
              <p className="text-xl font-semibold">{total - cancelled}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Concluídos</p>
              <p className="text-xl font-semibold">{acknowledged}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-xl font-semibold">{pending}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Progresso (versão atual + histórico)</p>
              <div className="flex items-center gap-2">
                <Progress value={progress} className="h-2" />
                <span className="text-xs font-medium">{progress}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <p className="text-sm font-medium">Atribuir ciência (na revisão atual)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              className="md:col-span-2"
              placeholder="Buscar colaborador (mínimo 2 caracteres)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Input
              type="date"
              placeholder="Prazo (opcional)"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          {candidates.length > 0 && (
            <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
              {candidates
                .filter((c) => !alreadyAssignedIds.has(c.id))
                .map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center justify-between p-2 text-sm cursor-pointer hover:bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selected.includes(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </label>
                ))}
            </div>
          )}
          <Button onClick={submit} disabled={selected.length === 0 || assign.isPending} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Atribuir {selected.length > 0 ? `a ${selected.length}` : ""}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma atribuição. Selecione colaboradores acima para iniciar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Revisão</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ciência em</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{a.user?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{a.user?.email}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.version_id === currentVersionId ? (
                        <Badge variant="outline">Atual</Badge>
                      ) : (
                        <Badge variant="secondary">Anterior</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.due_date ? format(parseISO(a.due_date), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {a.status === "acknowledged" && <Badge>Concluída</Badge>}
                      {a.status === "pending" && <Badge variant="outline">Pendente</Badge>}
                      {a.status === "cancelled" && <Badge variant="secondary">Cancelada</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.acknowledged_at
                        ? format(parseISO(a.acknowledged_at), "dd/MM/yyyy HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {a.status === "pending" && (
                        <Button size="icon" variant="ghost" onClick={() => cancel.mutate(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
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

export default DocumentAcknowledgementsPanel;
