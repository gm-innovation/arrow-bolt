import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, Loader2, Mail, MessageCircle, Smartphone } from "lucide-react";
import {
  NOTIFICATION_TYPE_LABELS,
  useNotificationPreferences,
} from "@/hooks/useNotificationPreferences";

const NotificationPreferencesCard = () => {
  const { preferences, isLoading, savePreferences } = useNotificationPreferences();

  const [inApp, setInApp] = useState(true);
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [phone, setPhone] = useState("");
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [muted, setMuted] = useState<string[]>([]);

  useEffect(() => {
    if (isLoading) return;
    setInApp(preferences.in_app_enabled);
    setPush(preferences.push_enabled);
    setEmail(preferences.email_enabled);
    setWhatsapp(preferences.whatsapp_enabled);
    setPhone(preferences.whatsapp_phone ?? "");
    setQuietStart(preferences.quiet_hours_start != null ? String(preferences.quiet_hours_start) : "");
    setQuietEnd(preferences.quiet_hours_end != null ? String(preferences.quiet_hours_end) : "");
    setMuted(preferences.muted_types ?? []);
  }, [isLoading, preferences]);

  const toggleMuted = (type: string) => {
    setMuted((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const handleSave = () => {
    savePreferences.mutate({
      in_app_enabled: inApp,
      push_enabled: push,
      email_enabled: email,
      whatsapp_enabled: whatsapp,
      whatsapp_phone: phone.trim() || null,
      quiet_hours_start: quietStart === "" ? null : Number(quietStart),
      quiet_hours_end: quietEnd === "" ? null : Number(quietEnd),
      muted_types: muted,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" /> Notificações
        </CardTitle>
        <CardDescription>
          Escolha por quais canais você quer receber os avisos do Arrow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="flex items-center gap-2"><Bell className="h-4 w-4" /> No sistema</Label>
              <p className="text-xs text-muted-foreground">Sino de notificações dentro do Arrow.</p>
            </div>
            <Switch checked={inApp} onCheckedChange={setInApp} aria-label="Notificações no sistema" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> Push (app/PWA)</Label>
              <p className="text-xs text-muted-foreground">Avisos no celular mesmo com o app fechado.</p>
            </div>
            <Switch checked={push} onCheckedChange={setPush} aria-label="Notificações push" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> E-mail
                <Badge variant="secondary">requer domínio de envio</Badge>
              </Label>
              <p className="text-xs text-muted-foreground">
                Enviado para o e-mail da sua conta assim que o domínio de envio da empresa for configurado.
              </p>
            </div>
            <Switch checked={email} onCheckedChange={setEmail} aria-label="Notificações por e-mail" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</Label>
              <p className="text-xs text-muted-foreground">Somente avisos operacionais importantes.</p>
            </div>
            <Switch checked={whatsapp} onCheckedChange={setWhatsapp} aria-label="Notificações por WhatsApp" />
          </div>

          {whatsapp && (
            <div className="max-w-xs">
              <Label htmlFor="whatsapp_phone">Número do WhatsApp</Label>
              <Input
                id="whatsapp_phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 21 99999-9999"
              />
            </div>
          )}
        </div>

        <Separator />

        <div>
          <Label>Horário de silêncio (opcional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Nesse intervalo, push, e-mail e WhatsApp ficam pausados — os avisos continuam no sino do sistema.
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              max={23}
              value={quietStart}
              onChange={(e) => setQuietStart(e.target.value)}
              placeholder="22"
              className="w-24"
              aria-label="Início do horário de silêncio"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="number"
              min={0}
              max={23}
              value={quietEnd}
              onChange={(e) => setQuietEnd(e.target.value)}
              placeholder="7"
              className="w-24"
              aria-label="Fim do horário de silêncio"
            />
            <span className="text-sm text-muted-foreground">horas</span>
          </div>
        </div>

        <Separator />

        <div>
          <Label>Tipos de aviso silenciados</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Clique para silenciar completamente um tipo de aviso.
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(NOTIFICATION_TYPE_LABELS).map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleMuted(type)}
                aria-pressed={muted.includes(type)}
              >
                <Badge variant={muted.includes(type) ? "destructive" : "outline"}>{label}</Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={savePreferences.isPending}>
            {savePreferences.isPending ? "Salvando..." : "Salvar preferências"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferencesCard;
