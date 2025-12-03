import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Ship,
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Bell,
  FileText,
  Building2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Wrench,
  Calculator,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/super-admin/NotificationBell";
import { NotificationBell as AdminNotificationBell } from "@/components/admin/NotificationBell";
import { ManagerNotificationBell } from "@/components/manager/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { ChatButton } from "@/components/chat/ChatButton";
import { useWhatsAppAutoNotifier } from "@/hooks/useWhatsAppAutoNotifier";
import { AIAssistant } from "@/components/ai/AIAssistant";

interface DashboardLayoutProps {
  children: ReactNode;
  userType: "super-admin" | "admin" | "manager" | "tech";
  pageTitle?: string;
}

const DashboardLayout = ({ children, userType, pageTitle }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Hook para enviar WhatsApp automaticamente quando notificações são criadas
  useWhatsAppAutoNotifier();

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

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
    { title: "Técnicos", icon: Wrench, path: "/admin/technicians" },
    { title: "Clientes", icon: Users, path: "/admin/clients" },
    { title: "Relatórios", icon: FileText, path: "/admin/reports" },
    { title: "Tipos de Tarefas", icon: ClipboardList, path: "/admin/task-types" },
  ];

  const managerMenuItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/manager/dashboard" },
    { title: "Coordenadores", icon: Users, path: "/manager/coordinators" },
    { title: "Ordens de Serviço", icon: ClipboardList, path: "/manager/orders" },
    { title: "Relatórios", icon: FileText, path: "/manager/reports" },
    { title: "Config. Medição", icon: Calculator, path: "/manager/measurement-settings" },
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
    manager: managerMenuItems,
    tech: techMenuItems,
  }[userType];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const userColors = {
    "super-admin": "from-purple-600 to-blue-600",
    "admin": "from-blue-600 to-cyan-600",
    "manager": "from-indigo-600 to-purple-600",
    "tech": "from-cyan-600 to-teal-600"
  };

  const getUserTitle = () => {
    switch (userType) {
      case "super-admin": return "Super Administrador";
      case "admin": return "Coordenador";
      case "manager": return "Gerente";
      case "tech": return "Técnico";
      default: return "";
    }
  };

  const renderMobileMenu = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent side="left" className="p-0 w-80 bg-white">
        <div className={cn(
          "flex items-center justify-between p-4 bg-gradient-to-r",
          userColors[userType]
        )}>
          <div className="flex items-center gap-3">
            <Ship className="h-8 w-8 text-white" />
            <div className="flex flex-col">
              <span className="font-bold text-lg text-white">Naval OS</span>
              <span className="text-xs text-white/80">{getUserTitle()}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="px-2 py-4">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.title}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  location.pathname === item.path 
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600" 
                    : "text-gray-600 hover:bg-gray-100"
                )}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
              >
                <item.icon className={cn(
                  "h-5 w-5",
                  location.pathname === item.path ? "text-blue-600" : "text-gray-500"
                )} />
                <span>{item.title}</span>
              </Button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className={cn(
          "relative flex-shrink-0 transition-all duration-300 ease-in-out bg-white border-r border-gray-200",
          collapsed ? "w-16" : "w-64"
        )}>
          {/* Header */}
          <div className={cn(
            "flex items-center gap-3 p-4 bg-gradient-to-r border-b", 
            userColors[userType]
          )}>
            <Ship className="h-8 w-8 text-white flex-shrink-0" />
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-lg text-white truncate">Naval OS</span>
                <span className="text-xs text-white/80 truncate">{getUserTitle()}</span>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto text-white hover:bg-white/20 flex-shrink-0"
              onClick={toggleSidebar}
            >
              {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          </div>
          
          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="p-2">
              {!collapsed && <div className="px-2 py-2 text-xs font-medium text-gray-600 uppercase tracking-wider">Menu</div>}
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <Button
                    key={item.title}
                    variant="ghost"
                    className={cn(
                      "w-full transition-all duration-200",
                      collapsed ? "h-10 px-2 justify-center" : "h-10 justify-start gap-3",
                      location.pathname === item.path 
                        ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600" 
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                    onClick={() => navigate(item.path)}
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 flex-shrink-0",
                      location.pathname === item.path ? "text-blue-600" : "text-gray-500"
                    )} />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </Button>
                ))}
              </nav>
            </div>
          </div>
          
          {/* Logout Button */}
          <div className="border-t border-gray-200 p-2 bg-white">
            <Button
              variant="ghost"
              className={cn(
                "w-full transition-all duration-200 text-red-500 hover:text-red-700 hover:bg-red-50",
                collapsed ? "h-10 px-2 justify-center" : "h-10 justify-start gap-3"
              )}
              onClick={handleLogout}
              title={collapsed ? "Sair" : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Sair</span>}
            </Button>
          </div>

          {/* Expand Button for Collapsed Sidebar */}
          {collapsed && (
            <div className="absolute -right-3 top-1/2 transform -translate-y-1/2">
              <Button
                size="icon"
                variant="outline"
                className="h-6 w-6 rounded-full bg-white border-gray-300 shadow-sm hover:bg-gray-50"
                onClick={toggleSidebar}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Mobile Menu */}
      {renderMobileMenu()}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 md:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {isMobile && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <h1 className="text-lg md:text-xl font-semibold text-gray-800 truncate">
                {pageTitle || (() => {
                  const lastSegment = location.pathname.split("/").pop() || "Dashboard";
                  // Don't show UUID patterns as titles
                  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastSegment);
                  if (isUUID) return "Detalhes";
                  return lastSegment.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                })()}
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ChatButton userType={userType} />
              {userType === "super-admin" ? (
                <NotificationBell />
              ) : userType === "admin" ? (
                <AdminNotificationBell />
              ) : userType === "manager" ? (
                <ManagerNotificationBell />
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => navigate("/tech/notifications")}
                >
                  <Bell className="h-5 w-5" />
                </Button>
              )}
              <UserMenu userType={userType} />
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto flex flex-col">
          <div className="flex-1 p-4 md:p-6">
            {children}
          </div>
          
          {/* AI Assistant - disponível em todas as páginas */}
          <AIAssistant />
          
          {/* Footer */}
          <div className="border-t border-border bg-background py-4 px-4 md:px-6">
            <p className="text-center text-sm text-muted-foreground">
              © 2025 Arrow. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;