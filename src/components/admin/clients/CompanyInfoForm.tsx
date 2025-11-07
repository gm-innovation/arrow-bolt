import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres"),
  email: z.string()
    .trim()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres")
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .trim()
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .regex(/^$|^[\d\s\(\)\-\+]+$/, "Telefone contém caracteres inválidos")
    .optional(),
  address: z.string()
    .trim()
    .max(500, "Endereço deve ter no máximo 500 caracteres")
    .optional(),
  contact_person: z.string()
    .trim()
    .max(200, "Nome do contato deve ter no máximo 200 caracteres")
    .optional(),
});

type CompanyFormData = z.infer<typeof formSchema>;

interface CompanyInfoFormProps {
  clientData?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    contact_person: string | null;
  };
  onSuccess?: (clientId: string) => void;
}

export const CompanyInfoForm = ({ clientData, onSuccess }: CompanyInfoFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: clientData?.name || "",
      email: clientData?.email || "",
      phone: clientData?.phone || "",
      address: clientData?.address || "",
      contact_person: clientData?.contact_person || "",
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setIsLoading(true);

      // Get current user's company
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) {
        throw new Error("Empresa não encontrada");
      }

      // Sanitize data
      const sanitizedData = {
        name: data.name.trim(),
        email: data.email?.trim().toLowerCase() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        contact_person: data.contact_person?.trim() || null,
      };

      if (clientData?.id) {
        // Update existing client
        const { error } = await supabase
          .from("clients")
          .update(sanitizedData)
          .eq("id", clientData.id);

        if (error) throw error;

        toast({
          title: "Cliente atualizado",
          description: "As informações do cliente foram atualizadas",
        });

        onSuccess?.(clientData.id);
      } else {
        // Create new client
        const { data: newClient, error } = await supabase
          .from("clients")
          .insert({
            company_id: profileData.company_id,
            ...sanitizedData,
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Cliente cadastrado",
          description: "As informações do cliente foram salvas",
        });

        onSuccess?.(newClient.id);
      }
    } catch (error: any) {
      console.error("Error saving client:", error);
      toast({
        title: "Erro ao salvar cliente",
        description: error.message || "Ocorreu um erro ao salvar o cliente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Empresa</FormLabel>
              <FormControl>
                <Input placeholder="Digite o nome da empresa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
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
                  <Input placeholder="(00) 0000-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="contact_person"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pessoa de Contato</FormLabel>
              <FormControl>
                <Input placeholder="Nome do contato principal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
              <FormControl>
                <Input placeholder="Endereço completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Salvando..." : clientData ? "Atualizar Informações" : "Salvar e Continuar"}
        </Button>
      </form>
    </Form>
  );
};
