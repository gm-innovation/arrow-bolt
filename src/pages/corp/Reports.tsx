import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCorpDashboard } from '@/hooks/useCorpDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useMemo } from 'react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const CorpReports = () => {
  const { stats, isLoading } = useCorpDashboard();

  const statusData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Abertas', value: stats.total - stats.pending_manager - stats.pending_director - stats.approved - stats.rejected },
      { name: 'Pend. Gerente', value: stats.pending_manager },
      { name: 'Pend. Diretoria', value: stats.pending_director },
      { name: 'Aprovadas', value: stats.approved },
      { name: 'Rejeitadas', value: stats.rejected },
    ].filter(d => d.value > 0);
  }, [stats]);

  const deptData = useMemo(() => {
    if (!stats?.requests) return [];
    const byDept: Record<string, number> = {};
    (stats.requests as any[]).forEach(r => {
      const dept = r.department_id || 'Sem dept.';
      byDept[dept] = (byDept[dept] || 0) + 1;
    });
    return Object.entries(byDept).map(([name, value]) => ({ name: name.slice(0, 12), value }));
  }, [stats]);

  return (
    <CorpLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Relatórios</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80" /><Skeleton className="h-80" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Requisições por Departamento</CardTitle></CardHeader>
              <CardContent>
                {deptData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={deptData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Resumo Financeiro</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{stats?.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.approved || 0}</p>
                    <p className="text-sm text-muted-foreground">Aprovadas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      R$ {(stats?.total_approved_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">Volume Aprovado</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.total ? Math.round((stats.approved / stats.total) * 100) : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CorpLayout>
  );
};

export default CorpReports;
