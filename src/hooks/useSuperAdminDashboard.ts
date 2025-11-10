import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalCompanies: number;
  totalUsers: number;
  totalServiceOrders: number;
  activeCompanies: number;
}

interface CompanyGrowth {
  month: string;
  count: number;
}

interface CompanyUsage {
  company_name: string;
  service_orders: number;
  users: number;
}

export const useSuperAdminDashboard = () => {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['super-admin-stats', user?.id],
    queryFn: async () => {
      // Fetch total companies
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Fetch total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total service orders
      const { count: ordersCount } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true });

      // Fetch active companies (with payment_status = 'paid')
      const { count: activeCompaniesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'paid');

      const dashboardStats: DashboardStats = {
        totalCompanies: companiesCount || 0,
        totalUsers: usersCount || 0,
        totalServiceOrders: ordersCount || 0,
        activeCompanies: activeCompaniesCount || 0,
      };

      return dashboardStats;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: companyGrowth, isLoading: growthLoading } = useQuery({
    queryKey: ['company-growth', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData = data?.reduce((acc: Record<string, number>, company) => {
        const date = new Date(company.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        acc[monthKey] = (acc[monthKey] || 0) + 1;
        return acc;
      }, {});

      // Convert to array and sort
      const growthData: CompanyGrowth[] = Object.entries(monthlyData || {})
        .map(([month, count]) => ({
          month,
          count,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Get last 6 months
      return growthData.slice(-6);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const { data: companyUsage, isLoading: usageLoading } = useQuery({
    queryKey: ['company-usage', user?.id],
    queryFn: async () => {
      // Fetch companies with their service orders count
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .limit(10);

      if (companiesError) throw companiesError;

      // Fetch service orders count for each company
      const usagePromises = companies?.map(async (company) => {
        const { count: ordersCount } = await supabase
          .from('service_orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);

        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);

        return {
          company_name: company.name,
          service_orders: ordersCount || 0,
          users: usersCount || 0,
        };
      });

      const usageData = await Promise.all(usagePromises || []);

      // Sort by service orders descending
      return usageData.sort((a, b) => b.service_orders - a.service_orders);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  return {
    stats,
    companyGrowth,
    companyUsage,
    isLoading: statsLoading || growthLoading || usageLoading,
  };
};
