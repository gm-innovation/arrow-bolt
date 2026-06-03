import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useHomeOffice, CreateHomeOfficeData, HomeOfficeSchedule } from '@/hooks/useHomeOffice';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editing?: HomeOfficeSchedule | null;
}

const NewHomeOfficeDialog = ({ open, onOpenChange, onSuccess, editing }: Props) => {
  const { user } = useAuth();
  const { create, update } = useHomeOffice();
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [form, setForm] = useState<CreateHomeOfficeData>({
    technician_id: '',
    start_date: '',
    end_date: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        technician_id: editing.technician_id,
        start_date: editing.start_date,
        end_date: editing.end_date,
        notes: editing.notes || '',
      });
    } else {
      setForm({ technician_id: '', start_date: '', end_date: '', notes: '' });
    }
  }, [editing, open]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from('technicians')
        .select('id, profiles:profiles(full_name)')
        .eq('company_id', profile.company_id)
        .eq('active', true);
      setTechnicians(data || []);
    };
    if (open) load();
  }, [user, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...form });
      } else {
        await create.mutateAsync(form);
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Home Office' : 'Novo Home Office'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Colaborador</Label>
            <Select value={form.technician_id} onValueChange={(v) => setForm({ ...form, technician_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {technicians.map((t) => <SelectItem key={t.id} value={t.id}>{t.profiles?.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !form.technician_id}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewHomeOfficeDialog;
