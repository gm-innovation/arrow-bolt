import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

// Minimal typed shim for the beta supabase.auth.oauth namespace.
type OAuthResult = {
  data: {
    client?: { name?: string; client_name?: string; client_uri?: string; redirect_uris?: string[] };
    scope?: string;
    scopes?: string[];
    redirect_url?: string;
    redirect_to?: string;
  } | null;
  error: { message: string } | null;
};
type SupabaseOAuth = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauthApi = (supabase.auth as unknown as { oauth: SupabaseOAuth }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthResult["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Solicitação de autorização inválida (authorization_id ausente).");
        setLoading(false);
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou uma URL de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Não foi possível carregar essa autorização</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>Voltar</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "um aplicativo";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Conectar {clientName} ao Arrow</CardTitle>
          <CardDescription>
            {clientName} poderá usar as ferramentas do Arrow como você, respeitando suas permissões e políticas de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Isso não ignora as permissões do Arrow — os dados acessíveis continuam limitados ao seu perfil.</p>
          {details?.client?.redirect_uris?.[0] && (
            <p className="text-xs break-all">
              Redirecionamento: <code>{details.client.redirect_uris[0]}</code>
            </p>
          )}
        </CardContent>
        <CardFooter className="flex gap-2 justify-end">
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
            Cancelar
          </Button>
          <Button disabled={busy} onClick={() => decide(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Autorizar"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
