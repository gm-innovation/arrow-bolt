import { TaskReport } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

type PhotoWithCaption = {
  file: File;
  caption: string;
};

export type PhotosSectionProps = {
  taskId: string;
  photos: PhotoWithCaption[];
  onUpdatePhotos: (taskId: string, photos: PhotoWithCaption[]) => void;
};

export const PhotosSection = ({ taskId, photos, onUpdatePhotos }: PhotosSectionProps) => {
  const handlePhotoUpload = (caption: string, files: FileList | null) => {
    if (!files) return;

    const newPhotos = Array.from(files).map((file) => ({
      file,
      caption,
    }));

    onUpdatePhotos(taskId, [...photos, ...newPhotos]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Foto do Equipamento</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoUpload("Equipamento", e.target.files)}
          />
        </div>
        <div className="space-y-2">
          <Label>Foto da Placa de Identificação</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoUpload("Placa de Identificação", e.target.files)}
          />
        </div>
        <div className="space-y-2">
          <Label>Foto do Problema Encontrado</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoUpload("Problema Encontrado", e.target.files)}
          />
        </div>
        <div className="space-y-2">
          <Label>Foto do Serviço Executado</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoUpload("Serviço Executado", e.target.files)}
          />
        </div>
      </div>

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative">
              <img
                src={URL.createObjectURL(photo.file)}
                alt={photo.caption}
                className="w-full aspect-square object-cover rounded-md"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm rounded-b-md">
                {photo.caption}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};