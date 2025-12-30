import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Lock, Mail } from "lucide-react";
import logoDark from "@/assets/logo-dark.png";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleRedirectPath } from "@/lib/roleRedirect";

const SESSION_EMAIL_KEY = "login_email_temp";

const Login = () => {
  // Controlled inputs para persistir valores
  const [email, setEmail] = useState(() => {
    return sessionStorage.getItem(SESSION_EMAIL_KEY) || "";
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, user, userRole, loading: authLoading } = useAuth();

  // Persistir email no sessionStorage enquanto digita
  useEffect(() => {
    if (email) {
      sessionStorage.setItem(SESSION_EMAIL_KEY, email);
    }
  }, [email]);

  // Redirecionar quando autenticado e com role (via SPA, sem reload)
  useEffect(() => {
    if (authLoading) return;

    if (user && userRole) {
      // Limpar email do sessionStorage após login bem-sucedido
      sessionStorage.removeItem(SESSION_EMAIL_KEY);
      
      const redirectPath = getRoleRedirectPath(userRole);
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      }
    } else if (user && !userRole && !authLoading) {
      setError("Usuário sem permissões. Contate o administrador.");
    }
  }, [user, userRole, authLoading, navigate]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    setIsSubmitting(true);

    const { error: signInError } = await signIn(trimmedEmail, password);

    if (signInError) {
      setError("Email ou senha incorretos");
      setIsSubmitting(false);
      return;
    }

    toast({
      title: "Login realizado com sucesso",
      description: "Bem-vindo!",
    });
    setIsSubmitting(false);
  }, [email, password, signIn, toast]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-ocean-light to-ocean-dark p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-0 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 pointer-events-none" />
          <CardHeader className="space-y-1 relative">
            <div className="flex items-center justify-center mb-4">
              <img src={logoDark} alt="Arrow" className="h-34 w-auto" />
            </div>
            <CardDescription className="text-center">Digite suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              {error && <div className="text-sm text-destructive mt-2 bg-destructive/10 p-2 rounded-md">{error}</div>}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full bg-ocean-light hover:bg-ocean text-white font-medium py-5"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500 gap-2">
                <Link to="/signup" className="text-ocean-light hover:underline">
                  Criar conta
                </Link>
                <Link to="/forgot-password" className="text-ocean-light hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
