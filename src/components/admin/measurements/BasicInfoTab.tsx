import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMeasurements } from "@/hooks/useMeasurements";
import { format } from "date-fns";

interface BasicInfoTabProps {
  measurement: any;
  serviceOrderId: string;
  disabled?: boolean;
}

export const BasicInfoTab = ({ measurement, serviceOrderId, disabled }: BasicInfoTabProps) => {
  const { updateCategory } = useMeasurements(serviceOrderId);

  const { data: orderData } = useQuery({
    queryKey: ['service-order-basic', serviceOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          order_number,
          scheduled_date,
          completed_date,
          clients:client_id (name),
          vessels:vessel_id (name)
        `)
        .eq('id', serviceOrderId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleCategoryChange = (category: 'CATIVO' | 'LABORATORIO' | 'EXTERNO') => {
    updateCategory.mutate({
      id: measurement.id,
      category,
    });
  };

  if (!orderData) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Número da OS</Label>
          <div className="text-sm font-medium">{orderData.order_number}</div>
        </div>

        <div className="space-y-2">
          <Label>Cliente</Label>
          <div className="text-sm font-medium">{orderData.clients?.name || 'N/A'}</div>
        </div>

        <div className="space-y-2">
          <Label>Embarcação</Label>
          <div className="text-sm font-medium">{orderData.vessels?.name || 'N/A'}</div>
        </div>

        <div className="space-y-2">
          <Label>Data Início</Label>
          <div className="text-sm font-medium">
            {orderData.scheduled_date ? format(new Date(orderData.scheduled_date), 'dd/MM/yyyy') : 'N/A'}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Data Término</Label>
          <div className="text-sm font-medium">
            {orderData.completed_date ? format(new Date(orderData.completed_date), 'dd/MM/yyyy') : 'N/A'}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Categoria *</Label>
          <Select
            value={measurement.category}
            onValueChange={handleCategoryChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CATIVO">CATIVO (2%)</SelectItem>
              <SelectItem value="LABORATORIO">LABORATÓRIO (5%)</SelectItem>
              <SelectItem value="EXTERNO">EXTERNO (2%)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            A categoria define a taxa de imposto aplicada
          </p>
        </div>
      </div>
    </div>
  );
};
