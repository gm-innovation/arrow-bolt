import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

const actionLabel: Record<string, string> = { view: "Visualização", print: "Impressão", download: "Download" };

const DocumentAccessLogPanel = ({ documentId }: { documentId: string }) => {
  const { data: logs = [] } = useQuery({
    queryKey: ["qd_access_log", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_document_access_log")
        .select("*, user:profiles!quality_document_access_log_user_id_fkey(full_name)")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <Card>
      <CardContent className="pt-6">
        {logs.length === 0 ? (
          <p className="text-center py-4 text-sm text-muted-foreground">Nenhum acesso registrado ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{format(parseISO(l.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>{l.user?.full_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{actionLabel[l.action] || l.action}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentAccessLogPanel;
