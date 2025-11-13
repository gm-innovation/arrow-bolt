import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Download, Bell, Wifi, Zap, CheckCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const InstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { permission, requestPermission, isSupported } = usePushNotifications();
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Instalação não disponível",
        description: "Use o menu do navegador para instalar o app (Compartilhar → Adicionar à Tela Inicial)",
        variant: "default",
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast({
        title: "App instalado!",
        description: "O Aqua Task Tracker foi adicionado à sua tela inicial",
      });
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast({
        title: "Notificações ativadas!",
        description: "Você receberá alertas de novas tarefas e atualizações",
      });
    } else {
      toast({
        title: "Permissão negada",
        description: "Você pode ativar notificações nas configurações do navegador",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Instale o App</h1>
        <p className="text-muted-foreground text-lg">
          Use o Aqua Task Tracker como um app nativo no seu celular
        </p>
      </div>

      {isInstalled && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle className="text-green-600">App Instalado!</CardTitle>
            </div>
            <CardDescription className="text-green-700 dark:text-green-400">
              O Aqua Task Tracker está instalado no seu dispositivo
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Como instalar
          </CardTitle>
          <CardDescription>
            Siga os passos abaixo para instalar o app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </div>
              <div>
                <p className="font-medium">No iPhone (Safari)</p>
                <p className="text-sm text-muted-foreground">
                  Toque no botão de compartilhar e selecione "Adicionar à Tela Inicial"
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
              <div>
                <p className="font-medium">No Android (Chrome)</p>
                <p className="text-sm text-muted-foreground">
                  Toque no menu (⋮) e selecione "Instalar app" ou "Adicionar à tela inicial"
                </p>
              </div>
            </div>
          </div>

          {deferredPrompt && !isInstalled && (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Instalar Agora
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Receba alertas de novas tarefas e atualizações mesmo fora do app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
                {permission === 'granted' ? 'Ativadas' : 
                 permission === 'denied' ? 'Bloqueadas' : 'Desativadas'}
              </Badge>
            </div>
          </div>

          {isSupported && permission !== 'granted' && (
            <Button 
              onClick={handleEnableNotifications} 
              variant="outline"
              className="w-full"
            >
              <Bell className="mr-2 h-4 w-4" />
              Ativar Notificações
            </Button>
          )}

          {!isSupported && (
            <p className="text-sm text-muted-foreground">
              Notificações não são suportadas neste navegador
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <Wifi className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Funciona Offline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Acesse suas tarefas mesmo sem conexão com a internet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Carrega Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Abra o app instantaneamente, como um aplicativo nativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Bell className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Receba alertas em tempo real de novas tarefas e atualizações
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstallApp;
