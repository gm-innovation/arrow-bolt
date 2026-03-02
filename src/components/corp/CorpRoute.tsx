import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Skeleton } from '@/components/ui/skeleton';

const ContentSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-7 w-48" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
    <Skeleton className="h-64 rounded-xl" />
  </div>
);

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
        <Suspense fallback={<ContentSkeleton />}>{children}</Suspense>
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
        <Suspense fallback={<ContentSkeleton />}>{children}</Suspense>
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
        <Suspense fallback={<ContentSkeleton />}>{children}</Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
