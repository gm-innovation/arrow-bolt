import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, FileText, Paperclip, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatLocalDate } from "@/lib/utils";

interface OmieAttachment {
  id: number;
  name: string;
  extension: string;
  mime_type: string;
  kind: string;
  created_at: string | null;
  updated_at: string | null;
}

const KIND_LABEL: Record<string, string> = {
  medicao_fechamento: "Medição / Fechamento",
  relatorio: "Relatório",
  pedido_de_compra: "Pedido de compra",
  nota_fiscal: "Nota fiscal",
  orcamento: "Orçamento",
  detalhamento: "Detalhamento",
  ordem_de_servico: "Ordem de serviço",
  outro: "Outro",
};

async function invokeOmie(action: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("omie-proxy", { body: { action, params } });
  if (error) {
    let msg = error.message || "Erro ao consultar o Omie";
    try {
      const ctx = (error as any).context;
      if (ctx) {
        const body = await ctx.json();
        if (body?.error) msg = body.error;
      }
    } catch { /* mantém a mensagem original */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

interface Props {
  omieOsId: number | string | null | undefined;
  orderNumber?: string | null;
}

export const OmieAttachmentsPanel = ({ omieOsId, orderNumber }: Props) => {
  const [downloading, setDownloading] = useState<number | null>(null);
  const osId = omieOsId ? Number(omieOsId) : null;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["omie-os-attachments", osId],
    queryFn: () => invokeOmie("list_attachments", { nCodOS: osId }),
    enabled: !!osId,
    staleTime: 60_000,
  });

  const openAttachment = async (att: OmieAttachment) => {
    try {
      setDownloading(att.id);
      const res = await invokeOmie("get_attachment", { nCodOS: osId, nIdAnexo: att.id });
      if (!res?.download_url) throw new Error("O Omie não retornou o link do arquivo.");
      window.open(res.download_url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível abrir o arquivo no Omie.");
    } finally {
      setDownloading(null);
    }
  };

  if (!osId) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta OS ainda não está vinculada ao Omie, então não há arquivos para listar.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
          <div className="text-sm">
            <p className="font-medium">Não consegui ler os anexos desta OS no Omie.</p>
            <p className="text-muted-foreground">{(error as Error).message}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    );
  }

  const attachments: OmieAttachment[] = data?.attachments ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <Paperclip className="mr-1 inline h-3.5 w-3.5" />
          {attachments.length} arquivo(s) no Omie{orderNumber ? ` para a OS ${orderNumber}` : ""}
        </p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum arquivo anexado a esta OS no Omie.</p>
      )}

      <ul className="space-y-2">
        {attachments.map((att) => (
          <li key={att.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium">{att.name}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {KIND_LABEL[att.kind] ?? "Outro"}
                </Badge>
                {att.created_at && (
                  <span className="text-xs text-muted-foreground">
                    {formatLocalDate(att.created_at.slice(0, 10))}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAttachment(att)}
              disabled={downloading === att.id}
            >
              <Download className={`mr-2 h-4 w-4 ${downloading === att.id ? "animate-pulse" : ""}`} />
              Abrir
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
