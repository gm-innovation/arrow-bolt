import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2, Link2, Unlink, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChannelIdentity {
  id: string;
  external_id: string;
  verified: boolean;
  linked_at: string | null;
  verification_expires_at: string | null;
}

/** Vínculo do WhatsApp do colaborador com a Marina (código de 6 dígitos). */
export function WhatsAppLinkCard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState((profile as any)?.phone ?? "");
  const [code, setCode] = useState<string | null>(null);

  const { data: identity, isLoading } = useQuery({
    queryKey: ["channel-identity", user?.id, "whatsapp"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("channel_identities")
        .select("id, external_id, verified, linked_at, verification_expires_at")
        .eq("channel", "whatsapp")
        .maybeSingle();
      if (error) throw error;
      return data as ChannelIdentity | null;
    },
  });

  const startLink = useMutation({
    mutationFn: async () => {
      const digits = phone.replace(/\D/g, "");
      const { data, error } = await (supabase as any).rpc("channel_identities_start_link", {
        p_channel: "whatsapp",
        p_external_id: digits,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { verification_code: string; expires_at: string };
    },
    onSuccess: (row) => {
      setCode(row.verification_code);
      queryClient.invalidateQueries({ queryKey: ["channel-identity"] });
      toast({ title: "Código gerado", description: "Envie o código para o WhatsApp da Marina em até 15 minutos." });
    },
    onError: (e: any) => {
      const msg = String(e?.message ?? "");
      toast({
        title: "Não foi possível gerar o código",
        description: msg.includes("phone already linked")
          ? "Este número já está vinculado a outro colaborador."
          : msg.includes("invalid phone")
            ? "Informe um telefone válido com DDD (ex.: 21 99999-0000)."
            : msg,
        variant: "destructive",
      });
    },
  });

  const unlink = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("channel_identities")
        .delete()
        .eq("id", identity!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setCode(null);
      queryClient.invalidateQueries({ queryKey: ["channel-identity"] });
      toast({ title: "WhatsApp desvinculado" });
    },
    onError: (e: any) => toast({ title: "Erro ao desvincular", description: e.message, variant: "destructive" }),
  });

  const fmtPhone = (digits: string) =>
    digits.length >= 12
      ? `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, digits.length - 4)}-${digits.slice(-4)}`
      : digits;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> WhatsApp da Marina
        </CardTitle>
        <CardDescription>
          Fale com a Marina pelo WhatsApp com as mesmas permissões do seu perfil. O vínculo é feito por código de 6 dígitos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando vínculo...
          </div>
        ) : identity?.verified ? (
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span className="font-medium">{fmtPhone(identity.external_id)}</span>
                <Badge variant="secondary">Vinculado</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => unlink.mutate()}
                disabled={unlink.isPending}
              >
                {unlink.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlink className="h-4 w-4 mr-2" />}
                Desvincular
              </Button>
            </div>
            {identity.linked_at && (
              <p className="text-xs text-muted-foreground">
                Vinculado em {format(new Date(identity.linked_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Seu número de WhatsApp (com DDD)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="21 99999-0000"
                inputMode="tel"
              />
            </div>
            <Button
              onClick={() => startLink.mutate()}
              disabled={startLink.isPending || phone.replace(/\D/g, "").length < 10}
            >
              {startLink.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              Gerar código de vinculação
            </Button>
            {code && (
              <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Envie este código para o WhatsApp da Marina em até 15 minutos:
                </p>
                <p className="text-3xl font-mono font-bold tracking-[0.4em]">{code}</p>
                <p className="text-xs text-muted-foreground">
                  O número aparece nas Configurações da empresa assim que a integração for ativada.
                </p>
              </div>
            )}
            {identity && !identity.verified && !code && (
              <p className="text-xs text-muted-foreground">
                Há uma vinculação pendente para {fmtPhone(identity.external_id)} — gere um novo código para concluir.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WhatsAppLinkCard;
