import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { getRoleRedirectPath } from '@/lib/roleRedirect';

/**
 * Componente de landing para rota "/"
 * - Se autenticado com role: redireciona para dashboard correto
 * - Se não autenticado: redireciona para /login
 * Isso evita que o componente Login seja montado e desmontado desnecessariamente
 */
export const AuthLanding = () => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && userRole) {
    const redirectPath = getRoleRedirectPath(userRole);
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <Navigate to="/login" replace />;
};
