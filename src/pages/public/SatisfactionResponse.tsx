import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Smile, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

type PageState = "loading" | "invalid" | "already" | "inactive" | "form" | "submitting" | "success";

interface InvitePayload {
  invite_id: string;
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  already_responded: boolean;
  collects_nps: boolean;
  collects_csat: boolean;
  collects_ces: boolean;
}

export default function SatisfactionResponse() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [error, setError] = useState<string>("");

  const [nps, setNps] = useState<number | null>(null);
  const [csat, setCsat] = useState<number | null>(null);
  const [ces, setCes] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("quality_get_invite_public" as any, {
        p_token: token,
      });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setState("invalid");
        return;
      }
      const row = (Array.isArray(data) ? data[0] : data) as InvitePayload;
      setInvite(row);
      if (row.already_responded) setState("already");
      else if (row.campaign_status !== "active") setState("inactive");
      else setState("form");
    })();
  }, [token]);

  const submit = async () => {
    const missing: string[] = [];
    if (invite?.collects_nps && nps == null) missing.push("NPS");
    if (invite?.collects_csat && csat == null) missing.push("CSAT");
    if (invite?.collects_ces && ces == null) missing.push("CES");
    if (missing.length) {
      setError(`Por favor, responda: ${missing.join(", ")}.`);
      return;
    }
    setError("");
    setState("submitting");
    const { error } = await supabase.rpc("quality_submit_satisfaction_response" as any, {
      p_token: token,
      p_nps: invite?.collects_nps ? nps : null,
      p_csat: invite?.collects_csat ? csat : null,
      p_ces: invite?.collects_ces ? ces : null,
      p_comment: comment || null,
      p_responder_name: name || null,
      p_responder_email: email || null,
    });
    if (error) {
      if (error.message?.includes("já respondida")) {
        setState("already");
      } else if (error.message?.includes("não está ativa")) {
        setState("inactive");
      } else if (error.message?.includes("Token")) {
        setState("invalid");
      } else {
        setError(error.message || "Erro ao enviar resposta.");
        setState("form");
      }
      return;
    }
    setState("success");
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-muted/30 px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );

  if (state === "loading") {
    return (
      <Wrapper>
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Carregando pesquisa...</p>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  if (state === "invalid") {
    return (
      <Wrapper>
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <XCircle className="h-12 w-12 text-destructive" />
            <h1 className="text-lg font-semibold">Link inválido ou expirado</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              Confira se você acessou o endereço correto. Se o problema persistir, entre em contato
              com quem enviou a pesquisa.
            </p>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  if (state === "already") {
    return (
      <Wrapper>
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <h1 className="text-lg font-semibold">Sua resposta já foi registrada</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              Obrigado pelo retorno! Cada pesquisa pode ser respondida uma única vez.
            </p>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  if (state === "inactive") {
    return (
      <Wrapper>
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <h1 className="text-lg font-semibold">Pesquisa encerrada</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              Esta pesquisa não está mais aceitando respostas. Agradecemos seu interesse.
            </p>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  if (state === "success") {
    return (
      <Wrapper>
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <h1 className="text-lg font-semibold">Resposta enviada!</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              Agradecemos seu tempo. Seu retorno nos ajuda a melhorar continuamente.
            </p>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  // form / submitting
  return (
    <Wrapper>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smile className="h-5 w-5 text-primary" />
            {invite?.campaign_name ?? "Pesquisa de satisfação"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Suas respostas são confidenciais e levam menos de 1 minuto.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Em uma escala de 0 a 10, quanto você nos recomendaria?</Label>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNps(i)}
                  className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                    nps === i
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Nada provável</span>
              <span>Muito provável</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Como você avalia sua satisfação geral?</Label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCsat(v)}
                  className={`h-12 rounded-md border text-base font-semibold transition-colors ${
                    csat === v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Muito insatisfeito</span>
              <span>Muito satisfeito</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comentário (opcional)</Label>
            <Textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="O que poderíamos melhorar?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nome (opcional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>E-mail (opcional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={submit} disabled={state === "submitting"} className="w-full" size="lg">
            {state === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...
              </>
            ) : (
              "Enviar resposta"
            )}
          </Button>
        </CardContent>
      </Card>
    </Wrapper>
  );
}
