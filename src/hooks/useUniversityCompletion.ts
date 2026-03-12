import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export function useUniversityCompletion() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const publishCourseCompletion = async (courseTitle: string) => {
    if (!user || !profile?.company_id) return;
    await supabase.from('corp_feed_posts').insert({
      company_id: profile.company_id,
      author_id: user.id,
      content: `🎓 Concluí o curso "${courseTitle}"!`,
      post_type: 'achievement',
    });
    await supabase.from('corp_badges').insert({
      company_id: profile.company_id,
      user_id: user.id,
      badge_type: 'course_completed',
      title: `Curso: ${courseTitle}`,
      icon: '📚',
      category: 'engagement',
      xp_value: 15,
      awarded_by: user.id,
    });
    queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
    queryClient.invalidateQueries({ queryKey: ['corp-badges-recent'] });
    queryClient.invalidateQueries({ queryKey: ['user-xp'] });
  };

  const publishTrailCompletion = async (trailTitle: string) => {
    if (!user || !profile?.company_id) return;
    await supabase.from('corp_feed_posts').insert({
      company_id: profile.company_id,
      author_id: user.id,
      content: `🏆 Concluí a trilha "${trailTitle}"!`,
      post_type: 'achievement',
    });
    await supabase.from('corp_badges').insert({
      company_id: profile.company_id,
      user_id: user.id,
      badge_type: 'trail_completed',
      title: `Trilha: ${trailTitle}`,
      icon: '🎓',
      category: 'engagement',
      xp_value: 50,
      awarded_by: user.id,
    });
    queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
    queryClient.invalidateQueries({ queryKey: ['corp-badges-recent'] });
    queryClient.invalidateQueries({ queryKey: ['user-xp'] });
  };

  return { publishCourseCompletion, publishTrailCompletion };
}
