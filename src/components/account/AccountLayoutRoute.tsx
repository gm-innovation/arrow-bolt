import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";

type UserType =
  | "super-admin"
  | "admin"
  | "manager"
  | "tech"
  | "hr"
  | "commercial"
  | "director"
  | "compras"
  | "qualidade"
  | "financeiro";

const roleToUserType: Record<string, UserType> = {
  super_admin: "super-admin",
  coordinator: "admin",
  manager: "admin",
  director: "director",
  technician: "tech",
  hr: "hr",
  commercial: "commercial",
  compras: "compras",
  qualidade: "qualidade",
  financeiro: "financeiro",
  marketing: "commercial",
};

/**
 * Wraps a personal-account route with the DashboardLayout matching the
 * current user's role, so /account/* works for everyone while preserving
 * the sidebar of their module.
 */
export const AccountLayoutRoute = () => {
  const { user, userRole, loading } = useAuth();
  const userType = userRole ? roleToUserType[userRole] : undefined;

  // Wait for the role to resolve before deciding: otherwise a cold load of
  // /account/* bounces to /login while the session is still hydrating.
  if (loading || (user && !userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userType) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ProtectedRoute>
      <DashboardLayout userType={userType} />
    </ProtectedRoute>
  );
};
