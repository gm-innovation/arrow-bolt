
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Credenciais predefinidas para cada tipo de usuário
const USER_CREDENTIALS = {
  superAdmin: { email: "superadmin@naval.com", password: "super123" },
  admin: { email: "admin@naval.com", password: "admin123" },
  technician: { email: "tecnico@naval.com", password: "tecnico123" }
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    // Verificar as credenciais
    if (email === USER_CREDENTIALS.superAdmin.email && password === USER_CREDENTIALS.superAdmin.password) {
      navigate("/super-admin/dashboard");
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo, Super Administrador!",
      });
    } else if (email === USER_CREDENTIALS.admin.email && password === USER_CREDENTIALS.admin.password) {
      navigate("/admin/dashboard");
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo, Administrador!",
      });
    } else if (email === USER_CREDENTIALS.technician.email && password === USER_CREDENTIALS.technician.password) {
      navigate("/tech/dashboard");
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo, Técnico!",
      });
    } else {
      setError("Email ou senha incorretos");
    }
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
            <CardTitle className="text-2xl text-center font-bold">Naval OS Manager</CardTitle>
            <CardDescription className="text-center">
              Digite suas credenciais para acessar o sistema
            </CardDescription>
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
              {error && (
                <div className="text-sm text-red-500 mt-2 bg-red-50 p-2 rounded-md">
                  {error}
                </div>
              )}
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                <p className="mb-1 font-medium text-gray-700">Credenciais para teste:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Super Admin: superadmin@naval.com / super123</li>
                  <li>Admin: admin@naval.com / admin123</li>
                  <li>Técnico: tecnico@naval.com / tecnico123</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-ocean-light hover:bg-ocean text-white font-medium py-5">
                Entrar
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
