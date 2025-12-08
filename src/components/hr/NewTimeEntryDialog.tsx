import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHRTimeEntries } from '@/hooks/useHRTimeEntries';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Technician {
  id: string;
  profiles?: {
    full_name: string;
  };
}

interface ServiceOrder {
  id: string;
  order_number: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicians: Technician[];
  onSuccess: () => void;
}

const NewTimeEntryDialog = ({ open, onOpenChange, technicians, onSuccess }: Props) => {
  const { user } = useAuth();
  const { createTimeEntry } = useHRTimeEntries();
  const [loading, setLoading] = useState(false);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [formData, setFormData] = useState({
    technician_id: '',
    service_order_id: '',
    check_in_at: '',
    check_out_at: '',
    hours_normal: 0,
    hours_extra: 0,
    hours_night: 0,
    hours_standby: 0,
    notes: '',
  });

  useEffect(() => {
    const fetchServiceOrders = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      const { data } = await supabase
        .from('service_orders')
        .select('id, order_number')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(100);

      setServiceOrders(data || []);
    };

    if (open) {
      fetchServiceOrders();
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.technician_id || !formData.check_in_at || !formData.check_out_at) return;

    setLoading(true);
    try {
      await createTimeEntry.mutateAsync({
        technician_id: formData.technician_id,
        service_order_id: formData.service_order_id || undefined,
        check_in_at: new Date(formData.check_in_at).toISOString(),
        check_out_at: new Date(formData.check_out_at).toISOString(),
        hours_normal: formData.hours_normal,
        hours_extra: formData.hours_extra,
        hours_night: formData.hours_night,
        hours_standby: formData.hours_standby,
        notes: formData.notes || undefined,
      });
      onSuccess();
      // Reset form
      setFormData({
        technician_id: '',
        service_order_id: '',
        check_in_at: '',
        check_out_at: '',
        hours_normal: 0,
        hours_extra: 0,
        hours_night: 0,
        hours_standby: 0,
        notes: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalHours = formData.hours_normal + formData.hours_extra + formData.hours_night + formData.hours_standby;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Registro de Ponto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Técnico *</Label>
              <Select 
                value={formData.technician_id} 
                onValueChange={(v) => setFormData({ ...formData, technician_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.profiles?.full_name || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>OS (opcional)</Label>
              <Select 
                value={formData.service_order_id} 
                onValueChange={(v) => setFormData({ ...formData, service_order_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem OS</SelectItem>
                  {serviceOrders.map((so) => (
                    <SelectItem key={so.id} value={so.id}>
                      {so.order_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in *</Label>
              <Input 
                type="datetime-local" 
                value={formData.check_in_at} 
                onChange={(e) => setFormData({ ...formData, check_in_at: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Check-out *</Label>
              <Input 
                type="datetime-local" 
                value={formData.check_out_at} 
                onChange={(e) => setFormData({ ...formData, check_out_at: e.target.value })}
                required
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
            <Button 
              type="submit" 
              disabled={loading || !formData.technician_id || !formData.check_in_at || !formData.check_out_at}
            >
              {loading ? 'Salvando...' : 'Criar Registro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewTimeEntryDialog;
