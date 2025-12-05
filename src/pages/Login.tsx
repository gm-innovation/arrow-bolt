import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, user, userRole, loading: authLoading } = useAuth();

  useEffect(() => {
    // Only process after auth loading is complete
    if (authLoading) return;

    if (user && userRole) {
      if (userRole === "super_admin") {
        navigate("/super-admin/dashboard");
      } else if (userRole === "admin") {
        navigate("/admin/dashboard");
      } else if (userRole === "manager") {
        navigate("/manager/dashboard");
      } else if (userRole === "technician") {
        navigate("/tech/dashboard");
      }
    } else if (user && !userRole && !loading) {
      // Only show error if user is logged in, role is null, AND form is not loading
      setError("Usuário sem permissões. Contate o administrador.");
    }
  }, [user, userRole, authLoading, navigate, loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Por favor, preencha todos os campos");
      setLoading(false);
      return;
    }

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError("Email ou senha incorretos");
      setLoading(false);
      return;
    }

    toast({
      title: "Login realizado com sucesso",
      description: "Bem-vindo!",
    });
    setLoading(false);
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
            <CardTitle className="text-2xl text-center font-bold">Arrow</CardTitle>
            <CardDescription className="text-center">Digite suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              {error && <div className="text-sm text-red-500 mt-2 bg-red-50 p-2 rounded-md">{error}</div>}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full bg-ocean-light hover:bg-ocean text-white font-medium py-5"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
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
