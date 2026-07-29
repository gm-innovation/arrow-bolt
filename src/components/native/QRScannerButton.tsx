import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2 } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface QRScannerButtonProps {
  onScan: (value: string) => void;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/** Botão de leitura de QR Code / código de barras (ativos, EPIs, instrumentos). */
export const QRScannerButton = ({
  onScan,
  label = 'Ler código',
  variant = 'outline',
  size = 'sm',
  className,
}: QRScannerButtonProps) => {
  const { scan, scanning } = useBarcodeScanner();
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
    setBusy(true);
    const value = await scan();
    setBusy(false);
    if (value) onScan(value);
  }, [scan, onScan]);

  return (
    <Button variant={variant} size={size} onClick={handleClick} disabled={busy || scanning} className={className}>
      {busy || scanning ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <QrCode className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
};
