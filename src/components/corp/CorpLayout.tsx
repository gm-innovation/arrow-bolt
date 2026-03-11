import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, ClipboardList, FileText, BarChart3, Settings, FolderOpen } from 'lucide-react';

interface CorpLayoutProps {
  children: ReactNode;
}

const CorpLayout = ({ children }: CorpLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();

  const isAdmin = userRole === 'super_admin';
  const isHR = userRole === 'hr';
  const isDirector = userRole === 'director';
  const canViewReports = isAdmin || isHR || isDirector;
  const canViewAdmin = isAdmin;

  const tabs = [
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/corp/dashboard' },
    { value: 'requests', label: 'Solicitações', icon: ClipboardList, path: '/corp/requests' },
    { value: 'documents', label: 'Documentos', icon: FileText, path: '/corp/documents' },
    { value: 'my-documents', label: 'Meus Documentos', icon: FolderOpen, path: '/corp/my-documents' },
    ...(canViewReports ? [{ value: 'reports', label: 'Relatórios', icon: BarChart3, path: '/corp/reports' }] : []),
    ...(canViewAdmin ? [{ value: 'admin', label: 'Admin', icon: Settings, path: '/corp/admin/departments' }] : []),
  ];

  const currentTab = tabs.find(t => location.pathname.startsWith(t.path))?.value || 'dashboard';

  return (
    <div className="space-y-4">
      <Tabs value={currentTab} onValueChange={(val) => {
        const tab = tabs.find(t => t.value === val);
        if (tab) navigate(tab.path);
      }}>
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2 data-[state=active]:bg-background">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
};

export default CorpLayout;
