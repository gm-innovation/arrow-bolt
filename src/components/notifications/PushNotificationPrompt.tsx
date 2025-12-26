import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushNotificationPromptProps {
  delay?: number; // Delay in ms before showing the prompt
}

export const PushNotificationPrompt = ({ delay = 3000 }: PushNotificationPromptProps) => {
  const { permission, requestPermission, isSupported, isLoading } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const wasDismissed = sessionStorage.getItem("pushPromptDismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Only show if supported and permission not yet decided
    if (isSupported && permission === "default" && !isLoading) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, isLoading, delay]);

  const handleEnable = async () => {
    await requestPermission();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem("pushPromptDismissed", "true");
  };

  if (!showPrompt || dismissed || permission !== "default") {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-4 shadow-lg border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold">Ativar notificações</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2 -mt-1"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Receba alertas sobre novas tarefas, alterações de agenda e atualizações importantes em tempo real.
            </p>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleEnable}>
                Ativar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Agora não
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
