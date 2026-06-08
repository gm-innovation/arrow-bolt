import { useQualityPolicy } from "@/hooks/useQualityPolicy";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export default function PolicyAwarenessBanner() {
  const { policyText, policyVersion, needsAcknowledgement, acknowledge } = useQualityPolicy();
  if (!needsAcknowledgement || !policyText) return null;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <div className="flex items-start gap-3 flex-1">
          <ShieldCheck className="h-5 w-5 mt-0.5 text-primary shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Política da Qualidade (v{policyVersion})</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">{policyText}</p>
          </div>
        </div>
        <Button onClick={() => acknowledge.mutate()} disabled={acknowledge.isPending}>
          Li e estou ciente
        </Button>
      </CardContent>
    </Card>
  );
}
