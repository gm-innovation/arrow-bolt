import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { pdf } from '@react-pdf/renderer';
import CertificatePDF from '@/components/university/CertificatePDF';

interface RewardSetting {
  reward_type: string;
  xp_value: number;
  icon: string;
  badge_title_template: string;
  post_to_feed: boolean;
}

interface CertificateData {
  courseTitle: string;
  userName: string;
  companyName: string;
  companyLogoUrl?: string;
  durationMinutes?: number | null;
  certificateCode: string;
  issuedAt: string;
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

  const generateAndUploadCertPdf = async (certData: CertificateData, postId: string): Promise<void> => {
    try {
      const blob = await pdf(
        <CertificatePDF
          userName={certData.userName}
          courseTitle={certData.courseTitle}
          issuedAt={certData.issuedAt}
          certificateCode={certData.certificateCode}
          companyName={certData.companyName}
          companyLogoUrl={certData.companyLogoUrl}
          durationMinutes={certData.durationMinutes}
          hrSignerName={certData.hrSignerName}
          directorSignerName={certData.directorSignerName}
        />
      ).toBlob();

      const sanitizedTitle = certData.courseTitle
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 50);
      const path = `${user!.id}/${postId}/certificado_${sanitizedTitle}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('corp-feed-media')
        .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'application/pdf' });
      if (uploadError) {
        console.error('Erro upload certificado:', uploadError);
        return;
      }

      const { data: urlData } = supabase.storage.from('corp-feed-media').getPublicUrl(path);

      await supabase.from('corp_feed_attachments').insert({
        post_id: postId,
        file_url: urlData.publicUrl,
        file_name: `certificado-${certData.certificateCode}.pdf`,
        file_type: 'document',
        mime_type: 'application/pdf',
        file_size: blob.size,
      });
    } catch (err) {
      console.error('Erro ao anexar certificado ao feed:', err);
    }
  };

  const publishCourseCompletion = async (courseTitle: string, certData?: CertificateData) => {
    if (!user || !profile?.company_id) return;
    const s = getSetting('course_completed');
    const title = s.badge_title_template.replace('{name}', courseTitle);

    let postId: string | null = null;

    if (s.post_to_feed) {
      const { data: postResult } = await supabase.from('corp_feed_posts').insert({
        company_id: profile.company_id,
        author_id: user.id,
        content: `🎓 Concluí o curso "${courseTitle}"!`,
        post_type: 'achievement',
      }).select('id').single();
      postId = postResult?.id || null;
    }

    // Attach certificate PDF to the feed post
    if (postId && certData) {
      await generateAndUploadCertPdf(certData, postId);
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
