import { useCorpFeed } from '@/hooks/useCorpFeed';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import FeedCreatePost from '@/components/corp/FeedCreatePost';
import FeedPostCard from '@/components/corp/FeedPostCard';
import FeedProfileSidebar from '@/components/corp/FeedProfileSidebar';
import FeedRightSidebar from '@/components/corp/FeedRightSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';

const CorpFeed = () => {
  const { user } = useAuth();
  const { posts, isLoading, comments } = useCorpFeed();
  const isMobile = useIsMobile();
  const companyId = (posts as any[])?.[0]?.company_id || '';

  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, company_id, hire_date, birth_date')
        .eq('id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: userRole } = useQuery({
    queryKey: ['my-role', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .single();
      return data?.role;
    },
    enabled: !!user,
  });

  const effectiveCompanyId = companyId || profile?.company_id || '';

  return (
    <div className="max-w-[1100px] mx-auto px-2">
      <div className={isMobile ? 'space-y-4' : 'grid grid-cols-[260px_1fr_260px] gap-5 items-start'}>
        {/* Left sidebar - Profile */}
        <div className={isMobile ? '' : ''}>
          <FeedProfileSidebar profile={profile} role={userRole} />
        </div>

        {/* Center - Timeline */}
        <div className="space-y-4 min-w-0">
          <FeedCreatePost companyId={effectiveCompanyId} userProfile={profile} userRole={userRole} />

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground rounded-lg border bg-card">
              <p className="text-sm">Nenhuma publicação ainda.</p>
              <p className="text-xs mt-1">Seja o primeiro a compartilhar algo com sua equipe!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(posts as any[]).map(post => (
                <FeedPostCard key={post.id} post={post} comments={comments[post.id] || []} />
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        {!isMobile && effectiveCompanyId && (
          <FeedRightSidebar companyId={effectiveCompanyId} />
        )}
      </div>
    </div>
  );
};

export default CorpFeed;
