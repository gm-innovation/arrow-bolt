import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BarChart3, Users, ClipboardList } from "lucide-react";
import { useForm } from "react-hook-form";
import ChangePasswordDialog from "@/components/admin/ChangePasswordDialog";
import { useManagerReports } from "@/hooks/useManagerReports";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { useUserAvatar } from "@/hooks/useUserAvatar";

interface ProfileFormData {
  full_name: string;
  phone: string;
}

const ManagerProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const { metrics } = useManagerReports();
  const { avatarUrl, isUploading, uploadAvatar, deleteAvatar } = useUserAvatar();

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    defaultValues: {
      full_name: user?.user_metadata?.full_name || "",
      phone: user?.user_metadata?.phone || "",
    },
  });

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return "M";
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: data.full_name,
          phone: data.phone,
        }
      });

      if (authError) throw authError;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas informações pessoais e visualize suas estatísticas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>
            Atualize seus dados pessoais e informações de contato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-6">
              <AvatarUpload
                avatarUrl={avatarUrl}
                initials={getUserInitials()}
                onUpload={uploadAvatar}
                onDelete={deleteAvatar}
                isUploading={isUploading}
                fallbackClassName="bg-chart-3 text-primary-foreground"
              />
              <div className="flex-1">
                <h3 className="text-lg font-medium">{user?.user_metadata?.full_name || "Usuário"}</h3>
                <p className="text-sm text-muted-foreground">Gerente</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  {...register("full_name", { required: "Nome é obrigatório" })}
                  placeholder="Seu nome completo"
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estatísticas de Gestão</CardTitle>
          <CardDescription>
            Resumo da sua visão geral da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics?.totalOrders || 0}</p>
                <p className="text-sm text-muted-foreground">Total de OSs</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Users className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics?.completedOrders || 0}</p>
                <p className="text-sm text-muted-foreground">Concluídas</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics?.completionRate || 0}%</p>
                <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>
            Gerencie a segurança da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Senha</h4>
                <p className="text-sm text-muted-foreground">
                  Altere sua senha para manter sua conta segura
                </p>
              </div>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
                Alterar Senha
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordDialog 
        open={passwordDialogOpen} 
        onOpenChange={setPasswordDialogOpen} 
      />
    </div>
  );
};

export default ManagerProfile;
