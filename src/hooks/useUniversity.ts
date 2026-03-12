import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Types
export interface UniversityCourse {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  is_published: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UniversityModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  sort_order: number | null;
  duration_minutes: number | null;
  created_at: string | null;
}

export interface UniversityEnrollment {
  id: string;
  company_id: string;
  user_id: string;
  course_id: string;
  is_mandatory: boolean | null;
  assigned_by: string | null;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  course?: UniversityCourse;
  user?: { id: string; full_name: string | null; email: string | null };
}

export interface UniversityProgress {
  id: string;
  enrollment_id: string;
  module_id: string;
  completed: boolean | null;
  completed_at: string | null;
}

export interface UniversityCertificate {
  id: string;
  enrollment_id: string;
  user_id: string;
  course_id: string;
  issued_at: string | null;
  certificate_code: string | null;
  course?: UniversityCourse;
}

// ---- COURSES ----

export function useUniversityCourses(publishedOnly = false) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['university-courses', profile?.company_id, publishedOnly],
    queryFn: async () => {
      let q = supabase.from('university_courses').select('*').eq('company_id', profile!.company_id!);
      if (publishedOnly) q = q.eq('is_published', true);
      q = q.order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data as UniversityCourse[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useUniversityCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ['university-course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('university_courses')
        .select('*')
        .eq('id', courseId!)
        .single();
      if (error) throw error;
      return data as UniversityCourse;
    },
    enabled: !!courseId,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; category?: string; duration_minutes?: number }) => {
      const { error } = await supabase.from('university_courses').insert({
        company_id: profile!.company_id!,
        created_by: user!.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-courses'] });
      toast({ title: 'Curso criado com sucesso' });
    },
    onError: (e: any) => toast({ title: 'Erro ao criar curso', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<UniversityCourse> & { id: string }) => {
      const { error } = await supabase.from('university_courses').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-courses'] });
      qc.invalidateQueries({ queryKey: ['university-course'] });
      toast({ title: 'Curso atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('university_courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-courses'] });
      toast({ title: 'Curso removido' });
    },
    onError: (e: any) => toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' }),
  });
}

// ---- MODULES ----

export function useUniversityModules(courseId: string | undefined) {
  return useQuery({
    queryKey: ['university-modules', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('university_modules')
        .select('*')
        .eq('course_id', courseId!)
        .order('sort_order');
      if (error) throw error;
      return data as UniversityModule[];
    },
    enabled: !!courseId,
  });
}

export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { course_id: string; title: string; content_type: string; content_url?: string; sort_order?: number; duration_minutes?: number; description?: string }) => {
      const { error } = await supabase.from('university_modules').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-modules'] });
      toast({ title: 'Módulo adicionado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<UniversityModule> & { id: string }) => {
      const { error } = await supabase.from('university_modules').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-modules'] });
    },
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('university_modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-modules'] });
      toast({ title: 'Módulo removido' });
    },
  });
}

// ---- ENROLLMENTS ----

export function useMyEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['university-my-enrollments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('university_enrollments')
        .select('*, course:university_courses(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (UniversityEnrollment & { course: UniversityCourse })[];
    },
    enabled: !!user?.id,
  });
}

export function useEnrollmentsByCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ['university-enrollments-course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('university_enrollments')
        .select('*, user:profiles(id, full_name, email)')
        .eq('course_id', courseId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!courseId,
  });
}

export function useCreateEnrollment() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  return useMutation({
    mutationFn: async (data: { user_id: string; course_id: string; is_mandatory?: boolean }) => {
      const { error } = await supabase.from('university_enrollments').insert({
        company_id: profile!.company_id!,
        assigned_by: user!.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-enrollments'] });
      qc.invalidateQueries({ queryKey: ['university-my-enrollments'] });
      toast({ title: 'Matrícula realizada' });
    },
    onError: (e: any) => toast({ title: 'Erro na matrícula', description: e.message, variant: 'destructive' }),
  });
}

// ---- PROGRESS ----

export function useModuleProgress(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ['university-progress', enrollmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('university_progress')
        .select('*')
        .eq('enrollment_id', enrollmentId!);
      if (error) throw error;
      return data as UniversityProgress[];
    },
    enabled: !!enrollmentId,
  });
}

