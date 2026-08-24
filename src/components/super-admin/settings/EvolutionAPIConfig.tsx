import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  MessageCircle,
  Copy,
  Loader2,
  Send,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface EvolutionStatus {
  configured: boolean;
  secrets: Record<string, boolean>;
  instance: string | null;
  apiUrl: string | null;
  webhookUrl: string;
  instanceStatus: string | null;
  pendingMessages: number;
  linkedNumbers: number;
}

const SECRET_LABELS: Record<string, string> = {
  EVOLUTION_API_URL: "URL da Evolution API",
  EVOLUTION_INSTANCE: "Nome da instância",
  EVOLUTION_API_KEY: "API key",
  EVOLUTION_WEBHOOK_TOKEN: "Token do webhook",
};

export function EvolutionAPIConfig() {
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  const { data: status, isLoading, isFetching } = useQuery<EvolutionStatus>({
    queryKey: ["evolution-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-config", { method: "GET" });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as EvolutionStatus;
    },
    refetchInterval: 30_000,
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-config", {
        body: { action: "test", to: testPhone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Mensagem de teste enviada com sucesso.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar teste");
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connected = status?.configured && status?.instanceStatus === "open";
  const configuredButDown = status?.configured && !connected;

  return (
    <div className="space-y-4" data-tour="evolution-config">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle>WhatsApp da Marina — Evolution API</CardTitle>
                <CardDescription>
                  Canal de conversa da assistente Marina com os colaboradores via WhatsApp.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connected && (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Conectada
                </Badge>
              )}
              {configuredButDown && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {status?.instanceStatus?.startsWith("unreachable") ? "Evolution inacessível" : "Instância desconectada"}
                </Badge>
              )}
              {status && !status.configured && (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" /> Não configurada
                </Badge>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["evolution-status"] })}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Instância</p>
              <p className="font-mono text-sm">{status?.instance ?? "—"}</p>
              {status?.instanceStatus && (
                <p className="text-xs text-muted-foreground mt-1">
                  Estado: <span className="font-medium">{status.instanceStatus}</span>
                </p>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Mensagens na fila</p>
              <p className="text-2xl font-bold">{status?.pendingMessages ?? 0}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Colaboradores vinculados</p>
              <p className="text-2xl font-bold">{status?.linkedNumbers ?? 0}</p>
            </div>
          </div>

          {status && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Segredos da integração</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {Object.entries(SECRET_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {status.secrets[key] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-mono text-xs">{key}</span>
                    <span className="text-muted-foreground text-xs">— {label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Os valores são cadastrados no cofre seguro do projeto (Project Settings → Secrets) e nunca aparecem no app.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label>Webhook (cadastre na Evolution API, evento messages.upsert)</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={status?.webhookUrl ?? ""} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => status && copy(status.webhookUrl, "URL do webhook")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Substitua <code>••••••</code> pelo valor do segredo <code>EVOLUTION_WEBHOOK_TOKEN</code> ao colar na Evolution.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border p-4">
            <Label>Testar envio</Label>
            <div className="flex items-center gap-2">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="55 21 99999-0000"
                inputMode="tel"
              />
              <Button
                onClick={sendTest}
                disabled={testing || !status?.configured || testPhone.replace(/\D/g, "").length < 10}
              >
                {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar teste
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Envia uma mensagem de teste real para o número informado, validando a Evolution API ponta-a-ponta.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como ativar</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="server">
              <AccordionTrigger>1. Subir a Evolution API v2</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <p>Hospede a Evolution API v2 no servidor da empresa (Docker recomendado) e crie a instância que será usada pela Marina.</p>
                <p>Anote a URL base, o nome da instância e a API key.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pairing">
              <AccordionTrigger>2. Conectar a instância ao WhatsApp (código de pareamento)</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <p>No WhatsApp do número corporativo: Aparelhos conectados → Conectar aparelho → "Conectar com número de telefone".</p>
                <p>Gere o código na Evolution (<code>POST /instance/connect/{"{instância}"}</code> com o número) e digite-o no WhatsApp. Não usamos QR code.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="webhook">
              <AccordionTrigger>3. Cadastrar o webhook</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <p>Na Evolution, configure o webhook da instância com a URL acima (substituindo o token) e habilite o evento <code>messages.upsert</code>.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="secrets">
              <AccordionTrigger>4. Cadastrar os 4 segredos no projeto</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <p>Em Project Settings → Secrets, cadastre: <code>EVOLUTION_API_URL</code>, <code>EVOLUTION_INSTANCE</code>, <code>EVOLUTION_API_KEY</code> e <code>EVOLUTION_WEBHOOK_TOKEN</code> (gere um valor aleatório forte para o token).</p>
                <p>Depois de salvar, clique em atualizar nesta tela — o checklist de segredos deve ficar todo verde.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              A API key e o token do webhook são segredos de infraestrutura: nunca os exponha em telas, logs ou mensagens.
              Colaboradores vinculam o próprio número em Configurações → WhatsApp, com código de 6 dígitos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EvolutionAPIConfig;
