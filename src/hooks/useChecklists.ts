import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  task_type_id: string | null;
  is_mandatory: boolean;
  company_id: string;
  created_at: string;
  items?: ChecklistItem[];
  task_type?: { name: string } | null;
}

export interface ChecklistItem {
  id: string;
  template_id: string;
  item_order: number;
  description: string;
  item_type: 'boolean' | 'text' | 'number' | 'photo';
  is_required: boolean;
}

export interface ChecklistResponse {
  id: string;
  task_id: string;
  template_id: string;
  technician_id: string;
  completed_at: string | null;
  created_at: string;
  item_responses?: ChecklistItemResponse[];
}

export interface ChecklistItemResponse {
  id: string;
  response_id: string;
  item_id: string;
  value_boolean: boolean | null;
  value_text: string | null;
  value_number: number | null;
  value_photo_path: string | null;
  answered_at: string;
}

export function useChecklists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) return;

      const { data, error } = await supabase
        .from('checklist_templates')
        .select(`
          *,
          task_type:task_type_id(name),
          items:checklist_items(*)
        `)
        .eq('company_id', profileData.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data as unknown as ChecklistTemplate[]) || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar checklists',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: Partial<ChecklistTemplate>, items: Partial<ChecklistItem>[]) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Company not found');

      const { data: newTemplate, error: templateError } = await supabase
        .from('checklist_templates')
        .insert({
          name: template.name,
          description: template.description,
          task_type_id: template.task_type_id,
          is_mandatory: template.is_mandatory ?? true,
          company_id: profileData.company_id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('checklist_items')
          .insert(
            items.map((item, index) => ({
              template_id: newTemplate.id,
              description: item.description,
              item_type: item.item_type || 'boolean',
              item_order: index,
              is_required: item.is_required ?? true,
            }))
          );

        if (itemsError) throw itemsError;
      }

      toast({
        title: 'Checklist criado',
        description: 'O checklist foi criado com sucesso.',
      });

      fetchTemplates();
      return newTemplate;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar checklist',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('checklist_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: 'Checklist excluído',
        description: 'O checklist foi excluído com sucesso.',
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir checklist',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchTemplates();
    }
  }, [user?.id]);

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
  };
}

export function useTaskChecklist(taskId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [responses, setResponses] = useState<ChecklistResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChecklistsForTask = async () => {
    try {
      setLoading(true);
      
      // Get task info to find task_type_id
      const { data: task } = await supabase
        .from('tasks')
        .select('task_type_id, service_order:service_order_id(company_id)')
        .eq('id', taskId)
        .single();

      if (!task) return;

      const companyId = (task.service_order as any)?.company_id;

      // Get templates for this task type or general templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('checklist_templates')
        .select(`
          *,
          items:checklist_items(*)
        `)
        .eq('company_id', companyId)
        .or(`task_type_id.is.null,task_type_id.eq.${task.task_type_id || '00000000-0000-0000-0000-000000000000'}`);

      if (templatesError) throw templatesError;
      setTemplates((templatesData as unknown as ChecklistTemplate[]) || []);

      // Get existing responses for this task
      const { data: responsesData, error: responsesError } = await supabase
        .from('checklist_responses')
        .select(`
          *,
          item_responses:checklist_item_responses(*)
        `)
        .eq('task_id', taskId);

      if (responsesError) throw responsesError;
      setResponses((responsesData as unknown as ChecklistResponse[]) || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar checklists',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveResponse = async (
    templateId: string,
    itemResponses: Record<string, { boolean?: boolean; text?: string; number?: number; photo?: string }>
  ) => {
    try {
      // Get technician ID
      const { data: technician } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!technician) throw new Error('Technician not found');

      // Check if response already exists
      let existingResponse = responses.find(r => r.template_id === templateId);
      let responseId: string;

      if (existingResponse) {
        responseId = existingResponse.id;
        // Delete old item responses
        await supabase
          .from('checklist_item_responses')
          .delete()
          .eq('response_id', responseId);
      } else {
        // Create new response
        const { data: newResponse, error: responseError } = await supabase
          .from('checklist_responses')
          .insert({
            task_id: taskId,
            template_id: templateId,
            technician_id: technician.id,
          })
          .select()
          .single();

        if (responseError) throw responseError;
        responseId = newResponse.id;
      }

      // Insert item responses
      const itemResponsesArray = Object.entries(itemResponses).map(([itemId, values]) => ({
        response_id: responseId,
        item_id: itemId,
        value_boolean: values.boolean ?? null,
        value_text: values.text ?? null,
        value_number: values.number ?? null,
        value_photo_path: values.photo ?? null,
      }));

      const { error: itemsError } = await supabase
        .from('checklist_item_responses')
        .insert(itemResponsesArray);

      if (itemsError) throw itemsError;

      // Mark as completed
      await supabase
        .from('checklist_responses')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', responseId);

      toast({
        title: 'Checklist salvo',
        description: 'O checklist foi preenchido com sucesso.',
      });

      fetchChecklistsForTask();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar checklist',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchChecklistsForTask();
    }
  }, [taskId]);

  return {
    templates,
    responses,
    loading,
    saveResponse,
    isCompleted: (templateId: string) => responses.some(r => r.template_id === templateId && r.completed_at),
    getResponse: (templateId: string) => responses.find(r => r.template_id === templateId),
  };
}
