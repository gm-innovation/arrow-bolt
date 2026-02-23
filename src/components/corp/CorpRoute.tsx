import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const roleToUserType: Record<string, "super-admin" | "admin" | "manager" | "tech" | "hr" | "commercial" | "director" | "compras" | "qualidade" | "financeiro"> = {
  super_admin: "super-admin",
  admin: "admin",
  manager: "manager",
  technician: "tech",
  hr: "hr",
  commercial: "commercial",
  director: "director",
  compras: "compras",
  qualidade: "qualidade",
  financeiro: "financeiro",
};

export const CorpRoute = ({ children }: { children: React.ReactNode }) => {
  const { userRole } = useAuth();
  const userType = roleToUserType[userRole || ''] || 'admin';

  return (
    <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager', 'technician', 'hr', 'commercial', 'director', 'compras', 'qualidade', 'financeiro']}>
      <DashboardLayout userType={userType}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export const CorpAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { userRole } = useAuth();
  const userType = roleToUserType[userRole || ''] || 'admin';

  return (
    <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
      <DashboardLayout userType={userType}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export const CorpReportsRoute = ({ children }: { children: React.ReactNode }) => {
  const { userRole } = useAuth();
  const userType = roleToUserType[userRole || ''] || 'admin';

  return (
    <ProtectedRoute allowedRoles={['admin', 'super_admin', 'hr', 'director']}>
      <DashboardLayout userType={userType}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
};
