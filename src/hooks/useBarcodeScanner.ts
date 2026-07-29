import { useCallback, useState } from 'react';
import { isNativeApp } from '@/lib/platform';
import { toast } from 'sonner';

/**
 * Leitor de QR Code / código de barras (ML Kit) no app nativo.
 * No navegador, retorna null e orienta o uso do aplicativo.
 */
export const useBarcodeScanner = () => {
  const [scanning, setScanning] = useState(false);

  const scan = useCallback(async (): Promise<string | null> => {
    if (!isNativeApp()) {
      toast.info('Leitor de código disponível apenas no aplicativo Arrow');
      return null;
    }
    setScanning(true);
    try {
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');

      const supported = await BarcodeScanner.isSupported();
      if (!supported.supported) {
        toast.error('Este aparelho não suporta a leitura de códigos');
        return null;
      }

      const permission = await BarcodeScanner.requestPermissions();
      if (permission.camera !== 'granted' && permission.camera !== 'limited') {
        toast.error('Permissão de câmera negada');
        return null;
      }

      const available = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!available.available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
      }

      const { barcodes } = await BarcodeScanner.scan();
      return barcodes?.[0]?.rawValue ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/cancel/i.test(message)) {
        console.error('[useBarcodeScanner] erro:', error);
        toast.error('Falha ao ler o código');
      }
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  return { scan, scanning, supported: isNativeApp() };
};
