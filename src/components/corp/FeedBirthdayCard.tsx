import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Cake } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  companyId: string;
}

const FeedBirthdayCard = ({ companyId }: Props) => {
  const { data: birthdays = [] } = useQuery({
    queryKey: ['feed-today-birthdays', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, birth_date')
        .eq('company_id', companyId)
        .not('birth_date', 'is', null);
      const today = new Date();
      return (data || []).filter((p: any) => {
        const d = new Date(p.birth_date);
        return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      });
    },
    enabled: !!companyId,
  });

  if (birthdays.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/10 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🎂</span>
          <div>
            <p className="text-sm font-semibold">Aniversariante{birthdays.length > 1 ? 's' : ''} do dia!</p>
            <p className="text-[10px] text-muted-foreground">Não esqueça de dar os parabéns 🎉</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {birthdays.map((p: any) => {
            const initials = p.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
            return (
              <div key={p.id} className="flex items-center gap-2">
                <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{p.full_name}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedBirthdayCard;
