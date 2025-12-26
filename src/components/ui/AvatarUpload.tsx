import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  avatarUrl: string | null;
  initials: string;
  onUpload: (file: File) => Promise<string | null>;
  onDelete?: () => Promise<boolean>;
  isUploading?: boolean;
  size?: "sm" | "md" | "lg";
  fallbackClassName?: string;
}

export const AvatarUpload = ({
  avatarUrl,
  initials,
  onUpload,
  onDelete,
  isUploading,
  size = "lg",
  fallbackClassName,
}: AvatarUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-20 w-20",
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    const result = await onUpload(file);
    if (result) {
      setPreviewUrl(null); // Clear preview, use actual URL
    } else {
      setPreviewUrl(null); // Clear preview on error
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
    }
  };

  const displayUrl = previewUrl || avatarUrl;

  return (
    <div className="relative group">
      <Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
        {displayUrl ? (
          <AvatarImage src={displayUrl} alt="Avatar" className="object-cover" />
        ) : null}
        <AvatarFallback className={cn("text-2xl font-medium", fallbackClassName)}>
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            initials
          )}
        </AvatarFallback>
      </Avatar>

      {/* Overlay with upload button */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
          isUploading && "opacity-100"
        )}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        ) : (
          <Camera className="h-6 w-6 text-white" />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Delete button - show only when there's an avatar */}
      {displayUrl && onDelete && !isUploading && (
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
