import { useState } from 'react';
import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCorpRequests } from '@/hooks/useCorpRequests';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useDepartments';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NewRequestDialog from '@/components/corp/NewRequestDialog';
import RequestDetailSheet from '@/components/corp/RequestDetailSheet';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  open: { label: 'Aberta', variant: 'info' },
  pending_director: { label: 'Pend. Diretoria', variant: 'warning' },
  pending_department: { label: 'Pend. Departamento', variant: 'info' },
  in_progress: { label: 'Em Andamento', variant: 'warning' },
  approved: { label: 'Aprovada', variant: 'success' },
  rejected: { label: 'Rejeitada', variant: 'destructive' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
  completed: { label: 'Concluída', variant: 'default' },
};

const priorityMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'warning' }> = {
  low: { label: 'Baixa', variant: 'secondary' },
  medium: { label: 'Média', variant: 'default' },
  high: { label: 'Alta', variant: 'warning' },
  urgent: { label: 'Urgente', variant: 'destructive' },
};

const CorpRequests = () => {
  const { user, userRole } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('mine');

  const filters = statusFilter ? { status: statusFilter } : undefined;
  const { requests, isLoading } = useCorpRequests(filters);
  const { departments } = useDepartments();

  const companyId = requests?.[0]?.company_id || '';

  // Minhas solicitações
  const myRequests = requests.filter(r =>
    r.requester_id === user?.id &&
    (!search || r.title.toLowerCase().includes(search.toLowerCase()))
  );

  // Solicitações recebidas: direcionadas ao usuário OU pendentes de aprovação conforme role
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isHR = userRole === 'hr';
  const isDirector = userRole === 'director';
  const isManager = userRole === 'manager';

  const managedDepartment = departments.find((d: any) => d.manager_id === user?.id);

  const receivedRequests = requests.filter(r => {
    if (r.requester_id === user?.id) return false;
    // Direcionadas ao usuário
    if ((r as any).target_user_id === user?.id) return true;
    // Fluxo de aprovação
    if (isAdmin) return true;
    if (isHR) return true;
    if (isDirector) return r.status === 'pending_director';
    if (isManager && managedDepartment) {
      return r.status === 'pending_manager' && r.department_id === managedDepartment.id;
    }
    return false;
  }).filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()));

  const renderTable = (data: any[], showRequester: boolean) => (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                {showRequester && <TableHead className="hidden md:table-cell">Solicitante</TableHead>}
                <TableHead className="hidden md:table-cell">Departamento</TableHead>
                <TableHead className="hidden lg:table-cell">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(req => {
                const st = statusMap[req.status] || { label: req.status, variant: 'outline' as const };
                const pr = priorityMap[req.priority] || { label: req.priority, variant: 'default' as const };
                return (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedRequest(req)}
                  >
                    <TableCell className="font-medium">{req.title}</TableCell>
                    <TableCell><Badge variant={st.variant} size="sm">{st.label}</Badge></TableCell>
                    <TableCell><Badge variant={pr.variant} size="sm">{pr.label}</Badge></TableCell>
                    {showRequester && <TableCell className="hidden md:table-cell">{req.requester?.full_name || '—'}</TableCell>}
                    <TableCell className="hidden md:table-cell">{req.department?.name || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {format(new Date(req.created_at), "dd/MM/yy", { locale: ptBR })}
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

  return (
    <CorpLayout>
      <div className="space-y-4">
        {/* Filtros */}
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar solicitações..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Aberta</SelectItem>
              <SelectItem value="pending_manager">Pend. Gerente</SelectItem>
              <SelectItem value="pending_director">Pend. Diretoria</SelectItem>
              <SelectItem value="approved">Aprovada</SelectItem>
              <SelectItem value="rejected">Rejeitada</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="mine">Minhas Solicitações</TabsTrigger>
            <TabsTrigger value="received">Recebidas</TabsTrigger>
          </TabsList>

          <TabsContent value="mine">
            <div className="space-y-4">
              <div className="flex justify-end">
                {user && <NewRequestDialog companyId={companyId} />}
              </div>
              {renderTable(myRequests, false)}
            </div>
          </TabsContent>

          <TabsContent value="received">
            {renderTable(receivedRequests, true)}
          </TabsContent>
        </Tabs>
      </div>

      <RequestDetailSheet
        request={selectedRequest}
        open={!!selectedRequest}
        onOpenChange={open => { if (!open) setSelectedRequest(null); }}
      />
    </CorpLayout>
  );
};

export default CorpRequests;
