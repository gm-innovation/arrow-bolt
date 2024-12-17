import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Ship,
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Bell,
  Calendar,
  FileText,
  Building2,
  CreditCard,
} from "lucide-react";
import { Button } from "./ui/button";

interface DashboardLayoutProps {
  children: ReactNode;
  userType: "super-admin" | "admin" | "tech";
}

const DashboardLayout = ({ children, userType }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const superAdminMenuItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/super-admin/dashboard" },
    { title: "Empresas", icon: Building2, path: "/super-admin/companies" },
    { title: "Usuários", icon: Users, path: "/super-admin/users" },
    { title: "Assinaturas", icon: CreditCard, path: "/super-admin/subscriptions" },
    { title: "Configurações", icon: Settings, path: "/super-admin/settings" },
    { title: "Relatórios", icon: FileText, path: "/super-admin/reports" },
  ];

  const adminMenuItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    { title: "Ordens de Serviço", icon: ClipboardList, path: "/admin/orders" },
    { title: "Agenda", icon: Calendar, path: "/admin/calendar" },
    { title: "Relatórios", icon: FileText, path: "/admin/reports" },
    { title: "Transferências", icon: Users, path: "/admin/transfers" },
    { title: "Histórico", icon: ClipboardList, path: "/admin/history" },
    { title: "Embarcações", icon: Ship, path: "/admin/vessels" },
    { title: "Tipos de Tarefas", icon: ClipboardList, path: "/admin/task-types" },
  ];

  const techMenuItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/tech/dashboard" },
    { title: "Tarefas", icon: ClipboardList, path: "/tech/tasks" },
    { title: "Relatórios", icon: FileText, path: "/tech/reports" },
    { title: "Notificações", icon: Bell, path: "/tech/notifications" },
  ];

  const menuItems = {
    "super-admin": superAdminMenuItems,
    admin: adminMenuItems,
    tech: techMenuItems,
  }[userType];

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar>
        <SidebarContent>
          <div className="p-4 flex items-center gap-2">
            <Ship className="h-6 w-6 text-navy-bright" />
            <span className="font-bold text-lg">Naval OS</span>
          </div>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={location.pathname === item.path ? "bg-navy-light text-white" : ""}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => navigate(item.path)}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </Button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <div className="mt-auto p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-700"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </SidebarContent>
      </Sidebar>
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
};

export default DashboardLayout;
