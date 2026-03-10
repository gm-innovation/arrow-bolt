import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Users, Shield, Clock, Check, X, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface GroupInfoSidebarProps {
  group: any;
  isPending: boolean;
  groupPendingRequests: any[];
  requestJoin: any;
  leaveGroup: any;
  approveRequest: any;
  rejectRequest: any;
}

const GroupInfoSidebar = ({
  group, isPending, groupPendingRequests,
  requestJoin, leaveGroup, approveRequest, rejectRequest,
}: GroupInfoSidebarProps) => {
  const { userRole } = useAuth();
  const isAdminOrHR = userRole === 'hr' || userRole === 'super_admin';

  const getInitials = (name?: string) =>
    name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <Card className="sticky top-4">
      <CardContent className="p-0">
        {/* Cover */}
        <div className="h-16 bg-gradient-to-r from-primary/20 to-primary/5 rounded-t-lg flex items-center justify-center">
          {group.group_type === 'role_based' ? (
            <Shield className="h-8 w-8 text-primary/40" />
          ) : (
            <Users className="h-8 w-8 text-primary/40" />
          )}
        </div>

        <div className="px-4 pt-3 pb-3 space-y-2">
          <h3 className="font-semibold text-sm">{group.name}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={group.group_type === 'role_based' ? 'secondary' : 'outline'} className="text-[10px] h-4">
              {group.group_type === 'role_based' ? 'Automático' : 'Personalizado'}
            </Badge>
            {group.is_admin && (
              <Badge variant="default" className="text-[10px] h-4">Administrador</Badge>
            )}
            <span className="text-xs text-muted-foreground">{group.member_count} membros</span>
          </div>
          {group.description && (
            <p className="text-xs text-muted-foreground">{group.description}</p>
          )}
        </div>

        {/* Actions for custom groups */}
        {group.group_type === 'custom' && (
          <>
            <Separator />
            <div className="px-4 py-3">
              {group.is_member ? (
                <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => leaveGroup.mutate(group.id)}>
                  <LogOut className="h-3.5 w-3.5" /> Sair do Grupo
                </Button>
              ) : isPending ? (
                <Button variant="outline" size="sm" className="w-full gap-1.5" disabled>
                  <Clock className="h-3.5 w-3.5" /> Pendente
                </Button>
              ) : (
                <Button size="sm" className="w-full gap-1.5" onClick={() => requestJoin.mutate(group.id)} disabled={requestJoin.isPending}>
                  Solicitar Entrada
                </Button>
              )}
            </div>
          </>
        )}

        {/* Pending requests (admin/HR) */}
        {isAdminOrHR && groupPendingRequests.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />
                Pendentes ({groupPendingRequests.length})
              </p>
              {groupPendingRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between gap-1 p-1.5 rounded-md border">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Avatar className="h-6 w-6">
                      {req.profiles?.avatar_url && <AvatarImage src={req.profiles.avatar_url} />}
                      <AvatarFallback className="text-[8px]">{getInitials(req.profiles?.full_name)}</AvatarFallback>
                    </Avatar>
                    <p className="text-[11px] font-medium truncate">{req.profiles?.full_name || 'Usuário'}</p>
                  </div>
                  <div className="flex gap-0.5">
                    <Button size="sm" variant="default" className="h-6 px-1.5 text-[10px]" onClick={() => approveRequest.mutate(req.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 px-1.5 text-destructive text-[10px]" onClick={() => rejectRequest.mutate(req.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GroupInfoSidebar;
