import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCorpGroups } from '@/hooks/useCorpGroups';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Users, Shield, Clock, Check, X, LogOut } from 'lucide-react';

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
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
  const { groups, isLoading, myPendingRequests, pendingRequests, requestJoin, cancelRequest, leaveGroup, approveRequest, rejectRequest } = useCorpGroups(companyId);

  const group = groups.find((g: any) => g.id === id);
  const isPending = myPendingRequests.includes(id!);
  const groupPendingRequests = pendingRequests.filter((r: any) => r.group_id === id);

  if (isLoading) {
    return (
      <div className="text-center text-muted-foreground py-12">Carregando...</div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-muted-foreground">Grupo não encontrado.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  const getInitials = (name?: string) =>
    name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            {group.group_type === 'role_based' ? (
              <Shield className="h-5 w-5 text-primary" />
            ) : (
              <Users className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{group.name}</h2>
            <div className="flex items-center gap-2">
              <Badge variant={group.group_type === 'role_based' ? 'secondary' : 'outline'} className="text-[10px] h-4">
                {group.group_type === 'role_based' ? 'Automático' : 'Personalizado'}
              </Badge>
              <span className="text-xs text-muted-foreground">{group.member_count} membros</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {group.group_type === 'custom' && (
          <>
            {group.is_member ? (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => leaveGroup.mutate(group.id)}>
                <LogOut className="h-3.5 w-3.5" /> Sair do Grupo
              </Button>
            ) : isPending ? (
              <Button variant="outline" size="sm" className="gap-1.5" disabled>
                <Clock className="h-3.5 w-3.5" /> Pendente
              </Button>
            ) : (
              <Button size="sm" className="gap-1.5" onClick={() => requestJoin.mutate(group.id)} disabled={requestJoin.isPending}>
                Solicitar Entrada
              </Button>
            )}
          </>
        )}
      </div>

      {group.description && (
        <p className="text-sm text-muted-foreground">{group.description}</p>
      )}

      {/* Pending requests (admin/HR only) */}
      {isAdminOrHR && groupPendingRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Solicitações Pendentes ({groupPendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {groupPendingRequests.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between gap-2 p-2 rounded-md border">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {req.profiles?.avatar_url && <AvatarImage src={req.profiles.avatar_url} />}
                    <AvatarFallback className="text-[10px]">{getInitials(req.profiles?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{req.profiles?.full_name || 'Usuário'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(req.requested_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="default" className="h-7 px-2 gap-1" onClick={() => approveRequest.mutate(req.id)}>
                    <Check className="h-3 w-3" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-destructive" onClick={() => rejectRequest.mutate(req.id)}>
                    <X className="h-3 w-3" /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Members list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Membros ({group.member_count})</CardTitle>
        </CardHeader>
        <CardContent>
          {group.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {group.members.map((m: any) => (
                <div key={m.user_id} className="flex items-center gap-2 p-2 rounded-md border">
                  <Avatar className="h-8 w-8">
                    {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                    <AvatarFallback className="text-[10px]">{getInitials(m.full_name)}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium truncate">{m.full_name || 'Usuário'}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupDetail;
