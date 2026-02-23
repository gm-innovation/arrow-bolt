import { useIntegrationLogs } from "@/hooks/useIntegrationLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FileText } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const Logs = () => {
  const { logs, isLoading } = useIntegrationLogs();
  const [search, setSearch] = useState("");

  const filtered = logs.filter((l: any) =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Logs de Integração</h2>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="hidden md:table-cell">Entidade</TableHead>
                  <TableHead className="hidden md:table-cell">Usuário</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{format(new Date(l.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="font-medium">{l.action}</TableCell>
                    <TableCell className="hidden md:table-cell">{l.entity_type || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{l.profiles?.full_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === "success" ? "default" : l.status === "partial" ? "secondary" : "destructive"}>
                        {l.status}
                      </Badge>
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

export default Logs;
