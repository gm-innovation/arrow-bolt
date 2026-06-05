import { useState } from "react";
import { useManagementReview, INPUT_LABELS, ReviewInput } from "@/hooks/useManagementReview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface Props {
  reviewId: string;
  readOnly: boolean;
}

const InputRow = ({ input, readOnly, onSave }: { input: ReviewInput; readOnly: boolean; onSave: (notes: string) => Promise<void> }) => {
  const [notes, setNotes] = useState(input.notes ?? "");
  const [saving, setSaving] = useState(false);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{INPUT_LABELS[input.input_type]}</span>
          {input.is_snapshot && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> snapshot
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {input.content && Object.keys(input.content).length > 0 && (
          <pre className="text-xs bg-muted/30 rounded p-2 overflow-x-auto">{JSON.stringify(input.content, null, 2)}</pre>
        )}
        <div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações do relator..."
            disabled={readOnly || input.is_snapshot}
            rows={3}
          />
          {!readOnly && !input.is_snapshot && (
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={saving || notes === (input.notes ?? "")}
                onClick={async () => {
                  setSaving(true);
                  try { await onSave(notes); } finally { setSaving(false); }
                }}
              >
                Salvar observação
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ManagementReviewInputsPanel = ({ reviewId, readOnly }: Props) => {
  const { inputs, buildInputs, updateInputNotes } = useManagementReview(reviewId);
  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => buildInputs.mutate()} disabled={buildInputs.isPending}>
            {inputs.length === 0 ? "Gerar entradas" : "Regenerar (preserva snapshots)"}
          </Button>
        </div>
      )}
      {inputs.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhuma entrada. Clique em "Gerar entradas" para popular automaticamente.</p>
      ) : (
        inputs.map((i) => (
          <InputRow
            key={i.id}
            input={i}
            readOnly={readOnly}
            onSave={async (notes) => { await updateInputNotes.mutateAsync({ id: i.id, notes }); }}
          />
        ))
      )}
    </div>
  );
};

export default ManagementReviewInputsPanel;
