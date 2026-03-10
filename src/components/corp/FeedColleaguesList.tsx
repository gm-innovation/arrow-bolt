import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  technician: 'Técnico',
  coordinator: 'Coordenador',
  hr: 'RH',
  manager: 'Gerente',
  commercial: 'Comercial',
  director: 'Diretor',
  compras: 'Suprimentos',
  qualidade: 'Qualidade',
  financeiro: 'Financeiro',
};

interface FeedColleaguesListProps {
  companyId: string;
}

const FeedColleaguesList = ({ companyId }: FeedColleaguesListProps) => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: colleagues = [], isLoading } = useQuery({
    queryKey: ['feed-colleagues', companyId],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('company_id', companyId)
        .order('full_name');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const rolesMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

      return (profiles || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role: rolesMap.get(p.id) || null,
      }));
    },
    enabled: !!companyId,
  });

  const withoutSelf = colleagues.filter((c: any) => c.id !== user?.id);
  const filtered = search.trim()
    ? withoutSelf.filter((c: any) =>
        c.full_name?.toLowerCase().includes(search.toLowerCase())
      )
    : withoutSelf;

  const getInitials = (name?: string) =>
    name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
          <Users className="h-3.5 w-3.5 text-primary" />
          Colaboradores
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum colaborador encontrado</p>
        ) : (
          <ScrollArea className="max-h-[280px]">
            <div className="space-y-2">
              {filtered.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 cursor-pointer rounded-md p-1.5 -mx-1.5 hover:bg-accent transition-colors"
                  onClick={() => navigate(`/corp/profile/${c.id}`)}
                >
                  <Avatar className="h-7 w-7">
                    {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                    <AvatarFallback className="text-[9px]">{getInitials(c.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{c.full_name}</p>
                    {c.role && (
                      <p className="text-[10px] text-muted-foreground">
                        {ROLE_LABELS[c.role] || c.role}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedColleaguesList;
