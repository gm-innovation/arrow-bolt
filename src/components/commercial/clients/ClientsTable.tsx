import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Eye, Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const STATUS_BADGES: Record<string, string> = {
  prospect: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  churned: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  active: 'Ativo',
  inactive: 'Inativo',
  churned: 'Perdido',
};

const formatCurrency = (v: number | null) =>
  v ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v) : '—';

interface Client {
  id: string;
  name: string;
  cnpj: string | null;
  segment: string | null;
  commercial_status: string | null;
  annual_revenue: number | null;
  last_contact_date: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  address: string | null;
  source: string | null;
  notes: string | null;
}

interface Props {
  clients: Client[];
  isLoading: boolean;
  onEdit: (client: Client) => void;
  onRowClick?: (client: Client) => void;
}

type SortKey = 'name' | 'annual_revenue' | 'last_contact_date';
type SortDir = 'asc' | 'desc';

const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
  return dir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
};

export const ClientsTable = ({ clients, isLoading, onEdit, onRowClick }: Props) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const segments = useMemo(() => {
    const unique = new Set(clients.map(c => c.segment).filter(Boolean));
    return Array.from(unique) as string[];
  }, [clients]);

  const filtered = useMemo(() => {
    let result = clients.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.cnpj || '').includes(search);
      const matchSegment = segmentFilter === 'all' || c.segment === segmentFilter;
      const matchStatus = statusFilter === 'all' || c.commercial_status === statusFilter;
      return matchSearch && matchSegment && matchStatus;
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'name') {
          cmp = a.name.localeCompare(b.name);
        } else if (sortKey === 'annual_revenue') {
          cmp = (a.annual_revenue || 0) - (b.annual_revenue || 0);
        } else if (sortKey === 'last_contact_date') {
          cmp = (a.last_contact_date || '').localeCompare(b.last_contact_date || '');
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }

    return result;
  }, [clients, search, segmentFilter, statusFilter, sortKey, sortDir]);

  const exportCSV = () => {
    const headers = ['Nome', 'CNPJ', 'Segmento', 'Status', 'Receita Anual', 'Email', 'Telefone'];
    const rows = filtered.map(c => [c.name, c.cnpj || '', c.segment || '', STATUS_LABELS[c.commercial_status || ''] || '', c.annual_revenue || '', c.email || '', c.phone || '']);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os segmentos</SelectItem>
            {segments.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={exportCSV} title="Exportar CSV">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button className="flex items-center font-medium hover:text-foreground transition-colors" onClick={() => toggleSort('name')}>
                    Nome <SortIcon active={sortKey === 'name'} dir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                <TableHead className="hidden lg:table-cell">Segmento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell text-right">
                  <button className="flex items-center ml-auto font-medium hover:text-foreground transition-colors" onClick={() => toggleSort('annual_revenue')}>
                    Receita Anual <SortIcon active={sortKey === 'annual_revenue'} dir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <button className="flex items-center font-medium hover:text-foreground transition-colors" onClick={() => toggleSort('last_contact_date')}>
                    Último Contato <SortIcon active={sortKey === 'last_contact_date'} dir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(client => (
                <TableRow key={client.id} className={onRowClick ? "cursor-pointer" : ""} onClick={() => onRowClick?.(client)}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{client.cnpj || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{client.segment || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_BADGES[client.commercial_status || ''] || ''}>
                      {STATUS_LABELS[client.commercial_status || ''] || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right">{formatCurrency(client.annual_revenue)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {client.last_contact_date ? format(new Date(client.last_contact_date), 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(client); }} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/commercial/opportunities?client=${client.id}`); }} title="Ver Oportunidades">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
