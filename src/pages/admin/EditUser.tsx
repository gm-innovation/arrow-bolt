import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = z.object({
  full_name: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .trim(),
  email: z.string()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres")
    .toLowerCase()
    .trim(),
  phone: z.string()
    .regex(/^[\d\s\-\+\(\)]*$/, "Telefone inválido")
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .optional()
    .or(z.literal("")),
  role: z.enum(["admin", "technician"], {
    required_error: "Selecione uma função",
  }),
});

const EditUser = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      role: "technician",
    },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsFetching(true);

        // Get current user's company
        const { data: profileData } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user?.id)
          .single();

        if (!profileData?.company_id) {
          throw new Error("Empresa não encontrada");
        }

        // Fetch user data
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            email,
            phone,
            company_id,
            user_roles (role)
          `)
          .eq("id", userId)
          .eq("company_id", profileData.company_id)
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error("Usuário não encontrado");

        // Set form values
        form.reset({
          full_name: userData.full_name || "",
          email: userData.email || "",
          phone: userData.phone || "",
          role: (userData.user_roles as any)?.[0]?.role || "technician",
        });
      } catch (error: any) {
        console.error("Error fetching user:", error);
        toast({
          title: "Erro ao carregar usuário",
          description: error.message || "Não foi possível carregar os dados do usuário",
          variant: "destructive",
        });
        navigate("/admin/users");
      } finally {
        setIsFetching(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId, user?.id, navigate, toast, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);

      // Sanitize data
      const sanitizedData = {
        full_name: values.full_name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone?.trim() || null,
      };

      // Get current user's company
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) {
        throw new Error("Empresa não encontrada");
      }

      // Verify user belongs to same company
      const { data: targetUser } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .single();

      if (targetUser?.company_id !== profileData.company_id) {
        throw new Error("Usuário não pertence à sua empresa");
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update(sanitizedData)
        .eq("id", userId);

      if (profileError) throw profileError;

      // Get current role
      const { data: currentRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      // Update role if changed
      if (currentRole?.role !== values.role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: values.role })
          .eq("user_id", userId);

        if (roleError) throw roleError;

        // If changing to technician, ensure technician record exists
        if (values.role === "technician") {
          const { data: techExists } = await supabase
            .from("technicians")
            .select("id")
            .eq("user_id", userId)
            .single();

          if (!techExists) {
            const { error: techError } = await supabase
              .from("technicians")
              .insert({
                user_id: userId,
                company_id: profileData.company_id,
                active: true,
              });

            if (techError) throw techError;
          }
        }

        // If changing from technician, deactivate technician record
        if (currentRole?.role === "technician" && values.role !== "technician") {
          const { error: deactivateError } = await supabase
            .from("technicians")
            .update({ active: false })
            .eq("user_id", userId);

          if (deactivateError) throw deactivateError;
        }
      }

      toast({
        title: "Usuário atualizado com sucesso",
        description: "As informações do usuário foram atualizadas",
      });

      navigate("/admin/users");
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Ocorreu um erro ao atualizar o usuário",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/users")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Usuário</h1>
          <p className="text-muted-foreground">
            Atualize as informações do usuário
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome completo" {...field} />
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
                    <Input
                      type="email"
                      placeholder="Digite o email"
                      {...field}
                    />
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
                  <FormLabel>Telefone (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o telefone"
                      {...field}
                    />
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
                  <FormLabel>Função</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="technician">Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/users")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default EditUser;
