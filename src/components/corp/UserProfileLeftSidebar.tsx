import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Award, FileText } from 'lucide-react';
import FeedMediaPreview from './FeedMediaPreview';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';


interface Props {
  targetUserId: string;
}


// ─── Component ───

const UserProfileLeftSidebar = ({ targetUserId }: Props) => {
  const navigate = useNavigate();

  // Groups
  const { data: groups = [] } = useQuery({
    queryKey: ['user-groups', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('corp_group_members')
        .select('corp_groups:corp_groups!corp_group_members_group_id_fkey(id, name)')
        .eq('user_id', targetUserId);
      return (data || []).map((m: any) => ({ id: m.corp_groups?.id, name: m.corp_groups?.name })).filter((g: any) => g.name);
    },
  });

  // Badges
  const { data: badges = [] } = useQuery({
    queryKey: ['user-badges', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('corp_badges')
        .select('*')
        .eq('user_id', targetUserId)
        .order('awarded_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // Recent posts with attachments (include id for proxy)
  const { data: recentPosts = [] } = useQuery({
    queryKey: ['user-recent-posts', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('corp_feed_posts')
        .select('id, content, title, created_at, corp_feed_attachments(id, file_url, file_type, file_name, mime_type, file_size)')
        .eq('author_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      {/* Recent Posts */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
            <FileText className="h-3.5 w-3.5 text-primary/60" /> Publicações recentes
          </h3>
          {recentPosts.length > 0 ? (
            <div className="space-y-3">
              {recentPosts.map((post: any) => {
                const attachments: any[] = post.corp_feed_attachments || [];
                const images = attachments.filter((a) => a.file_type === 'image');
                const videos = attachments.filter((a) => a.file_type === 'video');
                const files = attachments.filter((a) => a.file_type === 'file');

                return (
                  <div key={post.id} className="border-b border-border pb-3 last:border-0 last:pb-0 space-y-1.5">
                    {/* Title / text */}
                    {post.title && <p className="text-xs font-medium truncate">{post.title}</p>}
                    <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>

                    {/* Image thumbnails */}
                    {images.length > 0 && (
                      <div className="flex gap-1 overflow-hidden rounded">
                        {images.slice(0, 3).map((img: any) => (
                          <img key={img.id} src={img.file_url} alt="" className="h-16 w-16 object-cover rounded flex-shrink-0" />
                        ))}
                        {images.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center ml-1">+{images.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Video cards */}
                    {videos.map((vid: any) => (
                      <div key={vid.id} className="flex items-center gap-2 p-1.5 rounded border border-border bg-muted/30">
                        <Film className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-[11px] font-medium truncate flex-1">{vid.file_name}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => downloadFile(vid.file_url, vid.file_name)}>
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {/* File cards */}
                    {files.map((file: any) => (
                      <div key={file.id} className="flex items-center gap-2 p-1.5 rounded border border-border bg-muted/30">
                        <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium truncate">{file.file_name}</p>
                          {file.file_size && (
                            <p className="text-[10px] text-muted-foreground">
                              {file.file_size < 1024 * 1024
                                ? `${(file.file_size / 1024).toFixed(0)} KB`
                                : `${(file.file_size / (1024 * 1024)).toFixed(1)} MB`}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => downloadFile(file.file_url, file.file_name)}>
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {/* Timestamp */}
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma publicação ainda</p>
          )}
        </CardContent>
      </Card>

      {/* Groups */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
            <Users className="h-3.5 w-3.5 text-primary/60" /> Grupos
          </h3>
          {groups.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g: any) => (
                <Badge key={g.id} variant="outline" className="text-xs cursor-pointer hover:bg-accent" onClick={() => navigate(`/corp/groups/${g.id}`)}>
                  {g.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum grupo</p>
          )}
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
            <Award className="h-3.5 w-3.5 text-primary/60" /> Conquistas
          </h3>
          {badges.length > 0 ? (
            <div className="space-y-2">
              {badges.map((b: any) => (
                <div key={b.id} className="flex items-center gap-2 text-xs">
                  <span className="text-lg">{b.icon || '🏆'}</span>
                  <div>
                    <p className="font-medium">{b.title}</p>
                    {b.description && <p className="text-muted-foreground">{b.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma conquista ainda</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfileLeftSidebar;
