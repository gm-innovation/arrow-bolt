import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCorpDashboard } from '@/hooks/useCorpDashboard';
import { useCorpRequests } from '@/hooks/useCorpRequests';
import { useCorpFeed } from '@/hooks/useCorpFeed';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, Clock, CheckCircle2, XCircle, DollarSign, AlertTriangle, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CorpDashboard = () => {
  const { stats, isLoading } = useCorpDashboard();
  const { requests } = useCorpRequests();
  const { posts } = useCorpFeed();
  const { userRole } = useAuth();
  const navigate = useNavigate();

  const isDirector = userRole === 'director';
  const isManager = userRole === 'manager';

  const cards = [
    { title: 'Total de Requisições', value: stats?.total || 0, icon: ClipboardList, color: 'text-blue-600' },
    { title: 'Pendentes (Gerente)', value: stats?.pending_manager || 0, icon: Clock, color: 'text-amber-600' },
    { title: 'Pendentes (Diretoria)', value: stats?.pending_director || 0, icon: AlertTriangle, color: 'text-orange-600' },
    { title: 'Aprovadas', value: stats?.approved || 0, icon: CheckCircle2, color: 'text-green-600' },
    { title: 'Rejeitadas', value: stats?.rejected || 0, icon: XCircle, color: 'text-red-600' },
    { title: 'Volume Aprovado', value: `R$ ${(stats?.total_approved_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-600' },
  ];

  const recentRequests = (requests || []).slice(0, 5);
  const recentPosts = (posts as any[] || []).slice(0, 3);

  return (
    <CorpLayout>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">{card.value}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Requisições Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/corp/requests')}>Ver todas</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma requisição ainda.</p>
              ) : (
                recentRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/corp/requests')}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{req.title}</p>
                      <p className="text-xs text-muted-foreground">{req.requester?.full_name} • {format(new Date(req.created_at), "dd/MM", { locale: ptBR })}</p>
                    </div>
                    <Badge variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'destructive' : req.status.startsWith('pending') ? 'warning' : 'secondary'} size="sm">
                      {req.status === 'open' ? 'Aberta' : req.status === 'pending_manager' ? 'Pend. Ger.' : req.status === 'pending_director' ? 'Pend. Dir.' : req.status === 'approved' ? 'Aprovada' : req.status === 'rejected' ? 'Rejeitada' : req.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Feed */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Feed Recente
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/corp/feed')}>Ver feed</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum post no feed.</p>
              ) : (
                recentPosts.map((post: any) => (
                  <div key={post.id} className="p-2 rounded hover:bg-muted/50">
                    {post.title && <p className="text-sm font-medium">{post.title}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{post.author?.full_name} • {format(new Date(post.created_at), "dd/MM", { locale: ptBR })}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </CorpLayout>
  );
};

export default CorpDashboard;
