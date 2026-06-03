import { useState, useEffect } from 'react';
import { Bot, X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { AIChat } from './AIChat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import defaultAvatar from '@/assets/ai-agent-avatar.png.asset.json';

interface AIAssistantProps {
  context?: {
    taskTypeId?: string;
    serviceOrderId?: string;
    companyId?: string;
    currentScreen?: string;
    taskData?: {
      title?: string;
      status?: string;
      vessel?: string;
      client?: string;
      tools?: string[];
      steps?: string[];
    };
    serviceOrderData?: {
      orderNumber?: string;
      status?: string;
      scheduledDate?: string;
      technicians?: string[];
    };
  };
}

export function AIAssistant({ context }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [agentIdentity, setAgentIdentity] = useState<{ name?: string; avatar_url?: string } | null>(null);
  const { userRole } = useAuth();

  useEffect(() => {
    supabase
      .from('ai_agents' as any)
      .select('name, identity')
      .eq('is_default', true)
      .is('company_id', null)
      .maybeSingle()
      .then(({ data }: any) => {
        // IMPORTANT: spread identity first so the column `name` wins over identity.name
        if (data) setAgentIdentity({ ...(data.identity ?? {}), name: data.name });
      });
  }, [isOpen]);

  const avatarUrl = agentIdentity?.avatar_url || defaultAvatar.url;
  const agentName = agentIdentity?.name || 'Arrow AI';

  const getRoleName = () => {
    switch (userRole) {
      case 'technician':
        return 'technician';
      case 'coordinator':
        return 'admin';
      case 'manager':
        return 'manager';
      default:
        return 'technician';
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-20 w-20 rounded-full shadow-xl z-50 p-0 overflow-hidden bg-primary hover:bg-primary/90 ring-2 ring-primary/30"
        size="icon"
        aria-label={`Abrir ${agentName}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={agentName} className="h-full w-full object-cover" />
        ) : (
          <Bot className="h-8 w-8" />
        )}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col bg-background border rounded-lg shadow-2xl transition-all duration-200",
        isMinimized ? "w-80 h-16" : "w-96 h-[600px] max-h-[85vh]"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary-foreground/40">
            <AvatarImage src={avatarUrl} alt={agentName} className="object-cover" />
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-base">{agentName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <AIChat
          userRole={getRoleName()}
          agentName={agentName}
          avatarUrl={avatarUrl}
          context={context}
        />
      )}
    </div>
  );
}
