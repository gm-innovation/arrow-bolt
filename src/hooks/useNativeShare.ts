import { useCallback } from 'react';
import { isNativeApp } from '@/lib/platform';
import { toast } from 'sonner';

/** Compartilhamento nativo de textos, links e arquivos (fallback: Web Share API / cópia). */
export const useNativeShare = () => {
  const shareText = useCallback(async (title: string, text: string, url?: string) => {
    try {
      if (isNativeApp()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title, text, url, dialogTitle: title });
        return true;
      }
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return true;
      }
      await navigator.clipboard.writeText(url ? `${text} ${url}` : text);
      toast.success('Conteúdo copiado');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/abort|cancel/i.test(message)) {
        console.error('[useNativeShare] erro:', error);
        toast.error('Não foi possível compartilhar');
      }
      return false;
    }
  }, []);

  /** Compartilha um arquivo (ex.: PDF de relatório) salvando temporariamente no dispositivo. */
  const shareFile = useCallback(async (fileName: string, blob: Blob, title = 'Compartilhar') => {
    try {
      if (isNativeApp()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const saved = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });

        await Share.share({ title, files: [saved.uri], dialogTitle: title });
        return true;
      }

      const file = new File([blob], fileName, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, files: [file] });
        return true;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/abort|cancel/i.test(message)) {
        console.error('[useNativeShare] erro ao compartilhar arquivo:', error);
        toast.error('Não foi possível compartilhar o arquivo');
      }
      return false;
    }
  }, []);

  return { shareText, shareFile };
};
