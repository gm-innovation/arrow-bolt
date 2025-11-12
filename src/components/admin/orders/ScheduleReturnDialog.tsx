import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceVisits } from '@/hooks/useServiceVisits';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleReturnDialogProps {
  orderId: string;
  orderNumber: string;
  open: boolean;
  onClose: () => void;
}

interface Technician {
  id: string;
  profiles: {
    full_name: string;
  };
}

export const ScheduleReturnDialog = ({ orderId, orderNumber, open, onClose }: ScheduleReturnDialogProps) => {
  const { user } = useAuth();
  const { createReturnVisit, isCreatingReturn } = useServiceVisits(orderId);
  const [returnReason, setReturnReason] = useState('');
  const [returnDate, setReturnDate] = useState<Date>();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [leadTechnicianId, setLeadTechnicianId] = useState<string>();
  const [loading, setLoading] = useState(false);

  useState(() => {
    if (open) {
      fetchTechnicians();
    }
  });

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) return;

      const { data, error } = await supabase
        .from('technicians')
        .select(`
          id,
          profiles:user_id (
            full_name
          )
        `)
        .eq('company_id', profileData.company_id)
        .eq('active', true);

      if (error) throw error;
      setTechnicians(data as Technician[]);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!returnReason.trim() || !returnDate || selectedTechnicians.length === 0) {
      return;
    }

    createReturnVisit({
      serviceOrderId: orderId,
      visitDate: format(returnDate, 'yyyy-MM-dd'),
      returnReason,
      technicianIds: selectedTechnicians,
      leadTechnicianId,
    });

    handleClose();
  };

  const handleClose = () => {
    setReturnReason('');
    setReturnDate(undefined);
    setSelectedTechnicians([]);
    setLeadTechnicianId(undefined);
    onClose();
  };

  const toggleTechnician = (techId: string) => {
    setSelectedTechnicians((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agendar Retorno</DialogTitle>
          <DialogDescription>OS {orderNumber}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="return-reason">
              Motivo do Retorno <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="return-reason"
              placeholder="Descreva o motivo do retorno..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Data do Retorno <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !returnDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {returnDate ? format(returnDate, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={returnDate} onSelect={setReturnDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>
              Técnicos <span className="text-destructive">*</span>
            </Label>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {technicians.map((tech) => (
                  <div key={tech.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`tech-${tech.id}`}
                      checked={selectedTechnicians.includes(tech.id)}
                      onChange={() => toggleTechnician(tech.id)}
                      className="rounded"
                    />
                    <label htmlFor={`tech-${tech.id}`} className="flex-1 cursor-pointer">
                      {tech.profiles.full_name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedTechnicians.length > 0 && (
            <div className="space-y-2">
              <Label>Técnico Líder (opcional)</Label>
              <Select value={leadTechnicianId} onValueChange={setLeadTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o líder" />
                </SelectTrigger>
                <SelectContent>
                  {selectedTechnicians.map((techId) => {
                    const tech = technicians.find((t) => t.id === techId);
                    return (
                      <SelectItem key={techId} value={techId}>
                        {tech?.profiles.full_name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isCreatingReturn}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!returnReason.trim() || !returnDate || selectedTechnicians.length === 0 || isCreatingReturn}
          >
            {isCreatingReturn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agendar Retorno
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
