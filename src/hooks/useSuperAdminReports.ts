import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportFilters {
  searchTerm?: string;
  vesselFilter?: string;
  dateFilter?: string;
  statusFilter?: string;
}

export const useSuperAdminReports = (filters: ReportFilters = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['super-admin-reports', filters],
    queryFn: async () => {
      let query = supabase
        .from('task_reports')
        .select(`
          id,
          task_id,
          status,
          created_at,
          pdf_path,
          task_uuid,
          tasks!inner (
            id,
            title,
            service_order_id,
            assigned_to,
            service_orders!inner (
              id,
              order_number,
              vessel_id,
              company_id,
              vessels (
                name
              ),
              companies (
                name
              )
            ),
            technicians:assigned_to (
              id,
              profiles:user_id (
                full_name
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.statusFilter) {
        query = query.eq('status', filters.statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform and filter data
      let formattedReports = data?.map((report: any) => ({
        id: report.id,
        taskId: report.task_id,
        orderNumber: report.tasks?.service_orders?.order_number || 'N/A',
        vesselName: report.tasks?.service_orders?.vessels?.name || 'N/A',
        companyName: report.tasks?.service_orders?.companies?.name || 'N/A',
        technician: report.tasks?.technicians?.profiles?.full_name || 'N/A',
        date: new Date(report.created_at),
        status: report.status,
        pdfPath: report.pdf_path,
      })) || [];

      // Client-side filtering
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        formattedReports = formattedReports.filter((report: any) =>
          report.orderNumber.toLowerCase().includes(term) ||
          report.vesselName.toLowerCase().includes(term) ||
          report.companyName.toLowerCase().includes(term) ||
          report.technician.toLowerCase().includes(term)
        );
      }

      if (filters.dateFilter) {
        const filterDate = new Date(filters.dateFilter);
        formattedReports = formattedReports.filter((report: any) =>
          report.date.toDateString() === filterDate.toDateString()
        );
      }

      return formattedReports;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const approveReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('task_reports')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-reports'] });
      toast({
        title: "Relatório aprovado",
        description: "O relatório foi aprovado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o relatório",
        variant: "destructive",
      });
    },
  });

  const rejectReportMutation = useMutation({
    mutationFn: async ({ reportId, reason }: { reportId: string; reason: string }) => {
      const { error } = await supabase
        .from('task_reports')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-reports'] });
      toast({
        title: "Relatório recusado",
        description: "O relatório foi recusado",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível recusar o relatório",
        variant: "destructive",
      });
    },
  });

  const downloadReport = async (pdfPath: string, reportId: string) => {
    try {
      if (!pdfPath) {
        toast({
          title: "Erro",
          description: "PDF não disponível para este relatório",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from('reports')
        .download(pdfPath);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O relatório está sendo baixado",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível baixar o relatório",
        variant: "destructive",
      });
    }
  };

  return {
    reports,
    isLoading,
    approveReport: approveReportMutation.mutate,
    rejectReport: rejectReportMutation.mutate,
    downloadReport,
  };
};
