import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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
  coordinator: "admin",
  manager: "admin",
  technician: "tech",
  hr: "hr",
  commercial: "commercial",
  director: "director",
  compras: "compras",
  qualidade: "qualidade",
  financeiro: "financeiro",
};

// Map /corp/* paths to a page title so the header still updates without
// remounting the whole layout for each route.
const TITLES: Array<{ test: RegExp; title: string }> = [
  { test: /^\/corp\/dashboard/, title: "Solicitações Corp" },
  { test: /^\/corp\/requests/, title: "Solicitações Corp" },
  { test: /^\/corp\/documents/, title: "Documentos Corp" },
  { test: /^\/corp\/feed\/discussions/, title: "Discussão" },
  { test: /^\/corp\/feed/, title: "Feed" },
  { test: /^\/corp\/groups\/[^/]+\/discussions/, title: "Discussão" },
  { test: /^\/corp\/groups/, title: "Grupo" },
  { test: /^\/corp\/reports/, title: "Relatórios Corp" },
  { test: /^\/corp\/admin/, title: "Admin Corp" },
  { test: /^\/corp\/my-documents/, title: "Meus Documentos" },
  { test: /^\/corp\/profile/, title: "Perfil" },
  { test: /^\/corp\/university\/my-learning/, title: "Meu Aprendizado" },
  { test: /^\/corp\/university\/course/, title: "Curso" },
  { test: /^\/corp\/university\/trail/, title: "Trilha" },
  { test: /^\/corp\/university/, title: "Treinamentos" },
];

const usePageTitle = () => {
  const { pathname } = useLocation();
  return TITLES.find((t) => t.test.test(pathname))?.title;
};

const CorpShell = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { userRole } = useAuth();
  const userType = roleToUserType[userRole || ''] || 'admin';
  const pageTitle = usePageTitle();
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout userType={userType} pageTitle={pageTitle}>
        <Suspense fallback={<ContentSkeleton />}>
          <Outlet />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

const ALL_CORP_ROLES = ['coordinator', 'super_admin', 'manager', 'technician', 'hr', 'commercial', 'director', 'compras', 'qualidade', 'financeiro'];

export const CorpLayoutRoute = () => <CorpShell allowedRoles={ALL_CORP_ROLES} />;
export const CorpAdminLayoutRoute = () => <CorpShell allowedRoles={['super_admin']} />;
export const CorpReportsLayoutRoute = () => <CorpShell allowedRoles={['super_admin', 'hr', 'director', 'qualidade']} />;

// Back-compat wrappers (still used by lazy imports elsewhere). They render
// the same shell but pass children directly, so existing routes keep working
// while we migrate App.tsx.
export const CorpRoute = ({ children, pageTitle }: { children: React.ReactNode; pageTitle?: string }) => {
  const { userRole } = useAuth();
  const userType = roleToUserType[userRole || ''] || 'admin';
  return (
    <ProtectedRoute allowedRoles={ALL_CORP_ROLES}>
      <DashboardLayout userType={userType} pageTitle={pageTitle}>
        <Suspense fallback={<ContentSkeleton />}>{children}</Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export const CorpAdminRoute = ({ children, pageTitle }: { children: React.ReactNode; pageTitle?: string }) => {
  const { userRole } = useAuth();
  const userType = roleToUserType[userRole || ''] || 'admin';
  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <DashboardLayout userType={userType} pageTitle={pageTitle}>
        <Suspense fallback={<ContentSkeleton />}>{children}</Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export const CorpReportsRoute = ({ children, pageTitle }: { children: React.ReactNode; pageTitle?: string }) => {
  const { userRole } = useAuth();
  const userType = roleToUserType[userRole || ''] || 'admin';
  return (
    <ProtectedRoute allowedRoles={['super_admin', 'hr', 'director']}>
      <DashboardLayout userType={userType} pageTitle={pageTitle}>
        <Suspense fallback={<ContentSkeleton />}>{children}</Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
