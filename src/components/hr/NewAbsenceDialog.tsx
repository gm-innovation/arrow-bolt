import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAbsences, CreateAbsenceData } from '@/hooks/useAbsences';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const NewAbsenceDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { user } = useAuth();
  const { createAbsence } = useAbsences();
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [formData, setFormData] = useState<CreateAbsenceData>({
    technician_id: '',
    absence_type: 'day_off',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      await createAbsence.mutateAsync(formData);
      onSuccess();
      setFormData({ technician_id: '', absence_type: 'day_off', start_date: '', end_date: '', reason: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Ausência</DialogTitle>
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
            <Textarea value={formData.reason || ''} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !formData.technician_id}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewAbsenceDialog;
