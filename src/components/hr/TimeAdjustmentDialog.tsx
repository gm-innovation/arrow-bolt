import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHRTimeEntries, CreateAdjustmentData } from '@/hooks/useHRTimeEntries';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: any;
  technicians: any[];
  onSuccess: () => void;
}

const TimeAdjustmentDialog = ({ open, onOpenChange, entry, technicians, onSuccess }: Props) => {
  const { createAdjustment } = useHRTimeEntries();
  const [formData, setFormData] = useState<CreateAdjustmentData>({
    technician_id: entry?.technician_id || '',
    adjustment_date: entry?.entry_date || '',
    original_check_in: entry?.start_time || '',
    adjusted_check_in: '',
    original_check_out: entry?.end_time || '',
    adjusted_check_out: '',
    adjustment_reason: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createAdjustment.mutateAsync(formData);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajuste de Ponto</DialogTitle></DialogHeader>
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
            <Input type="date" value={formData.adjustment_date} onChange={(e) => setFormData({ ...formData, adjustment_date: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in Ajustado</Label>
              <Input type="time" value={formData.adjusted_check_in || ''} onChange={(e) => setFormData({ ...formData, adjusted_check_in: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Check-out Ajustado</Label>
              <Input type="time" value={formData.adjusted_check_out || ''} onChange={(e) => setFormData({ ...formData, adjusted_check_out: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Motivo do Ajuste *</Label>
            <Textarea value={formData.adjustment_reason} onChange={(e) => setFormData({ ...formData, adjustment_reason: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !formData.adjustment_reason}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TimeAdjustmentDialog;
