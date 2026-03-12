import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface RewardSetting {
  reward_type: string;
  xp_value: number;
  icon: string;
  badge_title_template: string;
  post_to_feed: boolean;
}

const DEFAULTS: Record<string, RewardSetting> = {
  course_completed: {
    reward_type: 'course_completed',
    xp_value: 15,
    icon: '📚',
    badge_title_template: 'Curso: {name}',
    post_to_feed: true,
  },
  trail_completed: {
    reward_type: 'trail_completed',
    xp_value: 50,
    icon: '🎓',
    badge_title_template: 'Trilha: {name}',
    post_to_feed: true,
  },
};

export function useUniversityCompletion() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['university-reward-settings', profile?.company_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('university_reward_settings')
        .select('reward_type, xp_value, icon, badge_title_template, post_to_feed')
        .eq('company_id', profile!.company_id!);
      const map: Record<string, RewardSetting> = { ...DEFAULTS };
      (data || []).forEach((r: any) => { map[r.reward_type] = r; });
      return map;
    },
    enabled: !!profile?.company_id,
  });

  const getSetting = (type: string): RewardSetting => settings?.[type] ?? DEFAULTS[type];

  const publishCourseCompletion = async (courseTitle: string) => {
    if (!user || !profile?.company_id) return;
    const s = getSetting('course_completed');
    const title = s.badge_title_template.replace('{name}', courseTitle);

    if (s.post_to_feed) {
      await supabase.from('corp_feed_posts').insert({
        company_id: profile.company_id,
        author_id: user.id,
        content: `🎓 Concluí o curso "${courseTitle}"!`,
        post_type: 'achievement',
      });
    }
    await supabase.from('corp_badges').insert({
      company_id: profile.company_id,
      user_id: user.id,
      badge_type: 'course_completed',
      title,
      icon: s.icon,
      category: 'engagement',
      xp_value: s.xp_value,
      awarded_by: user.id,
    });
    queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
    queryClient.invalidateQueries({ queryKey: ['corp-badges-recent'] });
    queryClient.invalidateQueries({ queryKey: ['user-xp'] });
  };

  const publishTrailCompletion = async (trailTitle: string) => {
    if (!user || !profile?.company_id) return;
    const s = getSetting('trail_completed');
    const title = s.badge_title_template.replace('{name}', trailTitle);

    if (s.post_to_feed) {
      await supabase.from('corp_feed_posts').insert({
        company_id: profile.company_id,
        author_id: user.id,
        content: `🏆 Concluí a trilha "${trailTitle}"!`,
        post_type: 'achievement',
      });
    }
    await supabase.from('corp_badges').insert({
      company_id: profile.company_id,
      user_id: user.id,
      badge_type: 'trail_completed',
      title,
      icon: s.icon,
      category: 'engagement',
      xp_value: s.xp_value,
      awarded_by: user.id,
    });
    queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
    queryClient.invalidateQueries({ queryKey: ['corp-badges-recent'] });
    queryClient.invalidateQueries({ queryKey: ['user-xp'] });
  };

  return { publishCourseCompletion, publishTrailCompletion };
}
