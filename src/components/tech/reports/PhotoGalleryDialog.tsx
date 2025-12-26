import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Image as ImageIcon } from "lucide-react";
import { PhotoWithCaption } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface PhotoGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: PhotoWithCaption[];
  initialIndex?: number;
}

export const PhotoGalleryDialog = ({
  open,
  onOpenChange,
  photos,
  initialIndex = 0,
}: PhotoGalleryDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  const currentPhoto = photos[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setZoom(1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setZoom(1);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const getPhotoUrl = (photo: PhotoWithCaption): string => {
    if (photo.file) {
      return URL.createObjectURL(photo.file);
    } else if (photo.storagePath) {
      const { data } = supabase.storage.from("reports").getPublicUrl(photo.storagePath);
      return data.publicUrl;
    }
    return "/placeholder.svg";
  };

  if (!currentPhoto || photos.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              {currentPhoto.caption}
              <span className="text-sm text-muted-foreground ml-2">
                ({currentIndex + 1} de {photos.length})
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoom >= 3}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex items-center justify-center w-full h-full pt-16 pb-24 overflow-auto bg-muted/50">
          {photos.length > 1 && (
            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 z-10"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          <div className="overflow-auto max-w-full max-h-full p-4">
            <img
              src={getPhotoUrl(currentPhoto)}
              alt={currentPhoto.caption}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                transition: "transform 0.2s ease-in-out",
              }}
              className="max-w-none"
            />
          </div>

          {photos.length > 1 && (
            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 z-10"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm p-4 border-t">
          {currentPhoto.description && (
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Descrição:</strong> {currentPhoto.description}
            </p>
          )}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((photo, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoom(1);
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                  idx === currentIndex ? "border-primary ring-2 ring-primary/50" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={getPhotoUrl(photo)}
                  alt={photo.caption}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const PhotoGalleryButton = ({
  photos,
  onOpenGallery,
}: {
  photos: PhotoWithCaption[];
  onOpenGallery: () => void;
}) => {
  if (photos.length === 0) return null;

  return (
    <Button variant="outline" onClick={onOpenGallery} className="gap-2">
      <ImageIcon className="h-4 w-4" />
      Ver Galeria ({photos.length} fotos)
    </Button>
  );
};
