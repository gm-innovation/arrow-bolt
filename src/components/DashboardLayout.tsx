
import { ReactNode, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  userType: "super-admin" | "admin" | "tech";
}

const DashboardLayout = ({ children, userType }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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
    { title: "Clientes", icon: Users, path: "/admin/clients" },
    { title: "Relatórios", icon: FileText, path: "/admin/reports" },
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

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const userColors = {
    "super-admin": "from-purple-600 to-blue-600",
    "admin": "from-blue-600 to-cyan-600",
    "tech": "from-cyan-600 to-teal-600"
  };

  const getUserTitle = () => {
    switch (userType) {
      case "super-admin": return "Super Administrador";
      case "admin": return "Administrador";
      case "tech": return "Técnico";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen flex w-full overflow-hidden bg-gray-50">
      <Sidebar className={cn(
        "transition-all duration-300 border-r border-gray-200 shadow-sm",
        collapsed ? "w-20" : "w-64"
      )}>
        <SidebarContent>
          <div className={cn(
            "flex items-center gap-3 p-4 bg-gradient-to-r", 
            userColors[userType]
          )}>
            <Ship className="h-8 w-8 text-white" />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-lg text-white">Naval OS</span>
                <span className="text-xs text-white/80">{getUserTitle()}</span>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto text-white hover:bg-white/20"
              onClick={toggleSidebar}
            >
              {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          </div>
          
          <div className="mt-3">
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Menu</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          "transition-all",
                          location.pathname === item.path 
                            ? "bg-ocean-light/10 text-ocean-light border-l-4 border-ocean-light" 
                            : "hover:bg-gray-100"
                        )}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-3 text-gray-600",
                            location.pathname === item.path && "text-ocean-light"
                          )}
                          onClick={() => navigate(item.path)}
                        >
                          <item.icon className={cn(
                            "h-5 w-5",
                            location.pathname === item.path ? "text-ocean-light" : "text-gray-500"
                          )} />
                          {!collapsed && <span>{item.title}</span>}
                        </Button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
          
          <div className="mt-auto p-4 border-t border-gray-200">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-red-500 hover:text-red-700 hover:bg-red-50",
                collapsed && "p-2"
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span>Sair</span>}
            </Button>
          </div>
        </SidebarContent>
      </Sidebar>
      
      <main className={cn(
        "flex-1 transition-all duration-300",
        collapsed ? "ml-20" : "ml-64"
      )}>
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                className="lg:hidden"
                onClick={toggleSidebar}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-800">
                {location.pathname.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-gray-500 hover:text-gray-700"
              >
                <Bell className="h-5 w-5" />
              </Button>
              <div className="h-8 w-8 rounded-full bg-ocean-light text-white flex items-center justify-center font-medium">
                {userType === "super-admin" ? "SA" : userType === "admin" ? "A" : "T"}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
