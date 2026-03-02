import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCorpFeed } from '@/hooks/useCorpFeed';

interface FeedCreatePostProps {
  companyId: string;
  userProfile?: { full_name?: string; avatar_url?: string } | null;
}

const FeedCreatePost = ({ companyId, userProfile }: FeedCreatePostProps) => {
  const { user } = useAuth();
  const { createPost } = useCorpFeed();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('general');
  const [expanded, setExpanded] = useState(false);

  const initials = userProfile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const handleSubmit = () => {
    if (!content.trim() || !companyId) return;
    createPost.mutate({ company_id: companyId, content, post_type: postType }, {
      onSuccess: () => { setContent(''); setExpanded(false); setPostType('general'); },
    });
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
            <Textarea
              placeholder="No que você está pensando?"
              value={content}
              onChange={e => setContent(e.target.value)}
              onFocus={() => setExpanded(true)}
              rows={expanded ? 3 : 1}
              className="resize-none min-h-0 transition-all"
            />
            {expanded && (
              <div className="flex items-center justify-between">
                <Select value={postType} onValueChange={setPostType}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="announcement">Comunicado</SelectItem>
                    <SelectItem value="update">Atualização</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!content.trim() || createPost.isPending}
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
