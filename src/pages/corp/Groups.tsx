import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, LogOut, Trash2, Shield, Clock } from 'lucide-react';
import { useCorpGroups } from '@/hooks/useCorpGroups';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const CorpGroups = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const isAdminOrHR = userRole === 'admin' || userRole === 'hr' || userRole === 'super_admin';

  const { data: profile } = useQuery({
    queryKey: ['my-profile-company', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const companyId = profile?.company_id || '';
  const { groups, isLoading, myPendingRequests, pendingRequests, requestJoin, cancelRequest, leaveGroup, createGroup, deleteGroup } = useCorpGroups(companyId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createGroup.mutate({ name: newName.trim(), description: newDesc.trim() || undefined }, {
      onSuccess: () => { setNewName(''); setNewDesc(''); setDialogOpen(false); },
    });
  };

  const getPendingCountForGroup = (groupId: string) =>
    pendingRequests.filter((r: any) => r.group_id === groupId).length;

  return (
    <CorpLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Grupos</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Grupo</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome do grupo" value={newName} onChange={e => setNewName(e.target.value)} />
                <Textarea placeholder="Descrição (opcional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
                <Button onClick={handleCreate} disabled={!newName.trim() || createGroup.isPending} className="w-full">
                  {createGroup.isPending ? 'Criando...' : 'Criar Grupo'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Carregando...</div>
        ) : groups.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Nenhum grupo encontrado.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(groups as any[]).map((group) => {
              const isPending = myPendingRequests.includes(group.id);
              const pendingCount = getPendingCountForGroup(group.id);

              return (
                <Card
                  key={group.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/corp/groups/${group.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          {group.group_type === 'role_based' ? (
                            <Shield className="h-4 w-4 text-primary" />
                          ) : (
                            <Users className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-sm">{group.name}</CardTitle>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant={group.group_type === 'role_based' ? 'secondary' : 'outline'} className="text-[10px] h-4">
                              {group.group_type === 'role_based' ? 'Automático' : 'Personalizado'}
                            </Badge>
                            {isAdminOrHR && pendingCount > 0 && (
                              <Badge variant="destructive" className="text-[10px] h-4">
                                {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{group.member_count} membros</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {group.description && (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    )}

                    {group.members.length > 0 && (
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 6).map((m: any) => (
                          <Avatar key={m.user_id} className="h-7 w-7 border-2 border-background">
                            {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                            <AvatarFallback className="text-[9px]">
                              {m.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {group.members.length > 6 && (
                          <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium">
                            +{group.members.length - 6}
                          </div>
                        )}
                      </div>
                    )}

                    {group.group_type === 'custom' && (
                      <div className="flex gap-1.5 pt-1" onClick={e => e.stopPropagation()}>
                        {group.is_member ? (
                          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => leaveGroup.mutate(group.id)}>
                            <LogOut className="h-3 w-3" /> Sair
                          </Button>
                        ) : isPending ? (
                          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" disabled>
                            <Clock className="h-3 w-3" /> Pendente
                          </Button>
                        ) : (
                          <Button variant="default" size="sm" className="gap-1 text-xs h-7" onClick={() => requestJoin.mutate(group.id)} disabled={requestJoin.isPending}>
                            Solicitar Entrada
                          </Button>
                        )}
                        {group.created_by === user?.id && (
                          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-destructive" onClick={() => deleteGroup.mutate(group.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </CorpLayout>
  );
};

export default CorpGroups;
