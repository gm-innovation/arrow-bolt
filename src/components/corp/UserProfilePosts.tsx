import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Film, FileIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Props {
  targetUserId: string;
  userName?: string;
}

const UserProfilePosts = ({ targetUserId, userName }: Props) => {
  const navigate = useNavigate();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['user-profile-posts', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('corp_feed_posts')
        .select('id, content, title, created_at, author_id, profiles:profiles!corp_feed_posts_author_id_fkey(full_name, avatar_url), corp_feed_attachments(file_url, file_type, file_name, mime_type)')
        .eq('author_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const getAttachmentPreview = (attachments: any[]) => {
    const images = attachments.filter((a: any) => (a.file_type || a.mime_type || '').includes('image'));
    const videos = attachments.filter((a: any) => (a.file_type || a.mime_type || '').includes('video'));
    const files = attachments.filter((a: any) => !(a.file_type || a.mime_type || '').includes('image') && !(a.file_type || a.mime_type || '').includes('video'));

    return (
      <div className="space-y-2">
        {images.length > 0 && (
          <div className={`grid gap-1 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {images.slice(0, 4).map((img: any, i: number) => (
              <img key={i} src={img.file_url} alt="" className="w-full h-32 object-cover rounded" />
            ))}
          </div>
        )}
        {videos.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Film className="h-3.5 w-3.5 text-purple-500" />
            <span>{videos.length} vídeo{videos.length > 1 ? 's' : ''}</span>
          </div>
        )}
        {files.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileIcon className="h-3.5 w-3.5" />
            <span>{files.length} arquivo{files.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    );
  };

  const firstName = userName?.split(' ')[0] || 'este usuário';

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-4">
          <MessageCircle className="h-4 w-4 text-primary/60" /> Publicações de {firstName}
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post: any) => {
              const author = post.profiles;
              const authorInitials = author?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
              const attachments = post.corp_feed_attachments || [];

              return (
                <div key={post.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8 cursor-pointer" onClick={() => navigate(`/corp/profile/${post.author_id}`)}>
                      {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
                      <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{author?.full_name || 'Usuário'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {post.title && <p className="text-sm font-medium mb-1">{post.title}</p>}
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-2">{post.content}</p>
                  {attachments.length > 0 && getAttachmentPreview(attachments)}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma publicação ainda
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default UserProfilePosts;
