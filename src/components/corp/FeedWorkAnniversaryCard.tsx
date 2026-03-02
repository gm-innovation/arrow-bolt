import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  companyId: string;
}

const FeedWorkAnniversaryCard = ({ companyId }: Props) => {
  const { data: anniversaries = [] } = useQuery({
    queryKey: ['feed-today-work-anniversaries', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, hire_date')
        .eq('company_id', companyId)
        .not('hire_date', 'is', null);
      const today = new Date();
      return (data || [])
        .filter((p: any) => {
          const d = new Date(p.hire_date);
          return d.getMonth() === today.getMonth() && d.getDate() === today.getDate() && d.getFullYear() < today.getFullYear();
        })
        .map((p: any) => ({
          ...p,
          years: today.getFullYear() - new Date(p.hire_date).getFullYear(),
        }));
    },
    enabled: !!companyId,
  });

  if (anniversaries.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-yellow-500/10 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🎖️</span>
          <div>
            <p className="text-sm font-semibold">Aniversário de Empresa!</p>
            <p className="text-[10px] text-muted-foreground">Parabéns pela dedicação 🎉</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {anniversaries.map((p: any) => {
            const initials = p.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
            return (
              <div key={p.id} className="flex items-center gap-2">
                <Avatar className="h-9 w-9 ring-2 ring-amber-500/20">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-medium">{p.full_name}</span>
                  <p className="text-[10px] text-muted-foreground">{p.years} {p.years === 1 ? 'ano' : 'anos'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedWorkAnniversaryCard;
