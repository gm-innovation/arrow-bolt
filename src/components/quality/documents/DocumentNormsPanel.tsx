import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, AlertTriangle, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQualityReferenceNorms } from "@/hooks/useQualityIsoStructure";
import { useQualityDocumentNorms, isNormExpired } from "@/hooks/useQualityDocumentNorms";

interface Props {
  documentId: string;
  canEdit?: boolean;
}

const DocumentNormsPanel = ({ documentId, canEdit = true }: Props) => {
  const { norms: allNorms } = useQualityReferenceNorms();
  const { norms: linkedNorms, expiredNorms, setNorms } = useQualityDocumentNorms(documentId);
  const [open, setOpen] = useState(false);

  const linkedIds = useMemo(() => linkedNorms.map((n: any) => n.id), [linkedNorms]);

  const toggle = (id: string) => {
    const next = linkedIds.includes(id) ? linkedIds.filter((x) => x !== id) : [...linkedIds, id];
    setNorms.mutate(next);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <BookMarked className="h-4 w-4" /> Normas Referenciadas
          </CardTitle>
          {canEdit && (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">Vincular normas</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Buscar norma..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma norma cadastrada.</CommandEmpty>
                    <CommandGroup>
                      {allNorms.map((n) => {
                        const checked = linkedIds.includes(n.id);
                        const expired = isNormExpired(n);
                        return (
                          <CommandItem key={n.id} onSelect={() => toggle(n.id)}>
                            <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                            <span className="font-mono text-xs mr-2">{n.code}</span>
                            <span className="truncate flex-1">{n.title}</span>
                            {expired && <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-1" />}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {linkedNorms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma norma vinculada a este documento.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linkedNorms.map((n: any) => {
              const expired = isNormExpired(n);
              return (
                <Badge key={n.id} variant={expired ? "destructive" : "secondary"} className="gap-1">
                  {expired && <AlertTriangle className="h-3 w-3" />}
                  <span className="font-mono text-xs">{n.code}</span>
                  <span className="hidden sm:inline">— {n.title}</span>
                </Badge>
              );
            })}
          </div>
        )}
        {expiredNorms.length > 0 && (
          <div className="mt-3 flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
            <span>
              {expiredNorms.length} norma(s) referenciada(s) está(ão) vencida(s) ou fora de vigência. Atualize as referências antes da próxima auditoria.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentNormsPanel;
