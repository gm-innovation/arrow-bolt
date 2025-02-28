
import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
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
  Menu,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: ReactNode;
  userType: "super-admin" | "admin" | "tech";
}

const UserTypeToDisplayName = {
  "super-admin": "Super Admin",
  "admin": "Administrador",
  "tech": "Técnico"
};

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

  const userName = UserTypeToDisplayName[userType];
  const userEmail = userType === "super-admin" 
    ? "superadmin@naval.com" 
    : userType === "admin" 
      ? "admin@naval.com" 
      : "tecnico@naval.com";

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <button className="text-gray-500 hover:text-gray-700">
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-semibold">Naval OS Manager</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
          </Button>
          <div className="flex items-center space-x-2">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-gray-500">{userEmail}</p>
            </div>
            <div className="bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center text-gray-700">
              <UserCircle size={24} />
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#121f36] text-white flex flex-col">
          {/* User Info */}
          <div className="p-4 border-b border-gray-700 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center mb-2">
              <UserCircle size={48} className="text-gray-300" />
            </div>
            <h2 className="font-semibold">{userName}</h2>
            <p className="text-xs text-gray-400">{userEmail}</p>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.title}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center px-4 py-2 text-sm ${
                      location.pathname === item.path 
                        ? "bg-blue-700 text-white" 
                        : "text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Logout Button */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </button>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 bg-[#f4f6f9] overflow-y-auto p-6">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
