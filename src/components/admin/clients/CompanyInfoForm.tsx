import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LegalEntitiesSection } from "./LegalEntitiesSection";
import { AddressesSection } from "./AddressesSection";

const formSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(200),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  contact_person: z.string().trim().max(200).optional().or(z.literal("")),
});

type CompanyFormData = z.infer<typeof formSchema>;

interface CompanyInfoFormProps {
  clientData?: {
    id: string;
    name: string;
    cnpj: string | null;
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
  const [savedClientId, setSavedClientId] = useState<string | null>(clientData?.id || null);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: clientData?.name || "",
      email: clientData?.email || "",
      phone: clientData?.phone || "",
      contact_person: clientData?.contact_person || "",
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setIsLoading(true);
      const { data: profileData } = await supabase.from("profiles").select("company_id").eq("id", user?.id).single();
      if (!profileData?.company_id) throw new Error("Empresa não encontrada");

      const sanitizedData = {
        name: data.name.trim(),
        email: data.email?.trim().toLowerCase() || null,
        phone: data.phone?.trim() || null,
        contact_person: data.contact_person?.trim() || null,
      };

      if (clientData?.id) {
        const { error } = await supabase.from("clients").update(sanitizedData).eq("id", clientData.id);
        if (error) throw error;
        toast({ title: "Cliente atualizado", description: "As informações do cliente foram atualizadas" });
        setSavedClientId(clientData.id);
        onSuccess?.(clientData.id);
      } else {
        const { data: newClient, error } = await supabase.from("clients").insert({ company_id: profileData.company_id, ...sanitizedData }).select().single();
        if (error) throw error;
        toast({ title: "Cliente cadastrado", description: "As informações do cliente foram salvas" });
        setSavedClientId(newClient.id);
        onSuccess?.(newClient.id);
      }
    } catch (error: any) {
      toast({ title: "Erro ao salvar cliente", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
          const firstError = Object.values(errors)[0];
          toast({ title: "Erro de validação", description: firstError?.message as string, variant: "destructive" });
        })} className="space-y-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Fantasia</FormLabel>
              <FormControl><Input placeholder="Nome fantasia da empresa" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl><Input placeholder="(00) 0000-0000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="contact_person" render={({ field }) => (
            <FormItem>
              <FormLabel>Pessoa de Contato</FormLabel>
              <FormControl><Input placeholder="Nome do contato principal" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Salvando..." : clientData ? "Atualizar Informações" : "Salvar e Continuar"}
          </Button>
        </form>
      </Form>

      <Separator />
      <LegalEntitiesSection
        clientId={savedClientId}
        legacyCnpj={clientData?.cnpj}
        clientName={clientData?.name}
      />

      <Separator />
      <AddressesSection
        clientId={savedClientId}
        legacyAddress={clientData?.address}
      />
    </div>
  );
};
