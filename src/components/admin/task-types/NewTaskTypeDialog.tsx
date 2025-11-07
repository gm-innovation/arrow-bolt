import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";

const formSchema = z.object({
  name: z.string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres"),
  category: z.string()
    .min(1, "Categoria é obrigatória"),
  description: z.string()
    .trim()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NewTaskTypeDialogProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export const NewTaskTypeDialog = ({ onSubmit, onCancel }: NewTaskTypeDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
    },
  });

  const handleSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      
      // Sanitize data
      const sanitizedData = {
        name: data.name.trim(),
        category: data.category,
        description: data.description?.trim() || "",
      };
      
      await onSubmit(sanitizedData);
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
      <DialogHeader className="flex-none border-b pb-4">
        <DialogTitle>Novo Tipo de Tarefa</DialogTitle>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-y-auto space-y-6 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Tarefa</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Manutenção Preventiva" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Refrigeração">Refrigeração</SelectItem>
                    <SelectItem value="Eletrônica">Eletrônica</SelectItem>
                    <SelectItem value="Mecânica">Mecânica</SelectItem>
                    <SelectItem value="Hidráulica">Hidráulica</SelectItem>
                    <SelectItem value="Elétrica">Elétrica</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Descreva o tipo de tarefa..."
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Tipo de Tarefa"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
};
