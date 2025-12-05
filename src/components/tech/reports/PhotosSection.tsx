import React from "react";
import { TaskReport, PhotoWithCaption } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export type PhotosSectionProps = {
  taskId: string;
  photos: PhotoWithCaption[];
  onUpdatePhotos: (taskId: string, photos: PhotoWithCaption[]) => void;
  requiredPhotoLabels?: string[];
};

type PhotoItemProps = {
  photo: PhotoWithCaption;
  index: number;
  onUpdateDescription: (index: number, description: string) => void;
  onRemove: (index: number) => void;
};

const PhotoItem = ({ photo, index, onUpdateDescription, onRemove }: PhotoItemProps) => {
  const [description, setDescription] = React.useState(photo.description || "");

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    onUpdateDescription(index, value);
  };

  const renderPhotoPreview = () => {
    if (photo.file) {
      return URL.createObjectURL(photo.file);
    } else if (photo.storagePath) {
      const { data } = supabase.storage
        .from('reports')
        .getPublicUrl(photo.storagePath);
      return data.publicUrl;
    }
    return `/placeholder-image.png`;
  };

  return (
    <div className="space-y-2">
      <div className="relative group">
        <img
          src={renderPhotoPreview()}
          alt={photo.caption}
          className="w-full aspect-square object-cover rounded-md"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="bg-destructive text-destructive-foreground p-2 rounded-md hover:bg-destructive/90"
          >
            ✕
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm rounded-b-md">
          {photo.caption}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`description-${index}`} className="text-sm">Descrição/Observações</Label>
        <Input
          id={`description-${index}`}
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Adicione observações sobre esta foto..."
          className="text-sm"
        />
      </div>
    </div>
  );
};

export const PhotosSection = ({ taskId, photos, onUpdatePhotos, requiredPhotoLabels = [] }: PhotosSectionProps) => {
  const [customCaption, setCustomCaption] = React.useState("");

  const handlePhotoUpload = (caption: string, files: FileList | null) => {
    if (!files) return;

    const newPhotos = Array.from(files).map((file) => ({
      file,
      caption,
      description: "",
    }));

    onUpdatePhotos(taskId, [...photos, ...newPhotos]);
  };

  const handleCustomPhotoUpload = (files: FileList | null) => {
    if (!files || !customCaption.trim()) {
      return;
    }

    const newPhotos = Array.from(files).map((file) => ({
      file,
      caption: customCaption.trim(),
      description: "",
    }));

    onUpdatePhotos(taskId, [...photos, ...newPhotos]);
    setCustomCaption("");
  };

  const handleUpdateDescription = (index: number, description: string) => {
    const updatedPhotos = [...photos];
    updatedPhotos[index] = { ...updatedPhotos[index], description };
    onUpdatePhotos(taskId, updatedPhotos);
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    onUpdatePhotos(taskId, updatedPhotos);
  };

  // Check if a required photo has been uploaded
  const hasPhoto = (label: string) => photos.some(p => p.caption === label);

  return (
    <div className="space-y-6">
      {requiredPhotoLabels.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Fotos Obrigatórias</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiredPhotoLabels.map((label) => (
              <div key={label} className="space-y-2">
                <Label className={hasPhoto(label) ? "text-green-600" : "text-destructive"}>
                  {label} {hasPhoto(label) ? "✓" : "*"}
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(label, e.target.files)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={requiredPhotoLabels.length > 0 ? "border-t pt-6" : ""}>
        <h3 className="text-lg font-semibold mb-3">Fotos Adicionais</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="custom-caption">Legenda da Foto</Label>
            <Input
              id="custom-caption"
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
              placeholder="Ex: Detalhe do defeito, Vista lateral, etc."
            />
          </div>
          <div className="space-y-2">
            <Label>Selecionar Foto(s)</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleCustomPhotoUpload(e.target.files)}
              disabled={!customCaption.trim()}
            />
            {!customCaption.trim() && (
              <p className="text-sm text-muted-foreground">
                Digite uma legenda antes de adicionar fotos
              </p>
            )}
          </div>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Fotos Carregadas ({photos.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <PhotoItem
                key={index}
                photo={photo}
                index={index}
                onUpdateDescription={handleUpdateDescription}
                onRemove={handleRemovePhoto}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
