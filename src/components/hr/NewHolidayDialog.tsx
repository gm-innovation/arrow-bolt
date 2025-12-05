import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useHolidays, CreateHolidayData } from '@/hooks/useHolidays';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const NewHolidayDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { createHoliday } = useHolidays();
  const [formData, setFormData] = useState<CreateHolidayData>({ holiday_date: '', name: '', is_recurring: false });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createHoliday.mutateAsync(formData);
      onSuccess();
      setFormData({ holiday_date: '', name: '', is_recurring: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Feriado</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={formData.holiday_date} onChange={(e) => setFormData({ ...formData, holiday_date: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Natal" required />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={formData.is_recurring} onCheckedChange={(c) => setFormData({ ...formData, is_recurring: !!c })} />
            <Label>Repete anualmente</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !formData.name}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewHolidayDialog;
