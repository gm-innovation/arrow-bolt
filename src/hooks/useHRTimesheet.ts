import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface JourneySettings {
  id?: string;
  company_id?: string;
  daily_hours: number;
  weekly_hours: number;
  break_minutes: number;
  tolerance_minutes: number;
  night_start: string;
  night_end: string;
  overtime_mode: string;
  time_bank_expiry_months: number;
  requires_overtime_approval: boolean;
}

export interface TimeclockDevice {
  id: string;
  company_id: string;
  name: string;
  vendor: string;
  integration_kind: string;
  base_url: string;
  username: string | null;
  password_secret_name: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_punch_at: string | null;
  notes: string | null;
}

export interface TimesheetDay {
  id: string;
  employee_id: string;
  work_date: string;
  first_in: string | null;
  last_out: string | null;
  break_minutes: number;
  worked_hours: number;
  expected_hours: number;
  hours_normal: number;
  hours_extra: number;
  hours_night: number;
  late_minutes: number;
  balance_hours: number;
  is_absence: boolean;
  is_holiday: boolean;
  is_vacation: boolean;
  is_weekend: boolean;
  status: string;
  issues: string[] | null;
  manual_override: boolean;
  override_reason: string | null;
  notes: string | null;
  employee_name?: string;
}

export interface TimesheetClosure {
  id: string;
  employee_id: string;
  period_year: number;
  period_month: number;
  status: string;
  total_worked: number;
  total_normal: number;
  total_extra: number;
  total_night: number;
  total_late_minutes: number;
  absence_days: number;
  balance_hours: number;
  closed_at: string | null;
  employee_name?: string;
}

export interface OvertimeApproval {
  id: string;
  employee_id: string;
  work_date: string;
  hours_extra: number;
  hours_night: number;
  status: string;
  manager_notes: string | null;
  hr_notes: string | null;
  rejection_reason: string | null;
  employee_name?: string;
}

export interface TimeBankEntry {
  id: string;
  employee_id: string;
  entry_date: string;
  hours: number;
  kind: string;
  origin: string;
  expires_at: string | null;
  description: string | null;
  employee_name?: string;
}

export interface PunchCorrectionRequest {
  id: string;
  employee_id: string;
  work_date: string;
  requested_check_in: string | null;
  requested_check_out: string | null;
  reason: string;
  status: string;
  review_notes: string | null;
  created_at: string;
  employee_name?: string;
}

const monthRange = (year: number, month: number) => {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
};

