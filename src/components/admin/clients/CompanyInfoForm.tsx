import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2 } from "lucide-react";
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
  crm_visible: z.boolean().default(true),
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
    crm_visible?: boolean | null;
  };
  onSuccess?: (clientId: string) => void;
}

export const CompanyInfoForm = ({ clientData, onSuccess }: CompanyInfoFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [savedClientId, setSavedClientId] = useState<string | null>(clientData?.id || null);
  const [cnpjQuery, setCnpjQuery] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [pendingCnpj, setPendingCnpj] = useState<{ cnpj: string; razao_social: string } | null>(null);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: clientData?.name || "",
      email: clientData?.email || "",
      phone: clientData?.phone || "",
      contact_person: clientData?.contact_person || "",
      crm_visible: clientData?.crm_visible ?? true,
    },
  });

  const handleLookupCnpj = async () => {
    const cnpj = cnpjQuery.replace(/\D/g, "");
    if (cnpj.length !== 14) {
      toast({ title: "CNPJ inválido", description: "Informe os 14 dígitos.", variant: "destructive" });
      return;
    }
    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("lookup-cnpj", { body: { cnpj } });
      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error || "CNPJ não encontrado");

      form.setValue("name", data.nome_fantasia || data.razao_social || "", { shouldDirty: true });
      if (data.email) form.setValue("email", data.email, { shouldDirty: true });
      if (data.phone) form.setValue("phone", data.phone, { shouldDirty: true });

      setPendingCnpj({ cnpj: data.cnpj, razao_social: data.razao_social });

      toast({
        title: "Dados encontrados",
        description: `${data.razao_social}${data.situacao ? ` (${data.situacao})` : ""}. Revise, complete e salve.`,
      });
    } catch (err: any) {
      toast({ title: "Não foi possível buscar", description: err.message, variant: "destructive" });
    } finally {
      setIsLookingUp(false);
    }
  };

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
        crm_visible: data.crm_visible,
      };

      let targetId: string;
      if (clientData?.id) {
        const { error } = await supabase.from("clients").update(sanitizedData).eq("id", clientData.id);
        if (error) throw error;
        targetId = clientData.id;
        toast({ title: "Cliente atualizado", description: "As informações do cliente foram atualizadas" });
      } else {
        const insertPayload: Record<string, any> = { company_id: profileData.company_id, ...sanitizedData };
        if (pendingCnpj?.cnpj) insertPayload.cnpj = pendingCnpj.cnpj;
        const { data: newClient, error } = await supabase.from("clients").insert(insertPayload as any).select().single();
        if (error) throw error;
        targetId = newClient.id;
        toast({ title: "Cliente cadastrado", description: "As informações do cliente foram salvas" });
      }

      // Auto-create legal entity if we have a pending CNPJ from lookup
      if (pendingCnpj?.cnpj) {
        try {
          const { data: existing } = await supabase
            .from("client_legal_entities")
            .select("id")
            .eq("client_id", targetId)
            .eq("cnpj", pendingCnpj.cnpj)
            .maybeSingle();
          if (!existing) {
            const { data: currentEntities } = await supabase
              .from("client_legal_entities")
              .select("id")
              .eq("client_id", targetId);
            await supabase.from("client_legal_entities").insert({
              client_id: targetId,
              legal_name: pendingCnpj.razao_social || sanitizedData.name,
              cnpj: pendingCnpj.cnpj,
              is_primary: (currentEntities?.length || 0) === 0,
            });
          }
          setPendingCnpj(null);
        } catch (linkErr) {
          console.error("Falha ao criar razão social a partir do CNPJ", linkErr);
        }
      }

      setSavedClientId(targetId);
      onSuccess?.(targetId);
    } catch (error: any) {
      toast({ title: "Erro ao salvar cliente", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!clientData?.id && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <Label className="text-sm font-semibold">Buscar dados pelo CNPJ</Label>
          <div className="flex gap-2">
            <Input
              value={cnpjQuery}
              onChange={(e) => setCnpjQuery(e.target.value)}
              placeholder="00.000.000/0000-00"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupCnpj(); } }}
            />
            <Button type="button" variant="secondary" onClick={handleLookupCnpj} disabled={isLookingUp}>
              {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Buscar</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Preenche automaticamente Nome, E-mail, Telefone e vincula a Razão Social após salvar.
          </p>
        </div>
      )}
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
          <FormField control={form.control} name="crm_visible" render={({ field }) => (
            <FormItem className="flex items-center gap-2 rounded-md border p-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal cursor-pointer m-0">Exibir este cadastro nos seletores do CRM</FormLabel>
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
