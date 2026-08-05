import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CompanyBenefit {
  id: string;
  company_id: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'draft' | 'active' | 'finished' | 'cancelled';

export interface HRCampaign {
  id: string;
  company_id: string;
  title: string;
  description?: string | null;
  campaign_type: string;
  status: CampaignStatus;
  starts_on?: string | null;
  ends_on?: string | null;
  audience?: string | null;
  cta_label?: string | null;
  cta_link?: string | null;
  feed_post_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export const CAMPAIGN_TYPES = [
  { value: 'campanha', label: 'Campanha' },
  { value: 'comunicado', label: 'Comunicado' },
  { value: 'evento', label: 'Evento' },
  { value: 'pesquisa', label: 'Pesquisa interna' },
  { value: 'reconhecimento', label: 'Reconhecimento' },
];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  finished: 'Encerrada',
  cancelled: 'Cancelada',
};

const useCompanyId = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-company-id', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('company_id').eq('id', user!.id).maybeSingle();
      return data?.company_id as string | undefined;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCompanyBenefits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();

  const query = useQuery({
    queryKey: ['company_benefits'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('company_benefits')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return (data || []) as CompanyBenefit[];
    },
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['company_benefits'] });

  const create = useMutation({
    mutationFn: async (b: Partial<CompanyBenefit>) => {
      const { error } = await (supabase as any)
        .from('company_benefits')
        .insert({ ...b, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Benefício cadastrado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<CompanyBenefit> & { id: string }) => {
      const { error } = await (supabase as any).from('company_benefits').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Benefício atualizado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('company_benefits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Benefício removido' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { benefits: query.data || [], isLoading: query.isLoading, create, update, remove };
};

export const useHRCampaigns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();

  const query = useQuery({
    queryKey: ['hr_campaigns'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('hr_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as HRCampaign[];
    },
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr_campaigns'] });

  const publishToFeed = async (campaign: HRCampaign) => {
    const lines = [campaign.description || ''];
    if (campaign.cta_link) lines.push(`\n${campaign.cta_label || 'Saiba mais'}: ${campaign.cta_link}`);
    const { data: post, error } = await supabase
      .from('corp_feed_posts')
      .insert({
        company_id: campaign.company_id,
        author_id: user!.id,
        title: campaign.title,
        content: lines.join('\n').trim() || campaign.title,
        post_type: 'announcement',
      })
      .select('id')
      .single();
    if (error) throw error;
    const { error: linkErr } = await (supabase as any)
      .from('hr_campaigns')
      .update({ feed_post_id: post.id })
      .eq('id', campaign.id);
    if (linkErr) throw linkErr;
    return post.id;
  };

  const create = useMutation({
    mutationFn: async ({ publish, ...c }: Partial<HRCampaign> & { publish?: boolean }) => {
      const { data, error } = await (supabase as any)
        .from('hr_campaigns')
        .insert({ ...c, company_id: companyId, created_by: user!.id })
        .select('*')
        .single();
      if (error) throw error;
      if (publish) await publishToFeed(data as HRCampaign);
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['corp-feed'] });
      toast({ title: 'Campanha criada' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<HRCampaign> & { id: string }) => {
      const { error } = await (supabase as any).from('hr_campaigns').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Campanha atualizada' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('hr_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Campanha removida' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const announce = useMutation({
    mutationFn: async (campaign: HRCampaign) => { await publishToFeed(campaign); },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['corp-feed'] });
      toast({ title: 'Campanha divulgada no feed' });
    },
    onError: (e: Error) => toast({ title: 'Erro ao divulgar', description: e.message, variant: 'destructive' }),
  });

  return { campaigns: query.data || [], isLoading: query.isLoading, create, update, remove, announce };
};
