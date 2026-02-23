// Helper para redirecionamento por role - centraliza a lógica em um único lugar
export const roleRedirects: Record<string, string> = {
  super_admin: "/super-admin/dashboard",
  admin: "/admin/dashboard",
  manager: "/manager/dashboard",
  technician: "/tech/dashboard",
  hr: "/hr/dashboard",
  commercial: "/commercial/dashboard",
  director: "/corp/dashboard",
};

export const getRoleRedirectPath = (role: string | null): string | null => {
  if (!role) return null;
  return roleRedirects[role] || null;
};
