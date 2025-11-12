import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Edit, Trash2, UserPlus, ArrowRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLog {
  id: string;
  action: string;
  change_type: string;
  description: string;
  old_values: any;
  new_values: any;
  created_at: string;
  performed_by_profile: {
    full_name: string;
    email: string;
  } | null;
}

interface AuditTrailViewerProps {
  serviceOrderId: string;
}

export const AuditTrailViewer = ({ serviceOrderId }: AuditTrailViewerProps) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('service_history')
        .select(`
          *,
          performed_by_profile:performed_by (
            full_name,
            email
          )
        `)
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAuditLogs(data as any);
      }
      setIsLoading(false);
    };

    fetchAuditLogs();
  }, [serviceOrderId]);

  const getActionIcon = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return <FileText className="h-4 w-4" />;
      case 'update':
        return <Edit className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  const getChangeTypeBadge = (changeType: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      create: { variant: "default", label: "Criação" },
      update: { variant: "secondary", label: "Atualização" },
      delete: { variant: "destructive", label: "Exclusão" },
      other: { variant: "outline", label: "Outro" },
    };

    const { variant, label } = config[changeType] || config.other;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const renderValueDiff = (log: AuditLog) => {
    if (!log.old_values && !log.new_values) return null;

    if (log.change_type === 'create') {
      return (
        <div className="mt-2 text-sm text-muted-foreground">
          <p>Registro criado</p>
        </div>
      );
    }

    if (log.change_type === 'delete') {
      return (
        <div className="mt-2 text-sm text-muted-foreground">
          <p>Registro removido</p>
        </div>
      );
    }

    // Para updates, mostrar mudanças específicas
    if (log.action === 'task_reassigned') {
      return (
        <div className="mt-2 text-sm">
          <span className="text-muted-foreground">Técnico: </span>
          <span className="line-through text-destructive">{log.old_values?.old_technician || 'N/A'}</span>
          <ArrowRight className="inline h-3 w-3 mx-2" />
          <span className="text-primary font-medium">{log.new_values?.new_technician || 'N/A'}</span>
        </div>
      );
    }

    if (log.action === 'task_status_changed') {
      return (
        <div className="mt-2 text-sm">
          <span className="text-muted-foreground">Status: </span>
          <span className="line-through text-destructive">{log.old_values?.old_status || 'N/A'}</span>
          <ArrowRight className="inline h-3 w-3 mx-2" />
          <span className="text-primary font-medium">{log.new_values?.new_status || 'N/A'}</span>
        </div>
      );
    }

    return (
      <div className="mt-2 text-sm text-muted-foreground">
        <p>Alterações realizadas</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Nenhum histórico de auditoria disponível.
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-4">
        {auditLogs.map((log) => (
          <Card key={log.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getActionIcon(log.change_type)}
                  <CardTitle className="text-sm font-medium">
                    {log.description}
                  </CardTitle>
                </div>
                {getChangeTypeBadge(log.change_type)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {renderValueDiff(log)}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />
                    <span>{log.performed_by_profile?.full_name || 'Sistema'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
