import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useUniversityCourses, useCreateEnrollment } from '@/hooks/useUniversity';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_started: { label: 'Não iniciado', variant: 'secondary' },
  in_progress: { label: 'Em andamento', variant: 'default' },
  completed: { label: 'Concluído', variant: 'outline' },
};

export default function HRUniversityEnrollments() {
  const { profile } = useAuth();
  const { data: courses } = useUniversityCourses();
  const createEnrollment = useCreateEnrollment();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);

  // Fetch company employees
  const { data: employees } = useQuery({
    queryKey: ['company-employees', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', profile!.company_id!)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  // Fetch all enrollments for the company
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['university-all-enrollments', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('university_enrollments')
        .select('*, course:university_courses(title), user:profiles(full_name, email)')
        .eq('company_id', profile!.company_id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const handleEnroll = async () => {
    if (!selectedCourse || !selectedUser) return;
    await createEnrollment.mutateAsync({ user_id: selectedUser, course_id: selectedCourse, is_mandatory: isMandatory });
    setShowDialog(false);
    setSelectedCourse('');
    setSelectedUser('');
    setIsMandatory(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Matricular Colaborador
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : !enrollments?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma matrícula ainda.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Obrigatório</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e: any) => {
                const s = STATUS_MAP[e.status] || STATUS_MAP.not_started;
                return (
                  <TableRow key={e.id}>
                    <TableCell>{e.user?.full_name || e.user?.email}</TableCell>
                    <TableCell>{e.course?.title}</TableCell>
                    <TableCell>{e.is_mandatory ? <Badge>Sim</Badge> : <Badge variant="secondary">Não</Badge>}</TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(e.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Matricular Colaborador</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Curso</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger><SelectValue placeholder="Selecione um curso" /></SelectTrigger>
                <SelectContent>
                  {courses?.filter(c => c.is_published).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Colaborador</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Selecione um colaborador" /></SelectTrigger>
                <SelectContent>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name || e.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
              <Label>Treinamento obrigatório</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEnroll} disabled={!selectedCourse || !selectedUser || createEnrollment.isPending}>
              {createEnrollment.isPending ? 'Matriculando...' : 'Matricular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
