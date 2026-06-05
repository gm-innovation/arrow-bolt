import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { BadgeCheck, ShieldAlert, FileText, Clock, ExternalLink } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import {
  useMyAcknowledgements,
  AcknowledgementViewRow,
} from "@/hooks/useQualityAcknowledgements";
import { useQualitySignature } from "@/hooks/useQualitySignature";

const MyAcknowledgements = () => {
  const { pending, history, isLoading, acknowledge } = useMyAcknowledgements();
  const { signature } = useQualitySignature();
  const [confirming, setConfirming] = useState<AcknowledgementViewRow | null>(null);

  const handleClick = (item: AcknowledgementViewRow) => {
    if (item.requires_strong_acknowledgement) {
      setConfirming(item);
    } else {
      acknowledge.mutate(item.id);
    }
  };

  const handleConfirmStrong = async () => {
    if (!confirming) return;
    await acknowledge.mutateAsync(confirming.id);
    setConfirming(null);
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-center py-12">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BadgeCheck className="h-6 w-6" /> Minha Ciência
        </h2>
        <p className="text-muted-foreground">
          Documentos da Qualidade que aguardam sua confirmação de leitura.
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pendentes{" "}
            {pending.length > 0 && (
              <Badge className="ml-2">{pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Nenhuma ciência pendente. Tudo em dia.
                </p>
              ) : (
                <div className="space-y-3">
                  {pending.map((item) => {
                    const overdue = item.due_date && isPast(parseISO(item.due_date));
                    return (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 border rounded-lg p-4 hover:bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className="font-mono">
                              {item.document_code}
                            </Badge>
                            <Badge variant="secondary">Rev {item.revision_label}</Badge>
                            {item.requires_strong_acknowledgement ? (
                              <Badge variant="destructive" className="gap-1">
                                <ShieldAlert className="h-3 w-3" /> Assinatura eletrônica
                              </Badge>
                            ) : (
                              <Badge variant="outline">Confirmação simples</Badge>
                            )}
                            {overdue && <Badge variant="destructive">Em atraso</Badge>}
                          </div>
                          <p className="font-medium text-sm">{item.document_title}</p>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Atribuído em {format(parseISO(item.assigned_at), "dd/MM/yyyy")}
                            </span>
                            {item.due_date && (
                              <span>
                                Prazo: {format(parseISO(item.due_date), "dd/MM/yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/quality/documents/${item.document_id}`}>
                              <FileText className="h-4 w-4 mr-1" /> Abrir
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleClick(item)}
                            disabled={acknowledge.isPending}
                          >
                            <BadgeCheck className="h-4 w-4 mr-1" />
                            {item.requires_strong_acknowledgement
                              ? "Confirmar com assinatura"
                              : "Li e estou ciente"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ciências registradas</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sem registros ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <Link
                      key={item.id}
                      to={`/quality/documents/${item.document_id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">
                            {item.document_code} — {item.document_title}{" "}
                            <span className="text-xs text-muted-foreground">
                              Rev {item.revision_label}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.status === "acknowledged" && item.acknowledged_at
                              ? `Ciência registrada em ${format(
                                  parseISO(item.acknowledged_at),
                                  "dd/MM/yyyy HH:mm",
                                )}`
                              : item.status === "cancelled"
                              ? "Atribuição cancelada"
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === "acknowledged" ? (
                            <Badge>Concluída</Badge>
                          ) : (
                            <Badge variant="secondary">Cancelada</Badge>
                          )}
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Confirmação com assinatura
              eletrônica
            </DialogTitle>
            <DialogDescription>
              Você está prestes a registrar ciência do documento{" "}
              <strong>{confirming?.document_code}</strong> — {confirming?.document_title} (Rev{" "}
              {confirming?.revision_label}) com sua assinatura eletrônica cadastrada.
            </DialogDescription>
          </DialogHeader>

          {!signature ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              Você ainda não possui assinatura cadastrada. Acesse{" "}
              <Link to="/quality/signature" className="underline font-medium">
                Minha Assinatura
              </Link>{" "}
              para cadastrá-la antes de prosseguir.
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              Sua assinatura como <strong>{signature.full_name_snapshot}</strong> será aplicada ao
              registro, juntamente com data, hora e agente do dispositivo.
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmStrong}
              disabled={!signature || acknowledge.isPending}
            >
              <BadgeCheck className="h-4 w-4 mr-1" /> Assinar e registrar ciência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAcknowledgements;
