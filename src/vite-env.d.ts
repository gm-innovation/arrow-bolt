/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Versão semântica do bundle web (vem da tag Git no build de release). */
declare const __BUNDLE_VERSION__: string;
/** Build nativo embutido no APK — incrementado só quando algo nativo muda. */
declare const __NATIVE_BUILD__: number;

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: any) => void;
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
