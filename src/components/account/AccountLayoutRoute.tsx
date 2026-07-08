import { Navigate } from "react-router-dom";
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
  manager: "director",
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
  const { userRole } = useAuth();
  const userType = userRole ? roleToUserType[userRole] : undefined;

  if (!userType) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ProtectedRoute>
      <DashboardLayout userType={userType} />
    </ProtectedRoute>
  );
};
