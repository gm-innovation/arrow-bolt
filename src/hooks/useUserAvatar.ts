import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useUserAvatar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch current avatar URL from profile
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (!error && data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchAvatar();
  }, [user?.id]);

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    setIsUploading(true);
    try {
      // Create a unique file path: userId/timestamp-filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to user-avatars bucket
      const { error: uploadError } = await supabase.storage
        .from("user-avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("user-avatars")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update auth user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      setAvatarUrl(publicUrl);

      toast({
        title: "Avatar atualizado",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });

      return publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Erro ao enviar foto",
        description: "Não foi possível atualizar o avatar. Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAvatar = async (): Promise<boolean> => {
    if (!user?.id || !avatarUrl) return false;

    try {
      // Extract file path from URL
      const urlParts = avatarUrl.split("/user-avatars/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("user-avatars").remove([filePath]);
      }

      // Update profile to remove avatar URL
      await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      // Update auth user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: null },
      });

      setAvatarUrl(null);

      toast({
        title: "Avatar removido",
        description: "Sua foto de perfil foi removida.",
      });

      return true;
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast({
        title: "Erro ao remover foto",
        description: "Não foi possível remover o avatar. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    avatarUrl,
    isUploading,
    uploadAvatar,
    deleteAvatar,
  };
};
