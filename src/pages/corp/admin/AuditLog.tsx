import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCorpAuditLog } from '@/hooks/useCorpAuditLog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

const actionLabels: Record<string, string> = {
  request_created: 'Requisição criada', request_status_changed: 'Status alterado',
  manager_approved: 'Aprovado (gerente)', director_approved: 'Aprovado (diretoria)',
  request_rejected: 'Rejeitada', document_uploaded: 'Documento enviado',
  document_deleted: 'Documento removido', feed_post_created: 'Post criado',
};

const entityLabels: Record<string, string> = {
  request: 'Requisição', document: 'Documento', feed: 'Feed',
};

const CorpAuditLog = () => {
  const [entityFilter, setEntityFilter] = useState<string>('');
  const filters = entityFilter ? { entity_type: entityFilter } : undefined;
  const { logs, isLoading } = useCorpAuditLog(filters);

  return (
    <CorpLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Log de Auditoria</h2>
          <Select value={entityFilter} onValueChange={v => setEntityFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="request">Requisições</SelectItem>
              <SelectItem value="document">Documentos</SelectItem>
              <SelectItem value="feed">Feed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhum registro de auditoria.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead className="hidden md:table-cell">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{log.user?.full_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" size="sm">{actionLabels[log.action] || log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" size="sm">{entityLabels[log.entity_type] || log.entity_type || '—'}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </CorpLayout>
  );
};

export default CorpAuditLog;
