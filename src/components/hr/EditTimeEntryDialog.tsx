import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { TimeEntry, useHRTimeEntries } from '@/hooks/useHRTimeEntries';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TimeEntry | null;
  onSuccess: () => void;
}

const EditTimeEntryDialog = ({ open, onOpenChange, entry, onSuccess }: Props) => {
  const { updateTimeEntry } = useHRTimeEntries();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    check_in_at: '',
    check_out_at: '',
    hours_normal: 0,
    hours_extra: 0,
    hours_night: 0,
    hours_standby: 0,
    is_travel: false,
    is_overnight: false,
    notes: '',
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        check_in_at: entry.check_in_at 
          ? format(new Date(entry.check_in_at), "yyyy-MM-dd'T'HH:mm")
          : '',
        check_out_at: entry.check_out_at 
          ? format(new Date(entry.check_out_at), "yyyy-MM-dd'T'HH:mm")
          : '',
        hours_normal: entry.hours_normal || 0,
        hours_extra: entry.hours_extra || 0,
        hours_night: entry.hours_night || 0,
        hours_standby: entry.hours_standby || 0,
        is_travel: entry.is_travel || false,
        is_overnight: entry.is_overnight || false,
        notes: entry.notes || '',
      });
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry) return;
    
    setLoading(true);
    try {
      await updateTimeEntry.mutateAsync({
        id: entry.id,
        check_in_at: formData.check_in_at ? new Date(formData.check_in_at).toISOString() : undefined,
        check_out_at: formData.check_out_at ? new Date(formData.check_out_at).toISOString() : undefined,
        hours_normal: formData.hours_normal,
        hours_extra: formData.hours_extra,
        hours_night: formData.hours_night,
        hours_standby: formData.hours_standby,
        is_travel: formData.is_travel,
        is_overnight: formData.is_overnight,
        notes: formData.notes || undefined,
      });
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const totalHours = formData.hours_normal + formData.hours_extra + formData.hours_night + formData.hours_standby;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Registro de Ponto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Input 
                type="datetime-local" 
                value={formData.check_in_at} 
                onChange={(e) => setFormData({ ...formData, check_in_at: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Input 
                type="datetime-local" 
                value={formData.check_out_at} 
                onChange={(e) => setFormData({ ...formData, check_out_at: e.target.value })} 
              />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Distribuição de Horas</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Horas Normais (HN)</Label>
                <Input 
                  type="number" 
                  step="0.5"
                  min="0"
                  value={formData.hours_normal} 
                  onChange={(e) => setFormData({ ...formData, hours_normal: parseFloat(e.target.value) || 0 })} 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Horas Extras (HE)</Label>
                <Input 
                  type="number" 
                  step="0.5"
                  min="0"
                  value={formData.hours_extra} 
                  onChange={(e) => setFormData({ ...formData, hours_extra: parseFloat(e.target.value) || 0 })} 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Horas Noturnas (HNot)</Label>
                <Input 
                  type="number" 
                  step="0.5"
                  min="0"
                  value={formData.hours_night} 
                  onChange={(e) => setFormData({ ...formData, hours_night: parseFloat(e.target.value) || 0 })} 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sobreaviso (Sob)</Label>
                <Input 
                  type="number" 
                  step="0.5"
                  min="0"
                  value={formData.hours_standby} 
                  onChange={(e) => setFormData({ ...formData, hours_standby: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{totalHours.toFixed(1)}h</span>
            </div>
          </div>

          <div className="flex items-center space-x-6 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit_is_travel"
                checked={formData.is_travel}
                onCheckedChange={(c) => setFormData({ ...formData, is_travel: !!c })}
              />
              <Label htmlFor="edit_is_travel" className="text-sm cursor-pointer">Viagem</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit_is_overnight"
                checked={formData.is_overnight}
                onCheckedChange={(c) => setFormData({ ...formData, is_overnight: !!c })}
              />
              <Label htmlFor="edit_is_overnight" className="text-sm cursor-pointer">Pernoite Hotel</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea 
              value={formData.notes} 
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              placeholder="Observações sobre este registro..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTimeEntryDialog;
