import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface FeedPollDisplayProps {
  postId: string;
}

const FeedPollDisplay = ({ postId }: FeedPollDisplayProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pollData, isLoading } = useQuery({
    queryKey: ['poll', postId],
    queryFn: async () => {
      const { data: poll } = await (supabase as any)
        .from('corp_feed_polls')
        .select('*')
        .eq('post_id', postId)
        .single();
      if (!poll) return null;

      const { data: options } = await (supabase as any)
        .from('corp_feed_poll_options')
        .select('*')
        .eq('poll_id', poll.id)
        .order('position');

      const optionIds = (options || []).map((o: any) => o.id);
      const { data: votes } = optionIds.length > 0
        ? await (supabase as any).from('corp_feed_poll_votes').select('*').in('option_id', optionIds)
        : { data: [] };

      const voteCounts: Record<string, number> = {};
      let myVoteOptionId: string | null = null;
      (votes || []).forEach((v: any) => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
        if (v.user_id === user?.id) myVoteOptionId = v.option_id;
      });

      const totalVotes = (votes || []).length;

      return {
        poll,
        options: (options || []).map((o: any) => ({
          ...o,
          votes: voteCounts[o.id] || 0,
          percentage: totalVotes > 0 ? Math.round(((voteCounts[o.id] || 0) / totalVotes) * 100) : 0,
        })),
        totalVotes,
        myVoteOptionId,
      };
    },
    enabled: !!postId,
  });

  const vote = useMutation({
    mutationFn: async (optionId: string) => {
      // Remove old vote if exists
      if (pollData?.myVoteOptionId) {
        await (supabase as any)
          .from('corp_feed_poll_votes')
          .delete()
          .eq('option_id', pollData.myVoteOptionId)
          .eq('user_id', user!.id);
      }
      const { error } = await (supabase as any)
        .from('corp_feed_poll_votes')
        .insert({ option_id: optionId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['poll', postId] }),
  });

  if (isLoading || !pollData) return null;

  const hasVoted = !!pollData.myVoteOptionId;

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
      <p className="text-sm font-medium">{pollData.poll.question}</p>
      <div className="space-y-1.5">
        {pollData.options.map((opt: any) => (
          <div key={opt.id}>
            {hasVoted ? (
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn('flex items-center gap-1', pollData.myVoteOptionId === opt.id && 'font-semibold text-primary')}>
                    {pollData.myVoteOptionId === opt.id && <CheckCircle2 className="h-3 w-3" />}
                    {opt.option_text}
                  </span>
                  <span className="text-muted-foreground">{opt.percentage}%</span>
                </div>
                <Progress value={opt.percentage} className="h-1.5" />
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8"
                onClick={() => vote.mutate(opt.id)}
                disabled={vote.isPending}
              >
                {opt.option_text}
              </Button>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">{pollData.totalVotes} {pollData.totalVotes === 1 ? 'voto' : 'votos'}</p>
    </div>
  );
};

export default FeedPollDisplay;
