
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship } from "lucide-react";
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-navy-light to-navy p-4">
      <Card className="w-full max-w-[350px]">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Ship className="h-12 w-12 text-navy-bright" />
          </div>
          <CardTitle className="text-2xl text-center">Naval OS Manager</CardTitle>
          <CardDescription className="text-center">
            Digite suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 mt-2">
                {error}
              </div>
            )}
            <div className="text-sm text-gray-500">
              <p className="mb-1">Credenciais para teste:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Super Admin: superadmin@naval.com / super123</li>
                <li>Admin: admin@naval.com / admin123</li>
                <li>Técnico: tecnico@naval.com / tecnico123</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-navy-bright hover:bg-navy-medium">
              Entrar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
