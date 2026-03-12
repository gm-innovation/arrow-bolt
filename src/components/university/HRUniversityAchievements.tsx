import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Trash2, Settings, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

interface RewardConfig {
  xp_value: number;
  icon: string;
  badge_title_template: string;
  post_to_feed: boolean;
}

const DEFAULTS: Record<string, RewardConfig> = {
  course_completed: { xp_value: 15, icon: '📚', badge_title_template: 'Curso: {name}', post_to_feed: true },
  trail_completed: { xp_value: 50, icon: '🎓', badge_title_template: 'Trilha: {name}', post_to_feed: true },
};

export default function HRUniversityAchievements() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [courseConfig, setCourseConfig] = useState<RewardConfig>(DEFAULTS.course_completed);
  const [trailConfig, setTrailConfig] = useState<RewardConfig>(DEFAULTS.trail_completed);
  const [configDirty, setConfigDirty] = useState(false);

  // Load reward settings
  const { data: rewardSettings } = useQuery({
    queryKey: ['university-reward-settings', profile?.company_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('university_reward_settings')
        .select('*')
        .eq('company_id', profile!.company_id!);
      return data as any[] || [];
    },
    enabled: !!profile?.company_id,
  });

  useEffect(() => {
    if (rewardSettings) {
      const course = rewardSettings.find((r: any) => r.reward_type === 'course_completed');
      const trail = rewardSettings.find((r: any) => r.reward_type === 'trail_completed');
      if (course) setCourseConfig({ xp_value: course.xp_value, icon: course.icon, badge_title_template: course.badge_title_template, post_to_feed: course.post_to_feed });
      if (trail) setTrailConfig({ xp_value: trail.xp_value, icon: trail.icon, badge_title_template: trail.badge_title_template, post_to_feed: trail.post_to_feed });
      setConfigDirty(false);
    }
  }, [rewardSettings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const companyId = profile!.company_id!;
      const rows = [
        { company_id: companyId, reward_type: 'course_completed', ...courseConfig, updated_at: new Date().toISOString() },
        { company_id: companyId, reward_type: 'trail_completed', ...trailConfig, updated_at: new Date().toISOString() },
      ];
      const { error } = await supabase.from('university_reward_settings').upsert(rows, { onConflict: 'company_id,reward_type' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['university-reward-settings'] });
      setConfigDirty(false);
      toast({ title: 'Configurações salvas!' });
    },
    onError: (e: any) => toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

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

  const updateConfig = (type: 'course' | 'trail', field: keyof RewardConfig, value: any) => {
    const setter = type === 'course' ? setCourseConfig : setTrailConfig;
    setter(prev => ({ ...prev, [field]: value }));
    setConfigDirty(true);
  };

  return (
    <div className="space-y-4">
      {/* Reward Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações de Recompensas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'course' as const, label: 'Conclusão de Curso', config: courseConfig },
            { key: 'trail' as const, label: 'Conclusão de Trilha', config: trailConfig },
          ].map(({ key, label, config }) => (
            <div key={key} className="flex flex-wrap items-end gap-3 p-3 rounded-md border bg-muted/30">
              <div className="font-medium text-sm w-full">{label}</div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ícone</Label>
                <Input
                  value={config.icon}
                  onChange={e => updateConfig(key, 'icon', e.target.value)}
                  className="w-16 text-center text-lg"
                  maxLength={4}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">XP</Label>
                <Input
                  type="number"
                  value={config.xp_value}
                  onChange={e => updateConfig(key, 'xp_value', parseInt(e.target.value) || 0)}
                  className="w-20"
                  min={0}
                />
              </div>
              <div className="space-y-1 flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">Template do título ({'{name}'} = nome)</Label>
                <Input
                  value={config.badge_title_template}
                  onChange={e => updateConfig(key, 'badge_title_template', e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.post_to_feed}
                  onCheckedChange={v => updateConfig(key, 'post_to_feed', v)}
                />
                <Label className="text-xs text-muted-foreground">Feed</Label>
              </div>
            </div>
          ))}
          <Button onClick={() => saveSettings.mutate()} disabled={!configDirty || saveSettings.isPending} size="sm">
            <Save className="h-3 w-3 mr-1" />
            Salvar configurações
          </Button>
        </CardContent>
      </Card>

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
