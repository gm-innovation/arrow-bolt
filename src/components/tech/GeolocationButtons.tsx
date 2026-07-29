import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MapPin, LogIn, LogOut, Navigation, Loader2, Camera } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNativeCamera } from '@/hooks/useNativeCamera';

interface GeolocationButtonsProps {
  taskId?: string;
  showCheckIn?: boolean;
  showCheckOut?: boolean;
  showTracking?: boolean;
  /** Permite anexar uma foto ao registrar check-in/check-out */
  allowPhoto?: boolean;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
}

export const GeolocationButtons = ({
  taskId,
  showCheckIn = true,
  showCheckOut = true,
  showTracking = false,
  allowPhoto = true,
  onCheckIn,
  onCheckOut,
}: GeolocationButtonsProps) => {
  const { checkIn, checkOut, trackLocation, loading, latitude, longitude, error } = useGeolocation();
  const { takePhoto, capturing } = useNativeCamera();
  const [showConfirm, setShowConfirm] = useState<'check_in' | 'check_out' | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; previewUrl: string } | null>(null);

  const handleTakePhoto = async () => {
    const captured = await takePhoto('camera');
    if (captured) setPhoto({ blob: captured.blob, previewUrl: captured.previewUrl });
  };

  const closeDialog = () => {
    setShowConfirm(null);
    setPhoto(null);
  };

  const handleCheckIn = async () => {
    const currentPhoto = photo?.blob ?? null;
    closeDialog();
    const result = await checkIn(taskId, currentPhoto);
    if (result && onCheckIn) {
      onCheckIn();
    }
  };

  const handleCheckOut = async () => {
    const currentPhoto = photo?.blob ?? null;
    closeDialog();
    const result = await checkOut(taskId, currentPhoto);
    if (result && onCheckOut) {
      onCheckOut();
    }
  };


  const handleTrack = async () => {
    await trackLocation(taskId);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {showCheckIn && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm('check_in')}
            disabled={loading}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Check-in
          </Button>
        )}

        {showCheckOut && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm('check_out')}
            disabled={loading}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Check-out
          </Button>
        )}

        {showTracking && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTrack}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="mr-2 h-4 w-4" />
            )}
            Registrar Local
          </Button>
        )}
      </div>

      {latitude && longitude && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>
            Última localização: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
        </div>
      )}

      {error && (
        <Badge variant="destructive" className="text-xs">
          {error}
        </Badge>
      )}

      {/* Check-in Confirmation */}
      <AlertDialog open={showConfirm === 'check_in'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Check-in</AlertDialogTitle>
            <AlertDialogDescription>
              Sua localização atual será registrada como ponto de entrada para esta tarefa.
              Certifique-se de estar no local correto.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {allowPhoto && (
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={handleTakePhoto} disabled={capturing}>
                {capturing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                {photo ? 'Trocar foto' : 'Anexar foto (opcional)'}
              </Button>
              {photo && (
                <img
                  src={photo.previewUrl}
                  alt="Pré-visualização da foto do check-in"
                  className="h-32 w-full rounded-md object-cover"
                />
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckIn} className="bg-green-600 hover:bg-green-700">
              Confirmar Check-in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Check-out Confirmation */}
      <AlertDialog open={showConfirm === 'check_out'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Check-out</AlertDialogTitle>
            <AlertDialogDescription>
              Sua localização atual será registrada como ponto de saída para esta tarefa.
              Certifique-se de ter concluído todos os procedimentos necessários.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {allowPhoto && (
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={handleTakePhoto} disabled={capturing}>
                {capturing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                {photo ? 'Trocar foto' : 'Anexar foto (opcional)'}
              </Button>
              {photo && (
                <img
                  src={photo.previewUrl}
                  alt="Pré-visualização da foto do check-out"
                  className="h-32 w-full rounded-md object-cover"
                />
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckOut} className="bg-red-600 hover:bg-red-700">
              Confirmar Check-out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>

      </AlertDialog>
    </div>
  );
};
