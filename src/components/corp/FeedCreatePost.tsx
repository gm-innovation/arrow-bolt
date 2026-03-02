import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Image, Film, Music, Paperclip } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCorpFeed } from '@/hooks/useCorpFeed';
import FeedMediaPreview from './FeedMediaPreview';
import FeedMentionInput, { MentionItem } from './FeedMentionInput';

interface FeedCreatePostProps {
  companyId: string;
  userProfile?: { full_name?: string; avatar_url?: string } | null;
}

const FeedCreatePost = ({ companyId, userProfile }: FeedCreatePostProps) => {
  const { user } = useAuth();
  const { createPost } = useCorpFeed();
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<MentionItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [acceptType, setAcceptType] = useState('*/*');

  const initials = userProfile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const handleFileSelect = (accept: string) => {
    setAcceptType(accept);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
    setExpanded(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const previewAttachments = files.map(f => ({
    file_url: URL.createObjectURL(f),
    file_name: f.name,
    file_type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'file',
    file_size: f.size,
    mime_type: f.type,
  }));

  const handleSubmit = () => {
    if ((!content.trim() && files.length === 0) || !companyId) return;
    createPost.mutate(
      { company_id: companyId, content: content || '', files, mentions },
      {
        onSuccess: () => {
          setContent('');
          setExpanded(false);
          setFiles([]);
          setMentions([]);
        },
      }
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {userProfile?.avatar_url && <AvatarImage src={userProfile.avatar_url} />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <FeedMentionInput
              value={content}
              onChange={setContent}
              mentions={mentions}
              onMentionsChange={setMentions}
              placeholder="No que você está pensando? Use @ para mencionar..."
              rows={expanded ? 3 : 1}
              onFocus={() => setExpanded(true)}
            />

            {previewAttachments.length > 0 && (
              <FeedMediaPreview attachments={previewAttachments} editable onRemove={removeFile} />
            )}

            <input ref={fileInputRef} type="file" multiple accept={acceptType} className="hidden" onChange={handleFilesChange} />

            {expanded && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFileSelect('image/*')} title="Foto">
                    <Image className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFileSelect('video/*')} title="Vídeo">
                    <Film className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFileSelect('audio/*')} title="Áudio">
                    <Music className="h-4 w-4 text-orange-600" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFileSelect('*/*')} title="Arquivo">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>

                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={(!content.trim() && files.length === 0) || createPost.isPending}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {createPost.isPending ? 'Publicando...' : 'Publicar'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedCreatePost;
