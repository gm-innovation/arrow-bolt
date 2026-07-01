import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ShieldCheck, FileText } from "lucide-react";
import { ControlledCopyOverlay } from "@/components/ui/ControlledCopyOverlay";
import { format, parseISO } from "date-fns";

const SUPABASE_URL = "https://iyuypkfksxfsutubcpay.supabase.co";
const FN_URL = `${SUPABASE_URL}/functions/v1/quality-public-doc`;

interface PublicResp {
  document: {
    id: string;
    code: string;
    title: string;
    status: string;
    control_mode: string | null;
    next_review_date: string | null;
    published_at: string | null;
  };
  version: {
    id: string;
    revision_label: string | null;
    file_name: string | null;
    file_mime: string | null;
    content_kind: string;
    rich_content: any;
  } | null;
  signed_url: string | null;
  link: { expires_at: string; access_count: number; max_uses: number | null };
}

const errorMessages: Record<string, string> = {
  missing_token: "Token não informado.",
  invalid_token: "Link inválido.",
  revoked: "Este link foi revogado pelo emissor.",
  expired: "Este link expirou.",
  limit_reached: "Este link atingiu o limite de acessos.",
  document_unavailable: "O documento não está mais disponível.",
  document_missing: "Documento não encontrado.",
};

export default function PublicQualityDocument() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicResp | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${FN_URL}?token=${encodeURIComponent(token ?? "")}`,
        );
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(errorMessages[body?.error] ?? "Não foi possível abrir o documento.");
        } else {
          setData(body as PublicResp);
        }
      } catch (e: any) {
        if (!cancelled) setError("Falha de rede.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const isUncontrolledCopy = data?.document.control_mode === "uncontrolled";
  const watermark =
    isUncontrolledCopy || !data?.document.control_mode
      ? "CÓPIA NÃO CONTROLADA"
      : null;

  return (
    <div className="min-h-screen bg-muted/40 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Documento compartilhado</h1>
            <p className="text-xs text-muted-foreground">
              Visualização pública protegida por token.
            </p>
          </div>
        </header>

        {loading && (
          <Card>
            <CardContent className="py-12 flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando documento...
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Acesso indisponível</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {data && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>
                      {data.document.code} — {data.document.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                      <Badge variant="outline">
                        Rev. {data.version?.revision_label ?? "—"}
                      </Badge>
                      {data.document.published_at && (
                        <span>
                          Publicado em{" "}
                          {format(
                            parseISO(data.document.published_at),
                            "dd/MM/yyyy",
                          )}
                        </span>
                      )}
                      {data.document.next_review_date && (
                        <span>
                          • Próxima revisão{" "}
                          {format(
                            parseISO(data.document.next_review_date),
                            "dd/MM/yyyy",
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  {watermark && (
                    <Badge variant="destructive" className="whitespace-nowrap">
                      <ShieldCheck className="h-3 w-3 mr-1" /> {watermark}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  {watermark && <ControlledCopyOverlay text={watermark} />}
                  {data.version?.content_kind === "rich" ? (
                    <article
                      className="prose max-w-none p-6"
                      dangerouslySetInnerHTML={{
                        __html:
                          typeof data.version.rich_content === "string"
                            ? data.version.rich_content
                            : data.version.rich_content?.html ?? "",
                      }}
                    />
                  ) : data.signed_url ? (
                    data.version?.file_mime?.startsWith("image/") ? (
                      <img
                        src={data.signed_url}
                        alt={data.document.title}
                        className="w-full"
                      />
                    ) : (
                      <iframe
                        src={data.signed_url}
                        className="w-full h-[80vh]"
                        title={data.document.title}
                      />
                    )
                  ) : (
                    <div className="p-6 text-sm text-muted-foreground">
                      Este documento não possui conteúdo publicado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-center text-muted-foreground">
              Link expira em{" "}
              {format(parseISO(data.link.expires_at), "dd/MM/yyyy HH:mm")} •
              acesso {data.link.access_count}
              {data.link.max_uses != null ? `/${data.link.max_uses}` : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
