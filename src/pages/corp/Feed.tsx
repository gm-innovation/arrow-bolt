import { useCorpFeed } from '@/hooks/useCorpFeed';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import FeedCreatePost from '@/components/corp/FeedCreatePost';
import FeedPostCard from '@/components/corp/FeedPostCard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const CorpFeed = () => {
  const { user, userRole } = useAuth();
  const { posts, isLoading, comments } = useCorpFeed();
  const companyId = (posts as any[])?.[0]?.company_id || '';

  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name, avatar_url, company_id').eq('id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const effectiveCompanyId = companyId || profile?.company_id || '';

  return (
    <div className="max-w-[600px] mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Feed Corporativo</h2>

      <FeedCreatePost companyId={effectiveCompanyId} userProfile={profile} />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">Nenhum post no feed ainda.</div>
      ) : (
        <div className="space-y-4">
          {(posts as any[]).map(post => (
            <FeedPostCard key={post.id} post={post} comments={comments[post.id] || []} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CorpFeed;
