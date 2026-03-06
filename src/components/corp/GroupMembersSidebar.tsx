import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Users, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface GroupMembersSidebarProps {
  members: any[];
  memberCount: number;
  isAdmin?: boolean;
  groupId?: string;
  onAddMember?: (userId: string) => void;
  onRemoveMember?: (userId: string) => void;
}

const GroupMembersSidebar = ({ members, memberCount, isAdmin, groupId, onAddMember, onRemoveMember }: GroupMembersSidebarProps) => {
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState('');

  const getInitials = (name?: string) =>
    name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const { data: colleagues = [] } = useQuery({
    queryKey: ['company-colleagues-for-invite', search],
    queryFn: async () => {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      if (!profile?.company_id) return [];
      let query = supabase.from('profiles').select('id, full_name, avatar_url').eq('company_id', profile.company_id);
      if (search.trim()) query = query.ilike('full_name', `%${search.trim()}%`);
      const { data } = await query.limit(20);
      const memberIds = members.map((m: any) => m.user_id);
      return (data || []).filter((c: any) => !memberIds.includes(c.id));
    },
    enabled: showInvite && !!user,
  });

  return (
    <>
      <Card className="sticky top-4">
        <CardContent className="p-0">
          <div className="px-4 py-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Membros ({memberCount})</p>
          </div>
          {isAdmin && (
            <div className="px-4 pb-2">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={() => setShowInvite(true)}>
                <Plus className="h-3.5 w-3.5" /> Convidar Membro
              </Button>
            </div>
          )}
          <ScrollArea className="max-h-[60vh]">
            <div className="px-4 pb-3 space-y-1.5">
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum membro.</p>
              ) : (
                members.map((m: any) => (
                  <div key={m.user_id} className="flex items-center gap-2 py-1">
                    <Avatar className="h-7 w-7">
                      {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                      <AvatarFallback className="text-[9px]">{getInitials(m.full_name)}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-medium truncate flex-1">{m.full_name || 'Usuário'}</p>
                    {isAdmin && m.user_id !== user?.id && onRemoveMember && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onRemoveMember(m.user_id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
          </DialogHeader>
          <Input placeholder="Buscar colaborador..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {colleagues.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
                  <Avatar className="h-7 w-7">
                    {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                    <AvatarFallback className="text-[9px]">{getInitials(c.full_name)}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium flex-1 truncate">{c.full_name}</p>
                  <Button size="sm" className="h-7 text-xs" onClick={() => { onAddMember?.(c.id); setShowInvite(false); }}>
                    Adicionar
                  </Button>
                </div>
              ))}
              {colleagues.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum colaborador encontrado</p>}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GroupMembersSidebar;
