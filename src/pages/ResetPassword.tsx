import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there's a recovery token in the URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type !== 'recovery') {
      toast({
        title: "Link inválido",
        description: "Este link de recuperação é inválido ou expirou.",
        variant: "destructive",
      });
      navigate('/forgot-password');
    }
  }, [navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!newPassword || !confirmPassword) {
      setError("Por favor, preencha todos os campos");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    const { error: updateError } = await updatePassword(newPassword);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    toast({
      title: "Senha atualizada",
      description: "Sua senha foi atualizada com sucesso!",
    });
    
    setLoading(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-ocean-light to-ocean-dark p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-0 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 pointer-events-none" />
          <CardHeader className="space-y-1 relative">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-ocean-light/20">
                <Ship className="h-10 w-10 text-ocean-light" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-bold">Nova Senha</CardTitle>
            <CardDescription className="text-center">
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    type="password"
                    placeholder="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    type="password"
                    placeholder="Confirmar nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-500 mt-2 bg-red-50 p-2 rounded-md">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-ocean-light hover:bg-ocean text-white font-medium py-5"
                disabled={loading}
              >
                {loading ? "Atualizando..." : "Atualizar Senha"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
