import { useState, useMemo, useRef, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Eye, Search, Download, ArrowUpDown, ArrowUp, ArrowDown, Link2, Unlink, ChevronRight, Building2, Trash2, BanIcon } from "lucide-react";
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
  parent_client_id?: string | null;
  omie_client_id?: string | null;
  ignore_omie_sync?: boolean | null;
}

interface Props {
  clients: Client[];
  isLoading: boolean;
  onEdit: (client: Client) => void;
  onRowClick?: (client: Client) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  canManage?: boolean;
  onDelete?: (id: string) => void;
}

type SortKey = 'name' | 'annual_revenue' | 'last_contact_date';
type SortDir = 'asc' | 'desc';

const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
  return dir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
};

// Checkbox que suporta estado "indeterminado"
const TriCheckbox = ({
  checked, indeterminate, onCheckedChange,
}: { checked: boolean; indeterminate: boolean; onCheckedChange: (v: boolean) => void }) => {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector('input') as HTMLInputElement | null;
    if (el) el.indeterminate = indeterminate && !checked;
    if (ref.current) (ref.current as any).dataset.indeterminate = String(indeterminate && !checked);
  }, [indeterminate, checked]);
  return (
    <Checkbox
      ref={ref as any}
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(!!v)}
      className={indeterminate && !checked ? "data-[state=unchecked]:bg-primary/30" : ""}
    />
  );
};

export const ClientsTable = ({
  clients, isLoading, onEdit, onRowClick, selectedIds, onSelectionChange, canManage = false, onDelete,
}: Props) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState<'all' | 'omie' | 'manual' | 'ignored'>('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showGrouped, setShowGrouped] = useState(true);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const segments = useMemo(() => {
    const unique = new Set(clients.map(c => c.segment).filter(Boolean));
    return Array.from(unique) as string[];
  }, [clients]);

  const childrenMap = useMemo(() => {
    const map = new Map<string, Client[]>();
    clients.forEach(c => {
      if (c.parent_client_id) {
        const list = map.get(c.parent_client_id) || [];
        list.push(c);
        map.set(c.parent_client_id, list);
      }
    });
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    let result = clients.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.cnpj || '').includes(search);
      const matchSegment = segmentFilter === 'all' || c.segment === segmentFilter;
      const matchStatus = statusFilter === 'all' || c.commercial_status === statusFilter;
      const matchOrigin =
        originFilter === 'all' ? true :
        originFilter === 'omie' ? !!c.omie_client_id :
        originFilter === 'manual' ? !c.omie_client_id :
        originFilter === 'ignored' ? !!c.ignore_omie_sync : true;
      const isChild = showGrouped && c.parent_client_id;
      return matchSearch && matchSegment && matchStatus && matchOrigin && !isChild;
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortKey === 'annual_revenue') cmp = (a.annual_revenue || 0) - (b.annual_revenue || 0);
        else if (sortKey === 'last_contact_date') cmp = (a.last_contact_date || '').localeCompare(b.last_contact_date || '');
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }

    return result;
  }, [clients, search, segmentFilter, statusFilter, originFilter, sortKey, sortDir, showGrouped]);

  const filteredIds = useMemo(() => filtered.map(c => c.id), [filtered]);
  const selectedInFiltered = filteredIds.filter(id => selectedIds.has(id)).length;
  const allFilteredSelected = filteredIds.length > 0 && selectedInFiltered === filteredIds.length;
  const someFilteredSelected = selectedInFiltered > 0 && !allFilteredSelected;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };

  const toggleAllFiltered = (v: boolean) => {
    const next = new Set(selectedIds);
    if (v) filteredIds.forEach(id => next.add(id));
    else filteredIds.forEach(id => next.delete(id));
    onSelectionChange(next);
  };

  const exportCSV = () => {
    const source = selectedIds.size > 0 ? clients.filter(c => selectedIds.has(c.id)) : filtered;
    const headers = ['Nome', 'CNPJ', 'Segmento', 'Status', 'Receita Anual', 'Email', 'Telefone', 'Origem', 'Ignorar Omie'];
    const rows = source.map(c => [
      c.name, c.cnpj || '', c.segment || '',
      STATUS_LABELS[c.commercial_status || ''] || '',
      c.annual_revenue || '', c.email || '', c.phone || '',
      c.omie_client_id ? 'Omie' : 'Manual',
      c.ignore_omie_sync ? 'Sim' : 'Não',
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const renderClientRow = (client: Client, isChild = false) => {
    const children = childrenMap.get(client.id) || [];
    const hasChildren = children.length > 0;

    return (
      <TableRow
        key={client.id}
        className={`${onRowClick ? "cursor-pointer" : ""} ${isChild ? "bg-muted/30" : ""}`}
        onClick={() => onRowClick?.(client)}
      >
        <TableCell className="w-10" onClick={e => e.stopPropagation()}>
          <Checkbox checked={selectedIds.has(client.id)} onCheckedChange={() => toggleSelect(client.id)} />
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2 flex-wrap">
            {isChild && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            {client.name}
            {hasChildren && showGrouped && (
              <Badge variant="outline" className="text-xs gap-1">
                <Building2 className="h-3 w-3" />{children.length}
              </Badge>
            )}
            {client.parent_client_id && !showGrouped && (
              <Badge variant="outline" className="text-xs gap-1">
                <Link2 className="h-3 w-3" /> Agrupado
              </Badge>
            )}
            {client.omie_client_id && (
              <Badge variant="outline" className="text-xs">Omie</Badge>
            )}
            {client.ignore_omie_sync && (
              <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700">
                <BanIcon className="h-3 w-3" /> Omie ignorado
              </Badge>
            )}
          </div>
        </TableCell>
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
            {canManage && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); onDelete(client.id); }}
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os segmentos</SelectItem>
            {segments.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={originFilter} onValueChange={(v) => setOriginFilter(v as any)}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            <SelectItem value="omie">Omie</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="ignored">Omie ignorado</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showGrouped ? "default" : "outline"} size="sm"
          onClick={() => setShowGrouped(!showGrouped)}
          title="Alternar visualização agrupada" className="gap-1"
        >
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">Agrupados</span>
        </Button>
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
                <TableHead className="w-10">
                  <TriCheckbox
                    checked={allFilteredSelected}
                    indeterminate={someFilteredSelected}
                    onCheckedChange={toggleAllFiltered}
                  />
                </TableHead>
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
              {filtered.map(client => {
                const children = showGrouped ? (childrenMap.get(client.id) || []) : [];
                return (
                  <>
                    {renderClientRow(client)}
                    {children.map(child => renderClientRow(child, true))}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
