import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCorpDashboard } from '@/hooks/useCorpDashboard';
import { ClipboardList, Clock, CheckCircle2, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const CorpDashboard = () => {
  const { stats, isLoading } = useCorpDashboard();

  const cards = [
    { title: 'Total de Requisições', value: stats?.total || 0, icon: ClipboardList, color: 'text-blue-600' },
    { title: 'Pendentes (Gerente)', value: stats?.pending_manager || 0, icon: Clock, color: 'text-amber-600' },
    { title: 'Pendentes (Diretoria)', value: stats?.pending_director || 0, icon: AlertTriangle, color: 'text-orange-600' },
    { title: 'Aprovadas', value: stats?.approved || 0, icon: CheckCircle2, color: 'text-green-600' },
    { title: 'Rejeitadas', value: stats?.rejected || 0, icon: XCircle, color: 'text-red-600' },
    { title: 'Volume Aprovado', value: `R$ ${(stats?.total_approved_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-600' },
  ];

  return (
    <CorpLayout>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </CorpLayout>
  );
};

export default CorpDashboard;
