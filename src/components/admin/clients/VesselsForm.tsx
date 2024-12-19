import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";

type VesselFormData = {
  name: string;
  type: string;
};

// Mock data for vessel types
const vesselTypes = [
  "Lancha",
  "Iate",
  "Veleiro",
  "Catamarã",
  "Jet Ski",
  "Barco de Pesca",
];

export const VesselsForm = () => {
  const { toast } = useToast();
  const form = useForm<VesselFormData>();

  const onSubmit = (data: VesselFormData) => {
    console.log(data);
    toast({
      title: "Embarcação adicionada com sucesso!",
      description: "As informações foram salvas.",
    });
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" className="w-full">
        <PlusCircle className="mr-2 h-4 w-4" />
        Adicionar Nova Embarcação
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Embarcação</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Embarcação</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          <Button type="submit" className="w-full">Adicionar Embarcação</Button>
        </form>
      </Form>
    </div>
  );
};