export function useMarkModuleComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrollment_id, module_id }: { enrollment_id: string; module_id: string }) => {
      const { error } = await supabase.from('university_progress').upsert(
        { enrollment_id, module_id, completed: true, completed_at: new Date().toISOString() },
        { onConflict: 'enrollment_id,module_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-progress'] });
      qc.invalidateQueries({ queryKey: ['university-my-enrollments'] });
    },
  });
}

export function useUpdateEnrollmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'in_progress' ) updates.started_at = new Date().toISOString();
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from('university_enrollments').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-my-enrollments'] });
      qc.invalidateQueries({ queryKey: ['university-enrollments'] });
    },
  });
}

// ---- TRAILS ----

export interface UniversityTrail {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  is_published: boolean | null;
  created_by: string | null;
  created_at: string | null;
}

export interface UniversityTrailCourse {
  id: string;
  trail_id: string;
  course_id: string;
  sort_order: number | null;
  course?: UniversityCourse;
}

export function useUniversityTrails(publishedOnly = false) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['university-trails', profile?.company_id, publishedOnly],
    queryFn: async () => {
      let q = supabase.from('university_trails').select('*').eq('company_id', profile!.company_id!);
      if (publishedOnly) q = q.eq('is_published', true);
      q = q.order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data as UniversityTrail[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useUniversityTrail(trailId: string | undefined) {
  return useQuery({
    queryKey: ['university-trail', trailId],
    queryFn: async () => {
      const { data, error } = await supabase.from('university_trails').select('*').eq('id', trailId!).single();
      if (error) throw error;
      return data as UniversityTrail;
    },
    enabled: !!trailId,
  });
}

export function useCreateTrail() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string }) => {
      const { error } = await supabase.from('university_trails').insert({
        company_id: profile!.company_id!,
        created_by: user!.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-trails'] });
      toast({ title: 'Trilha criada com sucesso' });
    },
    onError: (e: any) => toast({ title: 'Erro ao criar trilha', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateTrail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<UniversityTrail> & { id: string }) => {
      const { error } = await supabase.from('university_trails').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-trails'] });
      qc.invalidateQueries({ queryKey: ['university-trail'] });
      toast({ title: 'Trilha atualizada' });
    },
    onError: (e: any) => toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteTrail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('university_trails').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-trails'] });
      toast({ title: 'Trilha removida' });
    },
    onError: (e: any) => toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' }),
  });
}

export function useTrailCourses(trailId: string | undefined) {
  return useQuery({
    queryKey: ['university-trail-courses', trailId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('university_trail_courses')
        .select('*, course:university_courses(*)')
        .eq('trail_id', trailId!)
        .order('sort_order');
      if (error) throw error;
      return data as (UniversityTrailCourse & { course: UniversityCourse })[];
    },
    enabled: !!trailId,
  });
}

export function useAddCourseToTrail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { trail_id: string; course_id: string; sort_order?: number }) => {
      const { error } = await supabase.from('university_trail_courses').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-trail-courses'] });
      toast({ title: 'Curso adicionado à trilha' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useRemoveCourseFromTrail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('university_trail_courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-trail-courses'] });
      toast({ title: 'Curso removido da trilha' });
    },
  });
}

// ---- CERTIFICATES ----

export function useMyCertificates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['university-certificates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('university_certificates')
        .select('*, course:university_courses(*)')
        .eq('user_id', user!.id)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data as (UniversityCertificate & { course: UniversityCourse })[];
    },
    enabled: !!user?.id,
  });
}

export function useIssueCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { enrollment_id: string; user_id: string; course_id: string }) => {
      const { error } = await supabase.from('university_certificates').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university-certificates'] });
      toast({ title: 'Certificado emitido!' });
    },
  });
}
