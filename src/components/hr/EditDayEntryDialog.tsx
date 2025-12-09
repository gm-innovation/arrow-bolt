import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TimeEntry, useHRTimeEntries, CreateTimeEntryData, UpdateTimeEntryData } from '@/hooks/useHRTimeEntries';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ServiceOrder {
  id: string;
  order_number: string;
  vessel?: {
    name: string;
  };
  coordinator?: {
    full_name: string;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicianId: string;
  technicianName: string;
  day: number;
  month: Date;
  entry?: TimeEntry;
  onSuccess: () => void;
}

const EditDayEntryDialog = ({
  open,
  onOpenChange,
  technicianId,
  technicianName,
  day,
  month,
  entry,
  onSuccess,
}: Props) => {
  const { user } = useAuth();
  const { createTimeEntry, updateTimeEntry } = useHRTimeEntries();
  const [loading, setLoading] = useState(false);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [formData, setFormData] = useState({
    service_order_id: '',
    vessel_name: '',
    coordinator_name: '',
    is_onboard: false,
    is_travel: false,
    is_standby: false,
    is_overnight: false,
  });

  const selectedDate = new Date(month.getFullYear(), month.getMonth(), day);
  const isEditMode = !!entry;

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
        .select('id, order_number, vessel:vessels(name), coordinator:profiles!service_orders_created_by_fkey(full_name)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(100);

      setServiceOrders((data as ServiceOrder[]) || []);
    };

    if (open) {
      fetchServiceOrders();
    }
  }, [user, open]);

  useEffect(() => {
    if (entry) {
      setFormData({
        service_order_id: entry.service_order_id || '',
        vessel_name: entry.vessel_name || entry.service_order?.vessel?.name || '',
        coordinator_name: entry.coordinator_name || entry.service_order?.coordinator?.full_name || '',
        is_onboard: entry.is_onboard || false,
        is_travel: entry.is_travel || false,
        is_standby: entry.is_standby || false,
        is_overnight: entry.is_overnight || false,
      });
    } else {
      setFormData({
        service_order_id: '',
        vessel_name: '',
        coordinator_name: '',
        is_onboard: false,
        is_travel: false,
        is_standby: false,
        is_overnight: false,
      });
    }
  }, [entry, open]);

  // Auto-fill vessel and coordinator when selecting a service order
  const handleServiceOrderChange = (value: string) => {
    const selectedSO = serviceOrders.find((so) => so.id === value);
    setFormData({
      ...formData,
      service_order_id: value === '_none_' ? '' : value,
      vessel_name: selectedSO?.vessel?.name || formData.vessel_name,
      coordinator_name: selectedSO?.coordinator?.full_name || formData.coordinator_name,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditMode && entry) {
        const updateData: UpdateTimeEntryData = {
          id: entry.id,
          is_onboard: formData.is_onboard,
          is_travel: formData.is_travel,
          is_standby: formData.is_standby,
          is_overnight: formData.is_overnight,
          vessel_name: formData.vessel_name || undefined,
          coordinator_name: formData.coordinator_name || undefined,
        };
        await updateTimeEntry.mutateAsync(updateData);
      } else {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const createData: CreateTimeEntryData = {
          technician_id: technicianId,
          service_order_id: formData.service_order_id || undefined,
          check_in_at: `${dateStr}T08:00:00`,
          check_out_at: `${dateStr}T17:00:00`,
          hours_normal: formData.service_order_id ? 8 : 0,
          hours_extra: 0,
          hours_night: 0,
          hours_standby: 0,
          is_onboard: formData.is_onboard,
          is_travel: formData.is_travel,
          is_standby: formData.is_standby,
          is_overnight: formData.is_overnight,
          vessel_name: formData.vessel_name || undefined,
          coordinator_name: formData.coordinator_name || undefined,
        };
        await createTimeEntry.mutateAsync(createData);
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar' : 'Novo'} Registro - Dia {day}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-sm font-medium">{technicianName}</p>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {!isEditMode && (
            <div className="space-y-2">
              <Label>Ordem de Serviço</Label>
              <Select
                value={formData.service_order_id}
                onValueChange={handleServiceOrderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma OS (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Sem OS</SelectItem>
                  {serviceOrders.map((so) => (
                    <SelectItem key={so.id} value={so.id}>
                      {so.order_number} {so.vessel?.name ? `- ${so.vessel.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isEditMode && entry?.service_order && (
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">OS vinculada</p>
              <p className="text-sm font-medium">
                {entry.service_order.order_number}
                {entry.service_order.vessel?.name && ` - ${entry.service_order.vessel.name}`}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nome do Barco</Label>
            <Input
              value={formData.vessel_name}
              onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
              placeholder="Nome do barco"
            />
          </div>

          <div className="space-y-2">
            <Label>Nome do Coordenador</Label>
            <Input
              value={formData.coordinator_name}
              onChange={(e) => setFormData({ ...formData, coordinator_name: e.target.value })}
              placeholder="Nome do coordenador"
            />
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="text-sm font-medium">Marcadores do Dia</h4>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_onboard"
                checked={formData.is_onboard}
                onCheckedChange={(c) => setFormData({ ...formData, is_onboard: !!c })}
              />
              <Label htmlFor="is_onboard" className="text-sm cursor-pointer">
                Bordo (a bordo do navio)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_travel"
                checked={formData.is_travel}
                onCheckedChange={(c) => setFormData({ ...formData, is_travel: !!c })}
              />
              <Label htmlFor="is_travel" className="text-sm cursor-pointer">
                Viagem (deslocamento)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_standby"
                checked={formData.is_standby}
                onCheckedChange={(c) => setFormData({ ...formData, is_standby: !!c })}
              />
              <Label htmlFor="is_standby" className="text-sm cursor-pointer">
                Sobreaviso
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_overnight"
                checked={formData.is_overnight}
                onCheckedChange={(c) => setFormData({ ...formData, is_overnight: !!c })}
              />
              <Label htmlFor="is_overnight" className="text-sm cursor-pointer">
                Pernoite em Hotel
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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

export default EditDayEntryDialog;