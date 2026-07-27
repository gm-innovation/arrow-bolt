import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MarinaAttachment } from '@/components/ai/AIAttachmentUpload';

const MAX_SIZE = 20 * 1024 * 1024; // 20MB por arquivo

function sanitize(name: string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1200;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = (height / width) * maxSize; width = maxSize; }
          else { width = (width / height) * maxSize; height = maxSize; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useMarinaAttachments(
  attachments: MarinaAttachment[],
  onChange: (next: MarinaAttachment[]) => void,
  max = 10,
) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const processFiles = async (files: FileList | File[] | null) => {
    if (!files || !user?.id) return;
    const arr = Array.from(files as any as File[]);
    if (!arr.length) return;
    const available = max - attachments.length;
    if (available <= 0) {
      toast.error(`Máximo de ${max} anexos por mensagem`);
      return;
    }
    const toProcess = arr.slice(0, available);
    if (arr.length > available) {
      toast.warning(`Só cabem mais ${available} anexo(s) — processando os primeiros`);
    }
    setUploading(true);
    try {
      const next: MarinaAttachment[] = [];
      for (const file of toProcess) {
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name}: acima de 20MB`);
          continue;
        }
        if (file.type.startsWith('image/')) {
          try {
            const dataUrl = await compressImage(file);
            next.push({ kind: 'image', name: file.name, mime: file.type, size: file.size, dataUrl });
          } catch {
            toast.error(`Falha ao processar imagem ${file.name}`);
          }
        } else {
          const safe = sanitize(file.name);
          const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
          const { error } = await supabase.storage
            .from('marina-attachments')
            .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
          if (error) {
            toast.error(`Falha ao enviar ${file.name}: ${error.message}`);
            continue;
          }
          next.push({ kind: 'file', name: file.name, mime: file.type || 'application/octet-stream', size: file.size, path });
        }
      }
      if (next.length) onChange([...attachments, ...next]);
    } finally {
      setUploading(false);
    }
  };

  return { processFiles, uploading, max };
}
