import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Edit, 
  Trash2, 
  UserPlus, 
  Loader2, 
  Search,
  Download,
  Filter,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  action: string;
  change_type: string;
  description: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
  service_order_id: string;
  performed_by: string | null;
  performed_by_profile?: {
    full_name: string;
    email: string;
  } | null;
  service_order?: {
    order_number: string;
  } | null;
}

const AuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // Calculate date range
      const daysAgo = parseInt(dateFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch logs first
      const { data: logsData, error: logsError } = await supabase
        .from('service_history')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (logsError) {
        console.error('Error fetching audit logs:', logsError);
        setLogs([]);
        return;
      }

      if (!logsData || logsData.length === 0) {
        setLogs([]);
        return;
      }

      // Fetch related profiles and service orders
      const performedByIds = [...new Set(logsData.map(l => l.performed_by).filter(Boolean))];
      const serviceOrderIds = [...new Set(logsData.map(l => l.service_order_id).filter(Boolean))];

      const [profilesResult, ordersResult] = await Promise.all([
        performedByIds.length > 0 
          ? supabase.from('profiles').select('id, full_name, email').in('id', performedByIds)
          : { data: [] },
        serviceOrderIds.length > 0
          ? supabase.from('service_orders').select('id, order_number').in('id', serviceOrderIds)
          : { data: [] }
      ]);

      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p]));
      const ordersMap = new Map((ordersResult.data || []).map(o => [o.id, o]));

      // Merge data
      const enrichedLogs: AuditLog[] = logsData.map(log => ({
        ...log,
        performed_by_profile: log.performed_by ? profilesMap.get(log.performed_by) || null : null,
        service_order: ordersMap.get(log.service_order_id) || null
      }));

      setLogs(enrichedLogs);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [dateFilter]);

  const getActionIcon = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'update':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <UserPlus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChangeTypeBadge = (changeType: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      create: { label: 'Criação', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      update: { label: 'Atualização', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      delete: { label: 'Exclusão', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    };

    const variant = variants[changeType] || { label: changeType, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      !searchTerm ||
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performed_by_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.service_order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = changeTypeFilter === 'all' || log.change_type === changeTypeFilter;

    return matchesSearch && matchesType;
  });

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['Data', 'Tipo', 'Ação', 'Descrição', 'Usuário', 'OS'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
      log.change_type,
      log.action,
      log.description || '',
      log.performed_by_profile?.full_name || 'Sistema',
      log.service_order?.order_number || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h1>
          <p className="text-muted-foreground">
            Histórico completo de alterações no sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, ação, usuário ou OS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={changeTypeFilter} onValueChange={setChangeTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="create">Criação</SelectItem>
                  <SelectItem value="update">Atualização</SelectItem>
                  <SelectItem value="delete">Exclusão</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[150px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Último dia</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Criações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredLogs.filter(l => l.change_type === 'create').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atualizações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredLogs.filter(l => l.change_type === 'update').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Exclusões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredLogs.filter(l => l.change_type === 'delete').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Alterações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado para os filtros selecionados.
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Data/Hora</TableHead>
                    <TableHead className="w-[100px]">Tipo</TableHead>
                    <TableHead className="w-[150px]">Ação</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[150px]">Usuário</TableHead>
                    <TableHead className="w-[100px]">OS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.change_type)}
                          {getChangeTypeBadge(log.change_type)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.action}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {log.description || '-'}
                      </TableCell>
                      <TableCell>
                        {log.performed_by_profile?.full_name || 'Sistema'}
                      </TableCell>
                      <TableCell>
                        {log.service_order?.order_number || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
