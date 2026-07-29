import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuração do app nativo Arrow (Android/iOS via Capacitor).
 *
 * O bloco `server.url` habilita hot-reload apontando para o sandbox da Lovable.
 * Para gerar o APK de produção, REMOVA (ou comente) o bloco `server` para que o
 * app use os arquivos empacotados em `dist/`.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.4cb88575f5074382bc47b7a5cefd825f',
  appName: 'Arrow',
  webDir: 'dist',
  server: {
    url: 'https://4cb88575-f507-4382-bc47-b7a5cefd825f.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0EA5E9',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,

    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
