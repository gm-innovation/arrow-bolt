import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCorpDashboard } from '@/hooks/useCorpDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useMemo } from 'react';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const CorpReports = () => {
  const { stats, isLoading } = useCorpDashboard();

  const pending = (stats?.pending_manager || 0) + (stats?.pending_director || 0);

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

  const categoryData = useMemo(() => {
    if (!stats?.requests) return [];
    const byCategory: Record<string, number> = {};
    (stats.requests as any[]).forEach(r => {
      const cat = r.request_type?.category || 'Sem categoria';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const approvalByDeptData = useMemo(() => {
    if (!stats?.requests) return [];
    const depts: Record<string, { total: number; approved: number }> = {};
    (stats.requests as any[]).forEach(r => {
      const dept = r.department_id || 'Sem dept.';
      if (!depts[dept]) depts[dept] = { total: 0, approved: 0 };
      depts[dept].total += 1;
      if (r.status === 'approved') depts[dept].approved += 1;
    });
    return Object.entries(depts).map(([name, v]) => ({
      name: name.slice(0, 12),
      taxa: v.total > 0 ? Math.round((v.approved / v.total) * 100) : 0,
    }));
  }, [stats]);

  const summaryCards = [
    { label: 'Total de Solicitações', value: stats?.total || 0, icon: FileText, color: 'text-primary' },
    { label: 'Pendentes', value: pending, icon: Clock, color: 'text-yellow-500' },
    { label: 'Aprovadas', value: stats?.approved || 0, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Rejeitadas', value: stats?.rejected || 0, icon: XCircle, color: 'text-destructive' },
  ];

  return (
    <CorpLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Relatórios</h2>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-80" /><Skeleton className="h-80" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {summaryCards.map(card => (
                <Card key={card.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <card.icon className={`h-8 w-8 ${card.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{card.value}</p>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Row 2: Existing charts */}
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
            </div>

            {/* Row 3: New charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Solicitações por Categoria</CardTitle></CardHeader>
                <CardContent>
                  {categoryData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Taxa de Aprovação por Departamento (%)</CardTitle></CardHeader>
                <CardContent>
                  {approvalByDeptData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={approvalByDeptData} layout="vertical">
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={90} />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Bar dataKey="taxa" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </CorpLayout>
  );
};

export default CorpReports;
