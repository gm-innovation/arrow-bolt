import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChannelIdentity {
  id: string;
  external_id: string;
  verified: boolean;
  linked_at: string | null;
}

const fmtPhone = (digits: string) =>
  digits && digits.length >= 12
    ? `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, digits.length - 4)}-${digits.slice(-4)}`
    : digits || "—";

/**
 * Status do WhatsApp da Marina (somente leitura).
 * A Marina reconhece o colaborador automaticamente pelo número cadastrado
 * no RH — não há código de vinculação. Se o número estiver errado ou
 * ausente, o colaborador deve pedir a correção ao RH.
 */
export function WhatsAppLinkCard() {
  const { user, profile } = useAuth();

  const { data: identity, isLoading } = useQuery({
    queryKey: ["channel-identity", user?.id, "whatsapp"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("channel_identities")
        .select("id, external_id, verified, linked_at")
        .eq("channel", "whatsapp")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ChannelIdentity | null;
    },
  });

  const profilePhone = (profile as any)?.phone as string | undefined;
  const linked = !!identity?.verified;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> WhatsApp da Marina
        </CardTitle>
        <CardDescription>
          Fale com a Marina pelo WhatsApp com as mesmas permissões do seu perfil.
          Ela reconhece você automaticamente pelo número cadastrado no RH — não é preciso nenhum código.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {linked ? (
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                <span className="font-medium">
                  {fmtPhone(identity?.external_id ?? profilePhone?.replace(/\D/g, "") ?? "")}
                </span>
                {linked ? (
                  <Badge variant="secondary">Reconhecido pela Marina</Badge>
                ) : (
                  <Badge variant="outline">Aguardando primeiro contato</Badge>
                )}
              </div>
            </div>
            {linked && identity?.linked_at && (
              <p className="text-xs text-muted-foreground">
                Primeiro contato em {format(new Date(identity.linked_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {profilePhone
                ? "Este é o número do seu cadastro. Se ele mudou ou está incorreto, peça a atualização ao RH."
                : "Seu cadastro não tem número de WhatsApp. Procure o RH para cadastrar e poder falar com a Marina."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WhatsAppLinkCard;
