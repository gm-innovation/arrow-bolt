import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function HRUniversityAchievements() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['university-badges', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corp_badges')
        .select('*, user:profiles!corp_badges_user_id_fkey(id, full_name, email)')
        .eq('company_id', profile!.company_id!)
        .in('badge_type', ['course_completed', 'trail_completed'])
        .order('awarded_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!profile?.company_id,
  });

  const deleteBadge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('corp_badges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['university-badges'] });
      queryClient.invalidateQueries({ queryKey: ['corp-badges-recent'] });
      queryClient.invalidateQueries({ queryKey: ['user-xp'] });
      toast({ title: 'Conquista removida' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const filtered = badges.filter(b => {
    const matchSearch = !search ||
      b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.user?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || b.badge_type === typeFilter;
    return matchSearch && matchType;
  });

  const courseCount = badges.filter(b => b.badge_type === 'course_completed').length;
  const trailCount = badges.filter(b => b.badge_type === 'trail_completed').length;
  const totalXP = badges.reduce((sum: number, b: any) => sum + (b.xp_value || 0), 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-foreground">{courseCount}</p>
            <p className="text-xs text-muted-foreground">Cursos concluídos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-foreground">{trailCount}</p>
            <p className="text-xs text-muted-foreground">Trilhas concluídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalXP}</p>
            <p className="text-xs text-muted-foreground">XP total distribuído</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou conquista..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="course_completed">Cursos</SelectItem>
            <SelectItem value="trail_completed">Trilhas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : !filtered.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma conquista encontrada.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Conquista</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>XP</TableHead>
                <TableHead>Data</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.user?.full_name || b.user?.email || '—'}</TableCell>
                  <TableCell>
                    <span className="mr-1">{b.icon}</span>
                    {b.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.badge_type === 'trail_completed' ? 'default' : 'secondary'}>
                      {b.badge_type === 'trail_completed' ? 'Trilha' : 'Curso'}
                    </Badge>
                  </TableCell>
                  <TableCell>{b.xp_value || 0} XP</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {b.awarded_at ? format(new Date(b.awarded_at), 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => deleteBadge.mutate(b.id)} disabled={deleteBadge.isPending}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
