import { useCallback, useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNativeApp } from '@/lib/platform';
import { toast } from 'sonner';

export interface CapturedPhoto {
  /** Blob pronto para upload no storage */
  blob: Blob;
  /** URL local para preview */
  previewUrl: string;
  fileName: string;
  mimeType: string;
}

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return res.blob();
};

/**
 * Captura de fotos usando a câmera nativa quando disponível (Capacitor)
 * e caindo para `<input type="file" capture>` no navegador/PWA.
 */
export const useNativeCamera = () => {
  const [capturing, setCapturing] = useState(false);

  const pickFromWeb = useCallback(
    (source: 'camera' | 'gallery'): Promise<CapturedPhoto | null> =>
      new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        if (source === 'camera') input.setAttribute('capture', 'environment');
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return resolve(null);
          resolve({
            blob: file,
            previewUrl: URL.createObjectURL(file),
            fileName: file.name || `foto-${Date.now()}.jpg`,
            mimeType: file.type || 'image/jpeg',
          });
        };
        input.oncancel = () => resolve(null);
        input.click();
      }),
    []
  );

  const takePhoto = useCallback(
    async (source: 'camera' | 'gallery' = 'camera'): Promise<CapturedPhoto | null> => {
      setCapturing(true);
      try {
        if (!isNativeApp()) {
          return await pickFromWeb(source);
        }

        const permission = await Camera.checkPermissions();
        if (permission.camera !== 'granted' && source === 'camera') {
          const req = await Camera.requestPermissions({ permissions: ['camera'] });
          if (req.camera !== 'granted') {
            toast.error('Permissão de câmera negada', {
              description: 'Habilite o acesso à câmera nas configurações do aparelho.',
            });
            return null;
          }
        }

        const photo = await Camera.getPhoto({
          quality: 70,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
          correctOrientation: true,
          width: 1600,
        });

        if (!photo.dataUrl) return null;
        const blob = await dataUrlToBlob(photo.dataUrl);
        return {
          blob,
          previewUrl: photo.dataUrl,
          fileName: `foto-${Date.now()}.${photo.format || 'jpg'}`,
          mimeType: blob.type || `image/${photo.format || 'jpeg'}`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/cancel/i.test(message)) {
          console.error('[useNativeCamera] erro ao capturar foto:', error);
          toast.error('Não foi possível capturar a foto');
        }
        return null;
      } finally {
        setCapturing(false);
      }
    },
    [pickFromWeb]
  );

  return { takePhoto, capturing };
};
