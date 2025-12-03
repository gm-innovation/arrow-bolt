import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ClipboardCheck, ChevronDown, Check, Camera, AlertCircle } from 'lucide-react';
import { useTaskChecklist, ChecklistTemplate, ChecklistItem } from '@/hooks/useChecklists';
import { cn } from '@/lib/utils';

interface TaskChecklistProps {
  taskId: string;
  onChecklistComplete?: () => void;
}

export const TaskChecklist = ({ taskId, onChecklistComplete }: TaskChecklistProps) => {
  const { templates, responses, loading, saveResponse, isCompleted, getResponse } = useTaskChecklist(taskId);
  const [openTemplates, setOpenTemplates] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});

  useEffect(() => {
    // Initialize form data from existing responses
    const initialData: Record<string, Record<string, any>> = {};
    templates.forEach((template) => {
      const response = getResponse(template.id);
      if (response?.item_responses) {
        initialData[template.id] = {};
        response.item_responses.forEach((ir: any) => {
          initialData[template.id][ir.item_id] = {
            boolean: ir.value_boolean,
            text: ir.value_text,
            number: ir.value_number,
            photo: ir.value_photo_path,
          };
        });
      } else {
        initialData[template.id] = {};
      }
    });
    setFormData(initialData);
  }, [templates, responses]);

  const toggleTemplate = (templateId: string) => {
    const newOpen = new Set(openTemplates);
    if (newOpen.has(templateId)) {
      newOpen.delete(templateId);
    } else {
      newOpen.add(templateId);
    }
    setOpenTemplates(newOpen);
  };

  const updateItemValue = (templateId: string, itemId: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [itemId]: {
          ...prev[templateId]?.[itemId],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async (templateId: string) => {
    const templateData = formData[templateId] || {};
    await saveResponse(templateId, templateData);
    
    // Check if all mandatory checklists are complete
    const allMandatoryComplete = templates
      .filter((t) => t.is_mandatory)
      .every((t) => isCompleted(t.id) || t.id === templateId);
    
    if (allMandatoryComplete && onChecklistComplete) {
      onChecklistComplete();
    }
  };

  const renderItemInput = (template: ChecklistTemplate, item: ChecklistItem) => {
    const value = formData[template.id]?.[item.id];

    switch (item.item_type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <Checkbox
              id={`${item.id}-yes`}
              checked={value?.boolean === true}
              onCheckedChange={(checked) => {
                updateItemValue(template.id, item.id, 'boolean', checked ? true : null);
              }}
            />
            <Label htmlFor={`${item.id}-yes`} className="cursor-pointer">
              Sim
            </Label>
            <Checkbox
              id={`${item.id}-no`}
              checked={value?.boolean === false}
              onCheckedChange={(checked) => {
                updateItemValue(template.id, item.id, 'boolean', checked ? false : null);
              }}
            />
            <Label htmlFor={`${item.id}-no`} className="cursor-pointer">
              Não
            </Label>
          </div>
        );
      case 'text':
        return (
          <Textarea
            value={value?.text || ''}
            onChange={(e) => updateItemValue(template.id, item.id, 'text', e.target.value)}
            placeholder="Digite sua resposta..."
            className="mt-2"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value?.number || ''}
            onChange={(e) => updateItemValue(template.id, item.id, 'number', parseFloat(e.target.value))}
            placeholder="0"
            className="mt-2 w-32"
          />
        );
      case 'photo':
        return (
          <div className="mt-2">
            <Button variant="outline" size="sm" disabled>
              <Camera className="mr-2 h-4 w-4" />
              Adicionar Foto
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Funcionalidade em desenvolvimento
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const getCompletionStatus = (template: ChecklistTemplate) => {
    const completed = isCompleted(template.id);
    const response = getResponse(template.id);
    const itemCount = template.items?.length || 0;
    const answeredCount = response?.item_responses?.length || 0;

    return { completed, itemCount, answeredCount };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando checklists...</p>
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5" />
        Checklists
      </h3>

      {templates.map((template) => {
        const { completed, itemCount, answeredCount } = getCompletionStatus(template);
        const isOpen = openTemplates.has(template.id);

        return (
          <Card key={template.id} className={cn(completed && 'border-green-500/50 bg-green-500/5')}>
            <Collapsible open={isOpen} onOpenChange={() => toggleTemplate(template.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      {template.is_mandatory && (
                        <Badge variant="destructive" className="text-xs">
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {completed ? (
                        <Badge className="bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Concluído
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {answeredCount}/{itemCount} itens
                        </Badge>
                      )}
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 transition-transform',
                          isOpen && 'rotate-180'
                        )}
                      />
                    </div>
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {template.items?.sort((a, b) => a.item_order - b.item_order).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border rounded-lg bg-background"
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex-1">
                          {item.description}
                          {item.is_required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </span>
                      </div>
                      {renderItemInput(template, item)}
                    </div>
                  ))}

                  <div className="flex justify-end pt-2">
                    <Button onClick={() => handleSave(template.id)}>
                      {completed ? 'Atualizar' : 'Salvar'} Checklist
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {templates.some((t) => t.is_mandatory && !isCompleted(t.id)) && (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          Complete todos os checklists obrigatórios antes de finalizar a tarefa.
        </div>
      )}
    </div>
  );
};
