import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  Calendar, 
  ClipboardList,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIAction {
  type: 'navigate' | 'create_os' | 'view_technician' | 'view_report';
  label: string;
  path?: string;
  data?: Record<string, unknown>;
}

interface AIActionButtonProps {
  action: AIAction;
}

const actionIcons: Record<string, React.ElementType> = {
  navigate: ArrowRight,
  create_os: FileText,
  view_technician: Users,
  view_report: ClipboardList,
  view_calendar: Calendar
};

export function AIActionButton({ action }: AIActionButtonProps) {
  const navigate = useNavigate();
  const Icon = actionIcons[action.type] || ArrowRight;

  const handleClick = () => {
    if (action.path) {
      navigate(action.path, { state: action.data });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-xs mt-2"
      onClick={handleClick}
    >
      <Icon className="h-3 w-3" />
      {action.label}
    </Button>
  );
}

// Helper to detect actions from AI response
export function detectActionsFromResponse(content: string): AIAction[] {
  const actions: AIAction[] = [];

  // Detect OS creation intent
  if (/criar\s*(nova\s*)?os|nova\s*ordem/i.test(content)) {
    actions.push({
      type: 'create_os',
      label: 'Criar Nova OS',
      path: '/admin/service-orders'
    });
  }

  // Detect technician view intent
  const technicianMatch = content.match(/técnico\s+(\w+)/i);
  if (technicianMatch) {
    actions.push({
      type: 'view_technician',
      label: 'Ver Técnicos',
      path: '/admin/technicians'
    });
  }

  // Detect calendar view intent
  if (/agenda|calendário|agendamento/i.test(content)) {
    actions.push({
      type: 'navigate',
      label: 'Ver Calendário',
      path: '/admin/service-calendar'
    });
  }

  // Detect report view intent
  if (/relatório|report/i.test(content)) {
    actions.push({
      type: 'view_report',
      label: 'Ver Relatórios',
      path: '/admin/reports'
    });
  }

  return actions;
}
