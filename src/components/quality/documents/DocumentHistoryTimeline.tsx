import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { QualityDocumentVersion } from "@/hooks/useQualityDocuments";

interface Props {
  versions: QualityDocumentVersion[];
}

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "Em aprovação",
  published: "Publicada",
  obsolete: "Obsoleta",
  archived: "Arquivada",
};

const DocumentHistoryTimeline = ({ versions }: Props) => {
  const [names, setNames] = useState<Record<string, string>>({});

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    versions.forEach((v) => {
      if (v.approved_by) ids.add(v.approved_by);
      if (v.prepared_by) ids.add(v.prepared_by);
    });
    return Array.from(ids);
  }, [versions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userIds.length) return;
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      if (cancelled) return;
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => {
        map[p.id] = p.full_name;
      });
      setNames(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [userIds.join(",")]);

  const sorted = useMemo(
    () => [...versions].sort((a, b) => b.revision_number - a.revision_number),
    [versions]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> Histórico de Alterações
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Lista cronológica das revisões do documento — usada como evidência para auditoria.
        </p>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma revisão registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Revisão</TableHead>
                <TableHead className="w-32">Data</TableHead>
                <TableHead>Motivo da alteração</TableHead>
                <TableHead className="w-44">Aprovado por</TableHead>
                <TableHead className="w-32">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((v) => {
                const date = v.approved_at || v.issued_at || v.created_at;
                const authorId = v.approved_by || v.prepared_by;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono">{v.revision_label}</TableCell>
                    <TableCell className="text-sm">
                      {date ? format(parseISO(date), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {v.change_summary || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {authorId ? names[authorId] || "—" : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabels[v.status] || v.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentHistoryTimeline;
