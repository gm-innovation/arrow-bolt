import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAbsences, Absence } from '@/hooks/useAbsences';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  absence: Absence | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditAbsenceDialog = ({ absence, open, onOpenChange, onSuccess }: Props) => {
  const { user } = useAuth();
  const { updateAbsence, deleteAbsence } = useAbsences();
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    technician_id: '',
    absence_type: 'day_off' as Absence['absence_type'],
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (absence) {
      setFormData({
        technician_id: absence.technician_id,
        absence_type: absence.absence_type,
        start_date: absence.start_date,
        end_date: absence.end_date,
        reason: absence.reason || '',
      });
    }
  }, [absence]);

  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      if (!profile?.company_id) return;
      const { data } = await supabase.from('technicians').select('id, profiles:profiles(full_name)').eq('company_id', profile.company_id).eq('active', true);
      setTechnicians(data || []);
    };
    if (open) fetchTechnicians();
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absence) return;
    setLoading(true);
    try {
      await updateAbsence.mutateAsync({ id: absence.id, ...formData });
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!absence) return;
    setLoading(true);
    try {
      await deleteAbsence.mutateAsync(absence.id);
      setShowDeleteConfirm(false);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Ausência</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Técnico</Label>
              <Select value={formData.technician_id} onValueChange={(v) => setFormData({ ...formData, technician_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => <SelectItem key={t.id} value={t.id}>{t.profiles?.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.absence_type} onValueChange={(v: any) => setFormData({ ...formData, absence_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Férias</SelectItem>
                  <SelectItem value="day_off">Folga</SelectItem>
                  <SelectItem value="medical_exam">Exame Médico</SelectItem>
                  <SelectItem value="training">Treinamento</SelectItem>
                  <SelectItem value="sick_leave">Atestado</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading || !formData.technician_id}>{loading ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ausência? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditAbsenceDialog;
