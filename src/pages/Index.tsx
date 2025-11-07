import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Ship } from "lucide-react";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && userRole) {
      // Redirect authenticated users to their dashboard
      if (userRole === 'super_admin') {
        navigate('/super-admin/dashboard');
      } else if (userRole === 'admin') {
        navigate('/admin/dashboard');
      } else if (userRole === 'technician') {
        navigate('/tech/dashboard');
      }
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-ocean-light to-ocean-dark text-white">
      <div className="w-full max-w-4xl animate-fade-in">
        <div className="text-center space-y-6">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-white/10 backdrop-blur-md">
              <Ship className="h-20 w-20 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">Naval OS Manager</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Sistema completo de gerenciamento de ordens de serviço para a indústria naval.
            Controle eficiente de tarefas, relatórios e manutenção.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button 
              className="text-lg py-6 px-8 bg-white text-ocean-dark hover:bg-white/90 transition-all"
              onClick={() => navigate("/auth/login")}
            >
              Entrar no Sistema
            </Button>
            <Button 
              variant="outline" 
              className="text-lg py-6 px-8 border-white text-white hover:bg-white/10 transition-all"
              onClick={() => navigate("/auth/signup")}
            >
              Criar Conta
            </Button>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 transform transition-all hover:translate-y-[-5px] hover:shadow-xl">
            <div className="p-3 bg-white/20 w-fit rounded-lg mb-4">
              <Ship className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Gerenciamento de Frota</h3>
            <p className="text-white/80">
              Controle completo da sua frota de embarcações com histórico de manutenção.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 transform transition-all hover:translate-y-[-5px] hover:shadow-xl">
            <div className="p-3 bg-white/20 w-fit rounded-lg mb-4">
              <Ship className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Ordens de Serviço</h3>
            <p className="text-white/80">
              Crie e gerencie ordens de serviço com atribuição automática aos técnicos.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 transform transition-all hover:translate-y-[-5px] hover:shadow-xl">
            <div className="p-3 bg-white/20 w-fit rounded-lg mb-4">
              <Ship className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Relatórios Detalhados</h3>
            <p className="text-white/80">
              Gere relatórios detalhados de manutenção e histórico de serviços.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
