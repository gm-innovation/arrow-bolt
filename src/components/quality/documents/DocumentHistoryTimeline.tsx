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
  documentId?: string;
}

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "Em aprovação",
  published: "Publicada",
  obsolete: "Obsoleta",
  archived: "Arquivada",
};

type StatusLog = {
  id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  changed_by: string | null;
  created_at: string;
};

const DocumentHistoryTimeline = ({ versions, documentId }: Props) => {
  const [names, setNames] = useState<Record<string, string>>({});
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!documentId) return;
      const { data } = await supabase
        .from("quality_document_status_log" as any)
        .select("id, from_status, to_status, reason, changed_by, created_at")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });
      if (!cancelled) setStatusLogs((data as any) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    versions.forEach((v) => {
      if (v.approved_by) ids.add(v.approved_by);
      if (v.prepared_by) ids.add(v.prepared_by);
    });
    statusLogs.forEach((l) => {
      if (l.changed_by) ids.add(l.changed_by);
    });
    return Array.from(ids);
  }, [versions, statusLogs]);

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
    <div className="space-y-4">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Mudanças de Status
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Registro de transições de status do documento (publicação, obsolescência, reativação).
          </p>
        </CardHeader>
        <CardContent>
          {statusLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma mudança de status registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Data</TableHead>
                  <TableHead className="w-48">Transição</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="w-44">Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusLogs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">
                      {format(parseISO(l.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">
                        {l.from_status ? statusLabels[l.from_status] || l.from_status : "—"}
                      </Badge>
                      <span className="mx-1">→</span>
                      <Badge variant="outline">
                        {statusLabels[l.to_status] || l.to_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.reason || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.changed_by ? names[l.changed_by] || "—" : <span className="text-muted-foreground">—</span>}
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

export default DocumentHistoryTimeline;
