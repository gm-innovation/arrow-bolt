import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOnCall, CreateOnCallData } from '@/hooks/useOnCall';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const NewOnCallDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { user } = useAuth();
  const { createOnCall } = useOnCall();
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [formData, setFormData] = useState<CreateOnCallData>({ technician_id: '', on_call_date: '', is_holiday: false, is_weekend: false });
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
      await createOnCall.mutateAsync(formData);
      onSuccess();
      setFormData({ technician_id: '', on_call_date: '', is_holiday: false, is_weekend: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Sobreaviso</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Técnico</Label>
            <Select value={formData.technician_id} onValueChange={(v) => setFormData({ ...formData, technician_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{technicians.map((t) => <SelectItem key={t.id} value={t.id}>{t.profiles?.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={formData.on_call_date} onChange={(e) => setFormData({ ...formData, on_call_date: e.target.value })} required />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox checked={formData.is_weekend} onCheckedChange={(c) => setFormData({ ...formData, is_weekend: !!c })} />
              <Label>Final de semana</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={formData.is_holiday} onCheckedChange={(c) => setFormData({ ...formData, is_holiday: !!c })} />
              <Label>Feriado</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
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

export default NewOnCallDialog;
