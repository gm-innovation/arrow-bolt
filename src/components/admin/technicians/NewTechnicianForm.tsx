
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const technicianFormSchema = z.object({
  name: z.string()
    .trim()
    .min(3, { message: "Nome deve ter pelo menos 3 caracteres" })
    .max(200, { message: "Nome deve ter no máximo 200 caracteres" }),
  email: z.string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email deve ter no máximo 255 caracteres" }),
  phone: z.string()
    .trim()
    .min(10, { message: "Telefone deve ter pelo menos 10 caracteres" })
    .max(20, { message: "Telefone deve ter no máximo 20 caracteres" })
    .regex(/^[\d\s\(\)\-\+]+$/, { message: "Telefone contém caracteres inválidos" })
    .optional()
    .or(z.literal("")),
  role: z.string()
    .trim()
    .min(1, { message: "Cargo é obrigatório" }),
  isActive: z.boolean().default(true),
});

type TechnicianFormValues = z.infer<typeof technicianFormSchema>;

interface NewTechnicianFormProps {
  onSubmit: (data: TechnicianFormValues) => void;
  onCancel: () => void;
  initialData?: TechnicianFormValues;
  isEditing?: boolean;
}

export const NewTechnicianForm = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}: NewTechnicianFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TechnicianFormValues>({
    resolver: zodResolver(technicianFormSchema),
    defaultValues: initialData || {
      name: "",
      email: "",
      phone: "",
      role: "",
      isActive: true,
    },
  });

  const handleSubmit = async (data: TechnicianFormValues) => {
    setIsLoading(true);
    try {
      // Sanitize data
      const sanitizedData = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || "",
        role: data.role.trim(),
        isActive: data.isActive,
      };

      await onSubmit(sanitizedData);
      toast({
        title: isEditing ? "Técnico atualizado" : "Técnico criado",
        description: isEditing 
          ? "O técnico foi atualizado com sucesso." 
          : "O técnico foi criado com sucesso.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o técnico.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Técnico" : "Novo Técnico"}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do técnico" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="(00) 00000-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cargo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Técnico de Manutenção">Técnico de Manutenção</SelectItem>
                    <SelectItem value="Técnico de Refrigeração">Técnico de Refrigeração</SelectItem>
                    <SelectItem value="Técnico de Eletrônica">Técnico de Eletrônica</SelectItem>
                    <SelectItem value="Técnico de Mecânica">Técnico de Mecânica</SelectItem>
                    <SelectItem value="Auxiliar Técnico">Auxiliar Técnico</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Status</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Técnico ativo poderá ser atribuído a novas ordens de serviço
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
