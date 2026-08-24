import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ServiceOrderFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  vesselId?: string;
}

const SELECT_FIELDS = `
  id,
  order_number,
  client_reference,
  status,
  scheduled_date,
  omie_created_date,
  omie_value,
  created_at,
  created_by,
  vessels:vessel_id (
    name
  ),
  clients:client_id (
    name
  ),
  created_by_profile:created_by (
    full_name
  )
`;

export interface ServiceOrderListItem {
  id: string;
  orderNumber: string;
  clientReference: string | null;
  vessel: string;
  client: string;
  status: string;
  scheduledDate: string | null;
  omieCreatedDate: string | null;
  omieValue: number | null;
  createdAt: string;
  createdBy: string | null;
  createdByName: string;
}

const mapOrder = (order: any): ServiceOrderListItem => ({
  id: order.id,
  orderNumber: order.order_number,
  clientReference: order.client_reference,
  vessel: order.vessels?.name || 'N/A',
  client: order.clients?.name || 'N/A',
  status: order.status,
  scheduledDate: order.scheduled_date,
  omieCreatedDate: order.omie_created_date,
  omieValue: order.omie_value,
  createdAt: order.created_at,
  createdBy: order.created_by,
  createdByName: order.created_by_profile?.full_name || 'N/A',
});

/**
 * Busca OSs com filtros aplicados no banco (server-side).
 * Com page/pageSize faz paginação real; sem eles retorna no máximo `legacyLimit` registros
 * (uso em seletores, ex.: diálogo de compras).
 */
export const fetchServiceOrders = async (
  companyId: string,
  filters: ServiceOrderFilters = {},
  legacyLimit?: number,
): Promise<{ orders: ServiceOrderListItem[]; totalCount: number }> => {
  const sel = (s: string): string => s;
  let query = supabase
    .from('service_orders')
    .select(sel(SELECT_FIELDS), { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  const status = filters.status || 'all';
  const vesselId = filters.vesselId || 'all';
  const search = (filters.search || '').trim();

  if (status !== 'all') {
    query = query.eq('status', status);
  }
  if (vesselId !== 'all') {
    query = query.eq('vessel_id', vesselId);
  }

  if (search) {
    // Busca também por nome de cliente/embarcação via ids correspondentes
    const [{ data: clientMatches }, { data: vesselMatches }] = await Promise.all([
      supabase.from('clients').select('id').eq('company_id', companyId).ilike('name', `%${search}%`).limit(50),
      supabase.from('vessels').select('id').ilike('name', `%${search}%`).limit(50),
    ]);
    const orParts = [`order_number.ilike.%${search}%`, `client_reference.ilike.%${search}%`];
    const clientIds = (clientMatches ?? []).map((c: any) => c.id);
    const vesselIds = (vesselMatches ?? []).map((v: any) => v.id);
    if (clientIds.length > 0) orParts.push(`client_id.in.(${clientIds.join(',')})`);
    if (vesselIds.length > 0) orParts.push(`vessel_id.in.(${vesselIds.join(',')})`);
    query = query.or(orParts.join(','));
  }

  const { page, pageSize } = filters;
  const finalQuery = page && pageSize
    ? query.range((page - 1) * pageSize, page * pageSize - 1)
    : query.limit(legacyLimit ?? 500);

  const { data, error, count } = await finalQuery;
  if (error) throw error;

  return {
    orders: ((data ?? []) as any[]).map(mapOrder),
    totalCount: count ?? 0,
  };
};

export const useServiceOrders = (filters?: ServiceOrderFilters) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'service-orders',
      user?.id,
      filters?.page ?? null,
      filters?.pageSize ?? null,
      filters?.search ?? '',
      filters?.status ?? 'all',
      filters?.vesselId ?? 'all',
    ],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      return fetchServiceOrders(profileData.company_id, filters ?? {});
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    placeholderData: (previous) => previous, // mantém a página anterior enquanto carrega a próxima
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['service-orders'] });
  };

  return {
    orders: data?.orders ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    error,
    invalidate,
  };
};
