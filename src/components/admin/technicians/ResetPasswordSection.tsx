import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Copy, KeyRound, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResetPasswordSectionProps {
  userId: string;
}

export const ResetPasswordSection = ({ userId }: ResetPasswordSectionProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setNewPassword(password);
    setShowPassword(true);
  };

  const copyToClipboard = async () => {
    if (!newPassword) return;
    await navigator.clipboard.writeText(newPassword);
    toast.success("Senha copiada!");
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { user_id: userId, new_password: newPassword },
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Erro ao redefinir senha');

      toast.success("Senha redefinida com sucesso! Copie e informe ao usuário.");
      setShowPassword(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao redefinir senha");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <KeyRound className="h-5 w-5" />
        Redefinir Senha
      </h3>
      <p className="text-sm text-muted-foreground">
        Gere uma nova senha para o técnico. Após redefinir, copie e informe ao usuário.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nova senha (mín. 8 caracteres)"
            autoComplete="new-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        <Button type="button" variant="outline" size="icon" onClick={generatePassword} title="Gerar senha">
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button type="button" variant="outline" size="icon" onClick={copyToClipboard} disabled={!newPassword} title="Copiar senha">
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={handleResetPassword}
        disabled={isResetting || !newPassword || newPassword.length < 8}
        className="w-full"
      >
        {isResetting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Redefinindo...
          </>
        ) : (
          <>
            <KeyRound className="h-4 w-4 mr-2" />
            Redefinir Senha
          </>
        )}
      </Button>
    </div>
  );
};
