import { Capacitor } from '@capacitor/core';

/** Verdadeiro quando o app está rodando dentro do container nativo (APK/IPA). */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

/** 'android' | 'ios' | 'web' */
export const getPlatform = (): string => Capacitor.getPlatform();

export const isAndroid = (): boolean => getPlatform() === 'android';
export const isIOS = (): boolean => getPlatform() === 'ios';

/** Verdadeiro quando rodando como PWA instalada (standalone) no navegador. */
export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

/** Checa se um plugin nativo está disponível no runtime atual. */
export const isPluginAvailable = (name: string): boolean =>
  Capacitor.isPluginAvailable(name);
