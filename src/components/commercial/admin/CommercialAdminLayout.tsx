import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ArrowLeft,
  Package,
  CalendarClock,
  BookOpen,
  Upload,
  FileText,
  History,
} from "lucide-react";
import iconLight from "@/assets/icon-light.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { UserMenu } from "@/components/UserMenu";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface CommercialAdminLayoutProps {
  children: ReactNode;
}

const adminMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/commercial/admin" },
  { title: "Usuários", icon: Users, path: "/commercial/admin/users" },
  { title: "Serviços", icon: Package, path: "/commercial/admin/services" },
  { title: "Agendamentos", icon: CalendarClock, path: "/commercial/admin/schedules" },
  { title: "Conhecimento", icon: BookOpen, path: "/commercial/admin/knowledge" },
  { title: "Importação", icon: Upload, path: "/commercial/admin/import" },
  { title: "Logs Integração", icon: FileText, path: "/commercial/admin/integration-logs" },
  { title: "Logs Auditoria", icon: History, path: "/commercial/admin/logs" },
];

const CommercialAdminLayout = ({ children }: CommercialAdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => {
    if (path === "/commercial/admin") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const renderSidebarContent = (onNavigate?: () => void) => (
    <>
      <div className="p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-orange-600 hover:bg-orange-50 h-9 text-sm"
          onClick={() => {
            navigate("/commercial/dashboard");
            onNavigate?.();
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          {!collapsed && "Voltar ao CRM"}
        </Button>
      </div>

      {!collapsed && (
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Administração
        </div>
      )}

      <nav className="space-y-1 px-2">
        {adminMenuItems.map((item) => (
          <Button
            key={item.title}
            variant="ghost"
            className={cn(
              "w-full transition-all duration-200",
              collapsed ? "h-10 px-2 justify-center" : "h-10 justify-start gap-3",
              isActive(item.path)
                ? "bg-orange-50 text-orange-600 border-l-4 border-orange-600"
                : "text-muted-foreground hover:bg-muted"
            )}
            onClick={() => {
              navigate(item.path);
              onNavigate?.();
            }}
            title={collapsed ? item.title : undefined}
          >
            <item.icon
              className={cn(
                "h-5 w-5 flex-shrink-0",
                isActive(item.path) ? "text-orange-600" : "text-muted-foreground"
              )}
            />
            {!collapsed && <span className="truncate">{item.title}</span>}
          </Button>
        ))}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          className={cn(
            "relative flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out bg-card border-r border-border",
            collapsed ? "w-16" : "w-64"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-600 to-amber-600 border-b">
            <img src={iconLight} alt="Arrow" className="h-8 w-8 flex-shrink-0" />
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-white truncate">Admin Panel</span>
                <span className="text-xs text-white/70">Administração</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto text-white hover:bg-white/20 flex-shrink-0"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          </div>

          {/* Menu */}
          <div className="flex-1 overflow-y-auto py-2">{renderSidebarContent()}</div>

          {/* Logout */}
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              className={cn(
                "w-full text-destructive hover:text-destructive hover:bg-destructive/10",
                collapsed ? "h-10 px-2 justify-center" : "h-10 justify-start gap-3"
              )}
              onClick={handleLogout}
              title={collapsed ? "Sair" : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Sair</span>}
            </Button>
          </div>

          {collapsed && (
            <div className="absolute -right-3 top-1/2 -translate-y-1/2">
              <Button
                size="icon"
                variant="outline"
                className="h-6 w-6 rounded-full bg-card border-border shadow-sm hover:bg-muted"
                onClick={() => setCollapsed(false)}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Mobile Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-80 bg-card">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-600 to-amber-600">
            <div className="flex items-center gap-3">
              <img src={iconLight} alt="Arrow" className="h-8 w-8" />
              <span className="text-sm font-semibold text-white">Admin Panel</span>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="py-4">{renderSidebarContent(() => setMobileMenuOpen(false))}</div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
          <div className="px-4 md:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {isMobile && (
                <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => setMobileMenuOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">
                {adminMenuItems.find((i) => isActive(i.path))?.title || "Administração"}
              </h1>
            </div>
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-9" />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <UserMenu userType="commercial" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">{children}</div>
          <div className="border-t border-border bg-background py-4 px-4 md:px-6">
            <p className="text-center text-sm text-muted-foreground">© 2025 Arrow. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommercialAdminLayout;
