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
import { useOnCall, OnCall } from '@/hooks/useOnCall';
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
  onCall: OnCall | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditOnCallDialog = ({ onCall, open, onOpenChange, onSuccess }: Props) => {
  const { user } = useAuth();
  const { updateOnCall, deleteOnCall } = useOnCall();
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    technician_id: '',
    on_call_date: '',
    is_holiday: false,
    is_weekend: false,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (onCall) {
      setFormData({
        technician_id: onCall.technician_id,
        on_call_date: onCall.on_call_date,
        is_holiday: onCall.is_holiday,
        is_weekend: onCall.is_weekend,
        notes: onCall.notes || '',
      });
    }
  }, [onCall]);

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
    if (!onCall) return;
    setLoading(true);
    try {
      await updateOnCall.mutateAsync({ id: onCall.id, ...formData });
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onCall) return;
    setLoading(true);
    try {
      await deleteOnCall.mutateAsync(onCall.id);
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
            <DialogTitle>Editar Sobreaviso</DialogTitle>
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
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
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
              Tem certeza que deseja excluir este sobreaviso? Esta ação não pode ser desfeita.
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

export default EditOnCallDialog;
