import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, ExternalLink, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseISO } from "date-fns";
import type { MarinaDesign } from "@/hooks/useMarinaDesigns";

interface Props {
  designs: MarinaDesign[];
  onOpen: (design: MarinaDesign) => void;
}

export function ApprovedDesignsPanel({ designs, onOpen }: Props) {
  if (designs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="rounded-full bg-muted p-4">
          <FileCheck className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Nenhum design aprovado ainda. Depois de aprovar uma peça, ela aparece aqui com o arquivo exportado guardado no
          Arrow.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {designs.map((d) => (
          <article key={d.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm font-medium">{d.title ?? "Design aprovado"}</p>
              <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                {d.export_format ?? "canva"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {d.approved_at
                ? `Aprovado em ${format(parseISO(d.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                : "Aprovado"}
              {d.profile ? ` · ${d.profile}` : ""}
            </p>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onOpen(d)}>
                Ver no palco
              </Button>
              <Button asChild size="sm" variant="ghost">
                <a href={d.canva_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> Canva
                </a>
              </Button>
              {d.file_url && (
                <Button asChild size="sm" variant="ghost">
                  <a href={d.file_url} target="_blank" rel="noreferrer">
                    <Download className="mr-1 h-3.5 w-3.5" /> Arquivo
                  </a>
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </ScrollArea>
  );
}
