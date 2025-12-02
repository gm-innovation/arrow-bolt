import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, ImageIcon } from 'lucide-react';

interface AIPhotoUploadProps {
  onImageSelect: (base64: string | null) => void;
  selectedImage: string | null;
}

export function AIPhotoUpload({ onImageSelect, selectedImage }: AIPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress and convert to base64
    const base64 = await compressAndConvert(file);
    onImageSelect(base64);
  };

  const compressAndConvert = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 800;
          let { width, height } = img;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {selectedImage ? (
        <div className="relative">
          <img 
            src={selectedImage} 
            alt="Preview" 
            className="h-10 w-10 rounded object-cover border border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-1 -right-1 h-4 w-4 rounded-full"
            onClick={() => onImageSelect(null)}
          >
            <X className="h-2 w-2" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => fileInputRef.current?.click()}
          title="Anexar foto para análise"
        >
          <Camera className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