const useEmployeeNames = () => {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['hr-employee-names', profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, timeclock_pin, position, status')
        .eq('company_id', profile!.company_id)
        .order('full_name');
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useHRTimesheet = (year: number, month: number, employeeId?: string) => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;
  const { start, end } = monthRange(year, month);
  const employees = useEmployeeNames();
  const nameOf = (id: string) =>
    (employees.data ?? []).find((e) => e.id === id)?.full_name ?? '—';

  const invalidate = () => {
    ['hr-timesheet-days', 'hr-timesheet-closures', 'hr-overtime', 'hr-time-bank', 'hr-punch-corrections', 'hr-timeclock-devices', 'hr-timeclock-logs'].forEach(
      (key) => queryClient.invalidateQueries({ queryKey: [key] }),
    );
  };

  const settings = useQuery({
    queryKey: ['hr-journey-settings', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_journey_settings')
        .select('*')
        .eq('company_id', companyId!)
        .maybeSingle();
      if (error) throw error;
      return (data as JourneySettings | null) ?? null;
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (values: Partial<JourneySettings>) => {
      const { error } = await supabase
        .from('hr_journey_settings')
        .upsert({ company_id: companyId!, ...values } as never, { onConflict: 'company_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Parâmetros de jornada salvos');
      queryClient.invalidateQueries({ queryKey: ['hr-journey-settings'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const devices = useQuery({
    queryKey: ['hr-timeclock-devices', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_timeclock_devices')
        .select('*')
        .eq('company_id', companyId!)
        .order('name');
      if (error) throw error;
      return (data ?? []) as TimeclockDevice[];
    },
  });

  const saveDevice = useMutation({
    mutationFn: async (values: Partial<TimeclockDevice> & { name: string; base_url: string }) => {
      const payload = { company_id: companyId!, ...values } as never;
      const { error } = values.id
        ? await supabase.from('hr_timeclock_devices').update(payload).eq('id', values.id)
        : await supabase.from('hr_timeclock_devices').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Relógio de ponto salvo');
      queryClient.invalidateQueries({ queryKey: ['hr-timeclock-devices'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncLogs = useQuery({
    queryKey: ['hr-timeclock-logs', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_timeclock_sync_logs')
        .select('*')
        .eq('company_id', companyId!)
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const syncPunches = useMutation({
    mutationFn: async (deviceId?: string) => {
      const { data, error } = await supabase.functions.invoke('hr-timeclock-sync', {
        body: deviceId ? { device_id: deviceId } : {},
      });
      if (error) throw error;
      return data as { results?: Array<{ device: string; inserted?: number; error?: string }> };
    },
    onSuccess: (data) => {
      const results = data?.results ?? [];
      const failed = results.filter((r) => r.error);
      const inserted = results.reduce((a, r) => a + (r.inserted ?? 0), 0);
      if (failed.length > 0) toast.error(`Falha em ${failed.length} relógio(s): ${failed[0].error}`);
      else toast.success(`${inserted} nova(s) batida(s) importada(s)`);
      invalidate();
    },
    onError: (e: Error) => toast.error(`Sincronização falhou: ${e.message}`),
  });

  const days = useQuery({
    queryKey: ['hr-timesheet-days', companyId, year, month, employeeId],
    enabled: !!companyId,
    queryFn: async () => {
      let query = supabase
        .from('hr_timesheet_days')
        .select('*')
        .eq('company_id', companyId!)
        .gte('work_date', start)
        .lte('work_date', end)
        .order('work_date');
      if (employeeId) query = query.eq('employee_id', employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TimesheetDay[];
    },
  });

  const closures = useQuery({
    queryKey: ['hr-timesheet-closures', companyId, year, month],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_timesheet_closures')
        .select('*')
        .eq('company_id', companyId!)
        .eq('period_year', year)
        .eq('period_month', month);
      if (error) throw error;
      return (data ?? []) as TimesheetClosure[];
    },
  });

  const runCompute = useMutation({
    mutationFn: async (action: 'compute' | 'close' | 'reopen') => {
      const { data, error } = await supabase.functions.invoke('hr-timesheet-compute', {
        body: { action, year, month, employee_id: employeeId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, action) => {
      toast.success(
        action === 'close'
          ? 'Período fechado'
          : action === 'reopen'
            ? 'Período reaberto'
            : 'Apuração concluída',
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateDay = useMutation({
    mutationFn: async (values: Partial<TimesheetDay> & { id: string }) => {
      const { id, ...rest } = values;
      const { error } = await supabase
        .from('hr_timesheet_days')
        .update({
          ...rest,
          manual_override: true,
          overridden_by: user?.id,
          overridden_at: new Date().toISOString(),
        } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Dia ajustado manualmente');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const overtime = useQuery({
    queryKey: ['hr-overtime', companyId, year, month],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_overtime_approvals')
        .select('*')
        .eq('company_id', companyId!)
        .gte('work_date', start)
        .lte('work_date', end)
        .order('work_date');
      if (error) throw error;
      return (data ?? []) as OvertimeApproval[];
    },
  });

  const decideOvertime = useMutation({
    mutationFn: async ({
      ids,
      approve,
      notes,
    }: { ids: string[]; approve: boolean; notes?: string }) => {
      const { error } = await supabase
        .from('hr_overtime_approvals')
        .update({
          status: approve ? 'approved' : 'rejected',
          hr_id: user?.id,
          hr_decided_at: new Date().toISOString(),
          hr_notes: notes ?? null,
          rejection_reason: approve ? null : (notes ?? 'Não aprovado'),
        } as never)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Horas extras atualizadas');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const timeBank = useQuery({
    queryKey: ['hr-time-bank', companyId, employeeId],
    enabled: !!companyId,
    queryFn: async () => {
      let query = supabase
        .from('hr_time_bank_entries')
        .select('*')
        .eq('company_id', companyId!)
        .order('entry_date', { ascending: false });
      if (employeeId) query = query.eq('employee_id', employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TimeBankEntry[];
    },
  });

  const corrections = useQuery({
    queryKey: ['hr-punch-corrections', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_punch_correction_requests')
        .select('*')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PunchCorrectionRequest[];
    },
  });

  const reviewCorrection = useMutation({
    mutationFn: async ({
      id,
      approve,
      notes,
    }: { id: string; approve: boolean; notes?: string }) => {
      const { error } = await supabase
        .from('hr_punch_correction_requests')
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes ?? null,
        } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitação atualizada');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePin = useMutation({
    mutationFn: async ({ id, pin }: { id: string; pin: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ timeclock_pin: pin || null } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Matrícula do relógio salva');
      queryClient.invalidateQueries({ queryKey: ['hr-employee-names'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const timeBankBalance = (id: string) =>
    (timeBank.data ?? [])
      .filter((e) => e.employee_id === id)
      .reduce((acc, e) => acc + Number(e.hours ?? 0), 0);

  return {
    employees,
    nameOf,
    settings,
    saveSettings,
    devices,
    saveDevice,
    syncLogs,
    syncPunches,
    days,
    closures,
    runCompute,
    updateDay,
    overtime,
    decideOvertime,
    timeBank,
    timeBankBalance,
    corrections,
    reviewCorrection,
    savePin,
  };
};

/** Espelho de ponto do próprio colaborador (portal /corp). */
export const useMyTimesheet = (year: number, month: number) => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { start, end } = monthRange(year, month);

  const days = useQuery({
    queryKey: ['my-timesheet', user?.id, year, month],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_timesheet_days')
        .select('*')
        .eq('employee_id', user!.id)
        .gte('work_date', start)
        .lte('work_date', end)
        .order('work_date');
      if (error) throw error;
      return (data ?? []) as TimesheetDay[];
    },
  });

  const bank = useQuery({
    queryKey: ['my-time-bank', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_time_bank_entries')
        .select('*')
        .eq('employee_id', user!.id)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TimeBankEntry[];
    },
  });

  const requests = useQuery({
    queryKey: ['my-punch-corrections', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_punch_correction_requests')
        .select('*')
        .eq('employee_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PunchCorrectionRequest[];
    },
  });

  const requestCorrection = useMutation({
    mutationFn: async (values: {
      work_date: string;
      requested_check_in?: string;
      requested_check_out?: string;
      reason: string;
    }) => {
      const { error } = await supabase.from('hr_punch_correction_requests').insert({
        company_id: profile?.company_id,
        employee_id: user!.id,
        work_date: values.work_date,
        requested_check_in: values.requested_check_in || null,
        requested_check_out: values.requested_check_out || null,
        reason: values.reason,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitação de ajuste enviada ao RH');
      queryClient.invalidateQueries({ queryKey: ['my-punch-corrections'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const balance = (bank.data ?? []).reduce((a, e) => a + Number(e.hours ?? 0), 0);

  return { days, bank, balance, requests, requestCorrection };
};
