import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ServiceDetails = ({ form }: any) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="serviceDateTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Data e Hora do Serviço</FormLabel>
            <FormControl>
              <Input type="datetime-local" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Local</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Localização da embarcação" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="access"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Acesso</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Informações de acesso" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="taskTypes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipos de Tarefa</FormLabel>
            <Select onValueChange={(value) => field.onChange([value])}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de tarefa" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {mockTaskTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

const mockTaskTypes = [
  { id: "tt1", name: "Manutenção Preventiva" },
  { id: "tt2", name: "Reparo" },
  { id: "tt3", name: "Inspeção" },
];