import { useEffect, useRef, useState } from "react";
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
  KeyRound,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  Shuffle,
  Database,
  Server,
} from "lucide-react";
import { toast } from "sonner";

interface WebhookInfo {
  url: string | null;
  enabled: boolean | null;
  events: string[];
  error?: string;
}

interface InboundEvent {
  created_at: string;
  external_id: string | null;
  push_name: string | null;
  is_group: boolean;
  message_kind: string | null;
  outcome: string;
  body_preview: string | null;
}

interface EvolutionStatus {
  configured: boolean;
  source: "database" | "env" | "none";
  secrets: Record<string, boolean>;
  instance: string | null;
  apiUrl: string | null;
  webhookUrl: string;
  instanceStatus: string | null;
  webhook: WebhookInfo | null;
  recentEvents: InboundEvent[];
  pendingMessages: number;
  linkedNumbers: number;
}

const OUTCOME_LABELS: Record<string, string> = {
  accepted: "Atendida pela Marina",
  deduplicated: "Repetida (ignorada)",
  ignored_empty: "Sem conteúdo legível",
  ignored_event: "Evento não tratado",
  ignored_broadcast: "Status/broadcast",
  ignored_group_without_mention: "Grupo, sem mencionar a Marina",
  refused_unknown_number: "Número não cadastrado",
  refused_inactive_employee: "Colaborador inativo",
  audio_transcription_failed: "Áudio não compreendido",
  audio_download_failed: "Áudio não baixado",
  image_download_failed: "Imagem não baixada",
  image_too_large: "Imagem acima de 5 MB",
  unsupported_media: "Tipo de arquivo não suportado",
};


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
  const [pairPhone, setPairPhone] = useState("");
  const [pairing, setPairing] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [webhookOk, setWebhookOk] = useState<boolean | null>(null);

  const [cfgApiUrl, setCfgApiUrl] = useState("");
  const [cfgInstance, setCfgInstance] = useState("");
  const [cfgApiKey, setCfgApiKey] = useState("");
  const [cfgToken, setCfgToken] = useState("");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revealedWebhookUrl, setRevealedWebhookUrl] = useState<string | null>(null);
  const hydrated = useRef(false);

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

  // Preenche URL/instância uma única vez, quando o status chega.
  useEffect(() => {
    if (!hydrated.current && status) {
      setCfgApiUrl(status.apiUrl ?? "");
      setCfgInstance(status.instance ?? "");
      hydrated.current = true;
    }
  }, [status]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const generateToken = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    setCfgToken(hex);
    setTokenVisible(true);
    toast.success("Token gerado — ele será salvo ao clicar em Salvar credenciais.");
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-config", {
        body: {
          action: "save_config",
          apiUrl: cfgApiUrl,
          instance: cfgInstance,
          apiKey: cfgApiKey,
          webhookToken: cfgToken,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.webhookUrl) setRevealedWebhookUrl(data.webhookUrl as string);
      setCfgApiKey("");
      setCfgToken("");
      setTokenVisible(false);
      queryClient.invalidateQueries({ queryKey: ["evolution-status"] });
      toast.success("Credenciais salvas com criptografia.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar as credenciais");
    } finally {
      setSaving(false);
    }
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

  const generatePairing = async () => {
    setPairing(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-config", {
        body: { action: "pairing_code", phone: pairPhone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPairingCode(data.pairingCode);
      setWebhookOk(data.webhookConfigured ?? null);
      toast.success("Código gerado — digite-o no WhatsApp do número corporativo.");
    } catch (e) {
      setPairingCode(null);
      setWebhookOk(null);
      toast.error(e instanceof Error ? e.message : "Falha ao gerar o código de pareamento");
    } finally {
      setPairing(false);
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

          {/* ----- Credenciais editáveis ----- */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-sm font-medium">Credenciais da Evolution</Label>
              {status && status.source !== "none" && (
                <Badge variant="outline" className="text-xs">
                  {status.source === "database" ? (
                    <><Database className="h-3 w-3 mr-1" /> Fonte: esta tela (banco criptografado)</>
                  ) : (
                    <><Server className="h-3 w-3 mr-1" /> Fonte: variáveis de ambiente</>
                  )}
                </Badge>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">URL da Evolution API</Label>
                <Input
                  value={cfgApiUrl}
                  onChange={(e) => setCfgApiUrl(e.target.value)}
                  placeholder="https://evo.seudominio.com"
                  inputMode="url"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nome da instância</Label>
                <Input
                  value={cfgInstance}
                  onChange={(e) => setCfgInstance(e.target.value)}
                  placeholder="marina-lecsor"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">API key</Label>
                <Input
                  type="password"
                  value={cfgApiKey}
                  onChange={(e) => setCfgApiKey(e.target.value)}
                  placeholder={status?.secrets?.EVOLUTION_API_KEY ? "•••••••• cadastrada — deixe em branco para manter" : "API key global ou da instância"}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Token do webhook</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={tokenVisible ? "text" : "password"}
                    value={cfgToken}
                    onChange={(e) => setCfgToken(e.target.value)}
                    placeholder={status?.secrets?.EVOLUTION_WEBHOOK_TOKEN ? "•••••••• cadastrado — deixe em branco para manter" : "Valor aleatório forte"}
                    autoComplete="new-password"
                    className="font-mono text-xs"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={generateToken}>
                    <Shuffle className="h-4 w-4 mr-1" /> Gerar
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">
                API key e token em branco mantêm o valor atual. Os valores são criptografados antes de gravar e nunca voltam em texto puro.
              </p>
              <Button
                onClick={saveConfig}
                disabled={saving || !cfgApiUrl.trim() || !cfgInstance.trim()}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar credenciais
              </Button>
            </div>
          </div>

          {revealedWebhookUrl && (
            <div className="rounded-lg border border-green-300 bg-green-50 p-3 space-y-2 dark:border-green-900 dark:bg-green-950">
              <p className="text-sm font-medium text-green-900 dark:text-green-200">
                Token salvo. Cadastre esta URL completa na Evolution agora — ela não será exibida novamente:
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={revealedWebhookUrl} className="font-mono text-xs bg-background" />
                <Button variant="outline" size="icon" onClick={() => copy(revealedWebhookUrl, "URL do webhook")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Evento a habilitar: <code>messages.upsert</code>.</p>
            </div>
          )}

          {status && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Checklist da integração</p>
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
                As credenciais são gerenciadas no card acima e ficam criptografadas no banco. Variáveis de ambiente
                (Cloud → Secrets) seguem como fallback legado.
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
              O token fica mascarado por segurança — a URL completa aparece uma única vez, ao salvar um novo token.
            </p>
          </div>

          {/* ----- Diagnóstico: webhook na instância + últimas chegadas ----- */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Diagnóstico do recebimento</Label>
            </div>

            {status?.webhook ? (
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded border p-2">
                  <p className="text-muted-foreground">Webhook configurado na instância</p>
                  <p className="font-mono break-all">{status.webhook.url ?? "não configurado"}</p>
                </div>
                <div className="rounded border p-2 space-y-1">
                  <p className="text-muted-foreground">Estado do webhook</p>
                  <div className="flex items-center gap-2">
                    {status.webhook.enabled ? (
                      <Badge className="bg-green-600 text-[10px]">ativo</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">inativo</Badge>
                    )}
                    <span className="font-mono">
                      {status.webhook.events.length > 0 ? status.webhook.events.join(", ") : "sem eventos"}
                    </span>
                  </div>
                  {status.webhook.error && (
                    <p className="text-amber-600 dark:text-amber-400">Falha ao consultar: {status.webhook.error}</p>
                  )}
                  {!status.webhook.error &&
                    !status.webhook.events.some((e) => e.toUpperCase() === "MESSAGES_UPSERT") && (
                      <p className="text-amber-600 dark:text-amber-400">
                        O evento MESSAGES_UPSERT não está habilitado — mensagens não chegam. Gere o código de
                        pareamento novamente para reconfigurar.
                      </p>
                    )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cadastre as credenciais para consultar o webhook configurado na instância.
              </p>
            )}

            <div className="space-y-1">
              <p className="text-xs font-medium">Últimas mensagens recebidas (inclusive descartadas)</p>
              {(status?.recentEvents ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma chegada registrada ainda. Se um colaborador disser que a mensagem não chegou e nada
                  aparecer aqui, o problema está antes do Arrow (webhook/Evolution).
                </p>
              ) : (
                <div className="max-h-64 overflow-auto rounded border divide-y">
                  {(status?.recentEvents ?? []).map((ev, i) => (
                    <div key={`${ev.created_at}-${i}`} className="p-2 text-xs space-y-0.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono">
                          {ev.external_id ?? "—"}
                          {ev.push_name ? ` · ${ev.push_name}` : ""}
                          {ev.is_group ? " · grupo" : ""}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{ev.message_kind ?? "?"}</Badge>
                          <Badge
                            variant={ev.outcome === "accepted" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {OUTCOME_LABELS[ev.outcome] ?? ev.outcome}
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(ev.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                          </span>
                        </div>
                      </div>
                      {ev.body_preview && (
                        <p className="text-muted-foreground line-clamp-2">{ev.body_preview}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


          <div className="space-y-2 rounded-lg border p-4">
            <Label>Conectar instância ao WhatsApp</Label>
            {!status?.configured ? (
              <p className="text-xs text-muted-foreground">
                Cadastre e salve as credenciais acima para liberar o pareamento da instância.
              </p>
            ) : connected ? (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Instância já conectada ao WhatsApp — não é preciso novo código.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    value={pairPhone}
                    onChange={(e) => setPairPhone(e.target.value)}
                    placeholder="55 21 99999-0000 (número corporativo)"
                    inputMode="tel"
                  />
                  <Button
                    onClick={generatePairing}
                    disabled={pairing || pairPhone.replace(/\D/g, "").length < 10}
                  >
                    {pairing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                    Gerar código de pareamento
                  </Button>
                </div>
                {pairingCode ? (
                  <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Digite este código no WhatsApp do número corporativo (expira em ~60 segundos):
                    </p>
                    <p className="text-3xl font-mono font-bold tracking-[0.3em]">{pairingCode}</p>
                    <p className="text-xs text-muted-foreground">
                      Aparelhos conectados → Conectar aparelho → Conectar com número de telefone
                    </p>
                    <Button variant="outline" size="sm" onClick={generatePairing} disabled={pairing}>
                      {pairing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Gerar novamente
                    </Button>
                    {webhookOk === true && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Webhook da instância configurado automaticamente para a Marina receber as mensagens.
                      </p>
                    )}
                    {webhookOk === false && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Não foi possível configurar o webhook automaticamente — cadastre-o manualmente (passo 3 do guia abaixo).
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Gera o código de 8 caracteres que vincula a instância ao WhatsApp corporativo (sem QR code).
                  </p>
                )}
              </>
            )}
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
            <AccordionItem value="credentials">
              <AccordionTrigger>2. Cadastrar as credenciais nesta tela</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <p>Preencha o card "Credenciais da Evolution" acima: URL, instância e API key vindos do servidor; para o token do webhook, clique em "Gerar".</p>
                <p>Ao salvar com um token novo, a URL completa do webhook é exibida uma única vez — copie-a para o passo 3.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="webhook">
              <AccordionTrigger>3. Cadastrar o webhook na Evolution</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <p>Na Evolution, configure o webhook da instância com a URL completa exibida ao salvar o token e habilite o evento <code>messages.upsert</code>.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pairing">
              <AccordionTrigger>4. Conectar a instância ao WhatsApp (código de pareamento)</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <p>Com as credenciais salvas, informe o número corporativo no campo "Conectar instância ao WhatsApp" e clique em "Gerar código de pareamento".</p>
                <p>No WhatsApp do número corporativo: Aparelhos conectados → Conectar aparelho → "Conectar com número de telefone" → digite o código exibido. Não usamos QR code.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              A API key e o token do webhook são segredos de infraestrutura: ficam criptografados no banco, nunca
              aparecem em texto puro após o salvamento e toda alteração é auditada.
              Colaboradores vinculam o próprio número em Configurações → Assistente → WhatsApp, com código de 6 dígitos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EvolutionAPIConfig;
