import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { getRoleRedirectPath } from '@/lib/roleRedirect';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se o usuário tem role mas não é permitido nesta rota, redireciona para o dashboard dele
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    const correctPath = getRoleRedirectPath(userRole);
    if (correctPath) {
      return <Navigate to={correctPath} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
