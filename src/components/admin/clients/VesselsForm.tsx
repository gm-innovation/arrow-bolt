import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash, Ship } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";

const vesselFormSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres"),
  vessel_type: z.string()
    .min(1, "Selecione um tipo"),
});

type VesselFormData = z.infer<typeof vesselFormSchema>;

const vesselTypes = [
  "PLSV",
  "PSV",
  "AHTS",
  "RSV",
  "OSRV",
  "Sonda",
  "Plataforma",
  "Balsa",
  "Rebocador",
  "Outros",
];

interface VesselsFormProps {
  clientId: string;
  vessels?: Array<{
    id: string;
    name: string;
    vessel_type: string | null;
  }>;
  onSuccess?: () => void;
}

export const VesselsForm = ({ clientId, vessels: initialVessels, onSuccess }: VesselsFormProps) => {
  const { toast } = useToast();
  const [vessels, setVessels] = useState(initialVessels || []);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<VesselFormData>({
    resolver: zodResolver(vesselFormSchema),
    defaultValues: {
      name: "",
      vessel_type: "",
    },
  });

  useEffect(() => {
    if (clientId && !initialVessels) {
      fetchVessels();
    }
  }, [clientId]);

  const fetchVessels = async () => {
    try {
      const { data, error } = await supabase
        .from("vessels")
        .select("*")
        .eq("client_id", clientId);

      if (error) throw error;
      setVessels(data || []);
    } catch (error) {
      console.error("Error fetching vessels:", error);
    }
  };

  const onSubmit = async (data: VesselFormData) => {
    try {
      setIsLoading(true);

      // Sanitize data
      const sanitizedData = {
        client_id: clientId,
        name: data.name.trim(),
        vessel_type: data.vessel_type,
      };

      const { error } = await supabase
        .from("vessels")
        .insert(sanitizedData);

      if (error) throw error;

      toast({
        title: "Embarcação adicionada",
        description: "A embarcação foi cadastrada com sucesso",
      });

      form.reset();
      fetchVessels();
    } catch (error: any) {
      console.error("Error adding vessel:", error);
      toast({
        title: "Erro ao adicionar embarcação",
        description: error.message || "Ocorreu um erro ao adicionar a embarcação",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVessel = async (vesselId: string) => {
    try {
      const { error } = await supabase
        .from("vessels")
        .delete()
        .eq("id", vesselId);

      if (error) throw error;

      toast({
        title: "Embarcação removida",
        description: "A embarcação foi removida com sucesso",
      });

      fetchVessels();
    } catch (error: any) {
      console.error("Error deleting vessel:", error);
      toast({
        title: "Erro ao remover embarcação",
        description: error.message || "Ocorreu um erro ao remover a embarcação",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* List of existing vessels */}
      {vessels.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">Embarcações cadastradas</h3>
          <div className="space-y-2">
            {vessels.map((vessel) => (
              <Card key={vessel.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Ship className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{vessel.name}</p>
                      <p className="text-sm text-muted-foreground">{vessel.vessel_type}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteVessel(vessel.id)}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Form to add new vessel */}
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-4">Adicionar nova embarcação</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Embarcação</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome da embarcação" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vessel_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Embarcação</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vesselTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {isLoading ? "Adicionando..." : "Adicionar Embarcação"}
              </Button>
              {onSuccess && (
                <Button type="button" variant="outline" onClick={onSuccess}>
                  Concluir
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};
