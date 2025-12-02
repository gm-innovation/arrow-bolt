import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Check, X, Edit2 } from 'lucide-react';
import type { ReportFields } from '@/hooks/useAIChat';

interface AIReportPreviewProps {
  fields: ReportFields;
  onApply: (fields: ReportFields) => void;
  onDismiss: () => void;
}

export function AIReportPreview({ fields, onApply, onDismiss }: AIReportPreviewProps) {
  const [editedFields, setEditedFields] = useState<ReportFields>(fields);
  const [isEditing, setIsEditing] = useState(false);

  const updateField = (key: keyof ReportFields, value: string) => {
    setEditedFields(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Relatório Gerado pelo AI
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            {isEditing ? 'Concluir Edição' : 'Editar'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Problema Reportado</Label>
          {isEditing ? (
            <Textarea
              value={editedFields.reportedIssue}
              onChange={(e) => updateField('reportedIssue', e.target.value)}
              className="text-sm"
              rows={2}
            />
          ) : (
            <p className="text-sm bg-background p-2 rounded border">{editedFields.reportedIssue}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Trabalho Executado</Label>
          {isEditing ? (
            <Textarea
              value={editedFields.executedWork}
              onChange={(e) => updateField('executedWork', e.target.value)}
              className="text-sm"
              rows={2}
            />
          ) : (
            <p className="text-sm bg-background p-2 rounded border">{editedFields.executedWork}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Resultado</Label>
          {isEditing ? (
            <Select value={editedFields.result} onValueChange={(v) => updateField('result', v)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Solucionado">Solucionado</SelectItem>
                <SelectItem value="Parcialmente Solucionado">Parcialmente Solucionado</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Não Solucionado">Não Solucionado</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm bg-background p-2 rounded border">{editedFields.result}</p>
          )}
        </div>

        {(editedFields.brandInfo || editedFields.modelInfo || isEditing) && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Marca</Label>
              {isEditing ? (
                <Input
                  value={editedFields.brandInfo || ''}
                  onChange={(e) => updateField('brandInfo', e.target.value)}
                  className="text-sm"
                />
              ) : (
                <p className="text-sm bg-background p-2 rounded border">{editedFields.brandInfo || '-'}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Modelo</Label>
              {isEditing ? (
                <Input
                  value={editedFields.modelInfo || ''}
                  onChange={(e) => updateField('modelInfo', e.target.value)}
                  className="text-sm"
                />
              ) : (
                <p className="text-sm bg-background p-2 rounded border">{editedFields.modelInfo || '-'}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={() => onApply(editedFields)} className="flex-1" size="sm">
            <Check className="h-4 w-4 mr-1" />
            Aplicar no Relatório
          </Button>
          <Button variant="outline" onClick={onDismiss} size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
