import { useIntegrationLogs } from "@/hooks/useIntegrationLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, History } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const AuditLogs = () => {
  const { logs, isLoading } = useIntegrationLogs();
  const [search, setSearch] = useState("");

  const filtered = logs.filter((l: any) =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Logs de Auditoria</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((l: any) => (
                <div key={l.id} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                  <div className="mt-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground text-sm">{l.action}</span>
                      <Badge variant={l.status === "success" ? "default" : l.status === "partial" ? "secondary" : "destructive"} className="text-xs">
                        {l.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {l.profiles?.full_name || "Sistema"} · {l.entity_type || "geral"} · {format(new Date(l.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                    {l.error_message && <p className="text-xs text-destructive mt-1">{l.error_message}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
