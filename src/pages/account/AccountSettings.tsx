import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Lock, Palette, Bell, ShieldAlert, Loader2, PenLine, Megaphone } from "lucide-react";
import SignatureSection from "@/components/account/SignatureSection";
import MyAwarenessPanel from "@/components/account/MyAwarenessPanel";

const AccountSettings = () => {
  const { user, profile, updatePassword } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light"
  );

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Senha muito curta", description: "Use ao menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    setSavingPassword(false);
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Senha alterada com sucesso" });
  };

  const handleToggleTheme = (checked: boolean) => {
    const next = checked ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", checked);
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <UserCog className="h-6 w-6" /> Minha Conta
        </h2>
        <p className="text-muted-foreground">
          Preferências pessoais da sua conta. Para parâmetros do módulo, use o menu lateral.
        </p>
      </div>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account"><UserCog className="h-4 w-4 mr-2" /> Conta</TabsTrigger>
          <TabsTrigger value="security"><Lock className="h-4 w-4 mr-2" /> Segurança</TabsTrigger>
          <TabsTrigger value="signature"><PenLine className="h-4 w-4 mr-2" /> Assinatura</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-2" /> Aparência</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notificações</TabsTrigger>
          <TabsTrigger value="session"><ShieldAlert className="h-4 w-4 mr-2" /> Sessão</TabsTrigger>
          <TabsTrigger value="awareness"><Megaphone className="h-4 w-4 mr-2" /> Conscientizações</TabsTrigger>
        </TabsList>

        <TabsContent value="awareness" className="mt-4">
          <MyAwarenessPanel />
        </TabsContent>

        <TabsContent value="signature" className="mt-4">
          <SignatureSection />
        </TabsContent>

        <TabsContent value="account" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados da conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input value={profile?.full_name || user?.user_metadata?.full_name || ""} readOnly />
                  <p className="text-xs text-muted-foreground">
                    Para alterar seu nome, fale com o RH ou a Diretoria.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>E-mail</Label>
                  <Input value={user?.email || ""} readOnly />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alterar senha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nova senha</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Confirmar nova senha</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword}>
                  {savingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar nova senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Tema escuro</p>
                  <p className="text-sm text-muted-foreground">
                    Alterna entre o tema claro e escuro da interface.
                  </p>
                </div>
                <Switch checked={theme === "dark"} onCheckedChange={handleToggleTheme} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Preferências de notificação por canal estarão disponíveis em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sessão</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sair de todos os dispositivos estará disponível em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountSettings;
