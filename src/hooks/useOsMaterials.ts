import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OsMaterial {
  id: string;
  service_order_id: string;
  external_product_id: number | null;
  external_product_code: string | null;
  name: string;
  unit_value: number;
  quantity: number;
  used: boolean;
  source: 'eva' | 'manual';
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useOsMaterials = (serviceOrderId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch materials for a service order
  const { data: materials = [], isLoading, refetch } = useQuery({
    queryKey: ['os-materials', serviceOrderId],
    queryFn: async () => {
      if (!serviceOrderId) return [];
      
      const { data, error } = await supabase
        .from('os_materials')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as OsMaterial[];
    },
    enabled: !!serviceOrderId,
  });

  // Sync materials from Eva
  const syncFromEva = useMutation({
    mutationFn: async ({ 
      serviceOrderId, 
      materials 
    }: { 
      serviceOrderId: string; 
      materials: Array<{
        external_product_id: number;
        external_product_code: string;
        name: string;
        unit_value: number;
        quantity: number;
      }>;
    }) => {
      // First, delete existing Eva materials
      await supabase
        .from('os_materials')
        .delete()
        .eq('service_order_id', serviceOrderId)
        .eq('source', 'eva');

      // Insert new materials
      const materialsToInsert = materials.map(m => ({
        service_order_id: serviceOrderId,
        external_product_id: m.external_product_id,
        external_product_code: m.external_product_code,
        name: m.name,
        unit_value: m.unit_value,
        quantity: m.quantity,
        used: true,
        source: 'eva' as const,
        synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('os_materials')
        .insert(materialsToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-materials', serviceOrderId] });
      toast({
        title: "Materiais sincronizados",
        description: "Materiais do Eva foram importados com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao sincronizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add manual material
  const addMaterial = useMutation({
    mutationFn: async (material: {
      service_order_id: string;
      name: string;
      unit_value: number;
      quantity: number;
    }) => {
      const { error } = await supabase
        .from('os_materials')
        .insert({
          ...material,
          source: 'manual',
          used: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-materials', serviceOrderId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar material",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update material (quantity, used status)
  const updateMaterial = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OsMaterial> & { id: string }) => {
      const { error } = await supabase
        .from('os_materials')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-materials', serviceOrderId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar material",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove material
  const removeMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('os_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-materials', serviceOrderId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover material",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get used materials (for measurement import)
  const getUsedMaterials = () => {
    return materials.filter(m => m.used);
  };

  return {
    materials,
    isLoading,
    refetch,
    syncFromEva,
    addMaterial,
    updateMaterial,
    removeMaterial,
    getUsedMaterials,
  };
};
