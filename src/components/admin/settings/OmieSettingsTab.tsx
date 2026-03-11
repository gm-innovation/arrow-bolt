import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useOmieIntegration } from "@/hooks/useOmieIntegration";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Save, Plug, Users } from "lucide-react";

export const OmieSettingsTab = () => {
  const {
    companyOmie,
    isLoadingConfig,
    hasCredentials,
    saveCredentials,
    testConnection,
    syncClients,
  } = useOmieIntegration();

  const [appKey, setAppKey] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (companyOmie) {
      setAppKey(companyOmie.omie_app_key || "");
      setAppSecret(companyOmie.omie_app_secret || "");
      setSyncEnabled(companyOmie.omie_sync_enabled || false);
    }
  }, [companyOmie]);

  const handleSave = () => {
    saveCredentials.mutate({
      app_key: appKey,
      app_secret: appSecret,
      sync_enabled: syncEnabled,
    });
  };

  const handleTestConnection = async () => {
    try {
      await testConnection.mutateAsync();
      setConnectionStatus("success");
    } catch {
      setConnectionStatus("error");
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Integração Omie ERP
              </CardTitle>
              <CardDescription>
                Conecte ao Omie para sincronizar clientes, ordens de serviço e enviar relatórios
              </CardDescription>
            </div>
            {hasCredentials && (
              <Badge variant={connectionStatus === "success" ? "default" : connectionStatus === "error" ? "destructive" : "secondary"}>
                {connectionStatus === "success" && <><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</>}
                {connectionStatus === "error" && <><XCircle className="h-3 w-3 mr-1" /> Erro</>}
                {connectionStatus === "idle" && "Não testado"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="omie-sync">Sincronização Omie</Label>
              <p className="text-sm text-muted-foreground">
                Ativar integração com o Omie ERP
              </p>
            </div>
            <Switch
              id="omie-sync"
              checked={syncEnabled}
              disabled={saveCredentials.isPending}
              onCheckedChange={(checked) => {
                setSyncEnabled(checked);
                saveCredentials.mutate({
                  app_key: appKey,
                  app_secret: appSecret,
                  sync_enabled: checked,
                });
              }}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="omie-app-key">App Key</Label>
              <Input
                id="omie-app-key"
                value={appKey}
                onChange={(e) => setAppKey(e.target.value)}
                placeholder="Cole sua App Key do Omie"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="omie-app-secret">App Secret</Label>
              <Input
                id="omie-app-secret"
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="Cole seu App Secret do Omie"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Encontre suas credenciais no Omie em: Configurações → Integrações → API
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saveCredentials.isPending}>
              {saveCredentials.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Credenciais
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={!appKey || !appSecret || testConnection.isPending}
            >
              {testConnection.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sincronização de Clientes
          </CardTitle>
          <CardDescription>
            Importe clientes do Omie para o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => syncClients.mutate()}
            disabled={!hasCredentials || syncClients.isPending}
          >
            {syncClients.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizar Clientes Agora
          </Button>
          {!hasCredentials && (
            <p className="text-sm text-muted-foreground mt-2">
              Configure as credenciais acima antes de sincronizar
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
