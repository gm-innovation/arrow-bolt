import { useState, useMemo } from "react";
import { useOpportunities, Opportunity } from "@/hooks/useOpportunities";
import { useBuyers } from "@/hooks/useBuyers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, LayoutGrid, List, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { OpportunityKanban } from "@/components/commercial/opportunities/OpportunityKanban";
import { NewOpportunityDialog } from "@/components/commercial/opportunities/NewOpportunityDialog";
import { OpportunityDetails } from "@/components/commercial/opportunities/OpportunityDetails";
import { EditOpportunitySheet } from "@/components/commercial/opportunities/EditOpportunitySheet";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

const stageLabels: Record<string, string> = {
  identified: 'Identificada', qualified: 'Qualificada', proposal: 'Proposta',
  negotiation: 'Negociação', closed_won: 'Ganha', closed_lost: 'Perdida',
};

const stageColors: Record<string, string> = {
  identified: 'bg-blue-100 text-blue-800', qualified: 'bg-cyan-100 text-cyan-800',
  proposal: 'bg-yellow-100 text-yellow-800', negotiation: 'bg-orange-100 text-orange-800',
  closed_won: 'bg-green-100 text-green-800', closed_lost: 'bg-red-100 text-red-800',
};

const formatCurrency = (v: number | null) =>
  v ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—';

type SortKey = 'title' | 'estimated_value' | 'probability' | 'expected_close_date';
type SortDir = 'asc' | 'desc';

const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
  return dir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
};

const CommercialOpportunities = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const clientFilter = searchParams.get('client') || '';
  const { opportunities, isLoading, updateOpportunity, createOpportunity, deleteOpportunity } = useOpportunities();
  const { buyers } = useBuyers();
  const [view, setView] = useState<'kanban' | 'list'>(() => (localStorage.getItem('opp-view') as any) || 'kanban');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editSheetOpp, setEditSheetOpp] = useState<Opportunity | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
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

  const { data: clients = [] } = useQuery({
    queryKey: ['commercial-clients-select', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      if (!profile?.company_id) return [];
      const { data } = await supabase.from('clients').select('id, name').eq('company_id', profile.company_id).order('name');
      return data || [];
    },
    enabled: !!user?.id,
  });

  const setViewMode = (v: 'kanban' | 'list') => { setView(v); localStorage.setItem('opp-view', v); };

  const filtered = useMemo(() => {
    let result = opportunities.filter(o => {
      const matchClient = !clientFilter || o.client_id === clientFilter;
      const matchSearch = !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.client_name.toLowerCase().includes(search.toLowerCase());
      const matchStage = stageFilter === 'all' || o.stage === stageFilter;
      return matchClient && matchSearch && matchStage;
    });

    if (sortKey && view === 'list') {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'title') cmp = a.title.localeCompare(b.title);
        else if (sortKey === 'estimated_value') cmp = (a.estimated_value || 0) - (b.estimated_value || 0);
        else if (sortKey === 'probability') cmp = (a.probability || 0) - (b.probability || 0);
        else if (sortKey === 'expected_close_date') cmp = (a.expected_close_date || '').localeCompare(b.expected_close_date || '');
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }

    return result;
  }, [opportunities, clientFilter, search, stageFilter, sortKey, sortDir, view]);

  const handleStageChange = (id: string, stage: string) => {
    updateOpportunity.mutate({
      id, stage,
      closed_at: ['closed_won', 'closed_lost'].includes(stage) ? new Date().toISOString() : null,
    });
  };

  const handleCardClick = (opp: Opportunity) => { setEditSheetOpp(opp); setEditSheetOpen(true); };

  const handleSave = (data: Record<string, any>) => {
    if (editData) {
      updateOpportunity.mutate({ id: editData.id, ...data }, { onSuccess: () => { setDialogOpen(false); setEditData(null); } });
    } else {
      createOpportunity.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  // KPI calculations
  const openOpps = opportunities.filter(o => !["closed_won", "closed_lost"].includes(o.stage));
  const totalValue = openOpps.reduce((s, o) => s + (o.estimated_value || 0), 0);
  const avgAge = openOpps.length > 0
    ? Math.round(openOpps.reduce((s, o) => s + Math.floor((Date.now() - new Date(o.created_at || Date.now()).getTime()) / 86400000), 0) / openOpps.length)
    : 0;
  const activeStages = new Set(openOpps.map(o => o.stage)).size;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">Oportunidades</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button variant={view === 'kanban' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => { setEditData(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total de Oportunidades</p><p className="text-2xl font-bold">{openOpps.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Valor Total</p><p className="text-2xl font-bold">{formatCurrency(totalValue)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Idade Média</p><p className="text-2xl font-bold">{avgAge} dias</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Estágios Ativos</p><p className="text-2xl font-bold">{activeStages}</p></CardContent></Card>
      </div>

      {view === 'list' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estágio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(stageLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="h-64 bg-muted animate-pulse rounded" />
      ) : view === 'kanban' ? (
        <OpportunityKanban opportunities={filtered} onStageChange={handleStageChange} onCardClick={handleCardClick} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button className="flex items-center font-medium hover:text-foreground transition-colors" onClick={() => toggleSort('title')}>
                    Título <SortIcon active={sortKey === 'title'} dir={sortDir} />
                  </button>
                </TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">
                  <button className="flex items-center font-medium hover:text-foreground transition-colors" onClick={() => toggleSort('estimated_value')}>
                    Valor <SortIcon active={sortKey === 'estimated_value'} dir={sortDir} />
                  </button>
                </TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead className="hidden lg:table-cell">
                  <button className="flex items-center font-medium hover:text-foreground transition-colors" onClick={() => toggleSort('probability')}>
                    Probabilidade <SortIcon active={sortKey === 'probability'} dir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <button className="flex items-center font-medium hover:text-foreground transition-colors" onClick={() => toggleSort('expected_close_date')}>
                    Data Prevista <SortIcon active={sortKey === 'expected_close_date'} dir={sortDir} />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma oportunidade</TableCell></TableRow>
              ) : filtered.map(opp => (
                <TableRow key={opp.id} className="cursor-pointer" onClick={() => handleCardClick(opp)}>
                  <TableCell className="font-medium">{opp.title}</TableCell>
                  <TableCell>{opp.client_name}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatCurrency(opp.estimated_value)}</TableCell>
                  <TableCell><Badge variant="secondary" className={stageColors[opp.stage]}>{stageLabels[opp.stage]}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell">{opp.probability != null ? `${opp.probability}%` : '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{opp.expected_close_date ? format(new Date(opp.expected_close_date), 'dd/MM/yyyy') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NewOpportunityDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditData(null); }}
        onSave={handleSave}
        clients={clients}
        buyers={buyers.map(b => ({ id: b.id, name: b.name, client_id: b.client_id }))}
        initialData={editData}
        isLoading={createOpportunity.isPending || updateOpportunity.isPending}
      />

      <OpportunityDetails opportunity={detailOpp} open={detailOpen} onOpenChange={setDetailOpen} />

      <EditOpportunitySheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        opportunity={editSheetOpp}
        clients={clients}
        onSave={(data) => {
          const { id, ...updates } = data;
          updateOpportunity.mutate({ id, ...updates }, { onSuccess: () => { setEditSheetOpen(false); setEditSheetOpp(null); } });
        }}
        onDelete={(id) => { deleteOpportunity.mutate(id); setEditSheetOpen(false); }}
        isLoading={updateOpportunity.isPending}
      />
    </div>
  );
};

export default CommercialOpportunities;
