import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, CheckCircle2, AlertTriangle } from "lucide-react";
import { useQualityDocumentRequiredCourses, useMyMissingPrerequisites } from "@/hooks/useQualityDocumentRequiredCourses";

interface Props {
  documentId: string;
}

const DocumentPrerequisitesPanel = ({ documentId }: Props) => {
  const { items } = useQualityDocumentRequiredCourses(documentId);
  const { data: missing = [] } = useMyMissingPrerequisites(documentId);

  if (items.length === 0) return null;

  const missingIds = new Set(missing.map((m) => m.required_id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Pré-requisitos de treinamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((it) => {
          const isMissing = missingIds.has(it.id);
          return (
            <div key={it.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
              <div className="flex items-center gap-2">
                {isMissing
                  ? <AlertTriangle className="h-4 w-4 text-destructive" />
                  : <CheckCircle2 className="h-4 w-4 text-success" />}
                <Badge variant="outline">{it.course_id ? "Curso" : "Trilha"}</Badge>
                <span>{it.notes ?? (it.course_id ?? it.trail_id)}</span>
                {it.is_mandatory && <Badge variant="warning">Obrigatório</Badge>}
              </div>
            </div>
          );
        })}
        {missing.length > 0 && (
          <div className="text-xs text-destructive pt-2">
            Há pré-requisitos pendentes — concluído isto, você poderá dar ciência ao documento.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentPrerequisitesPanel;
