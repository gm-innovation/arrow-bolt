import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';

interface GroupMembersSidebarProps {
  members: any[];
  memberCount: number;
}

const GroupMembersSidebar = ({ members, memberCount }: GroupMembersSidebarProps) => {
  const getInitials = (name?: string) =>
    name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <Card className="sticky top-4">
      <CardContent className="p-0">
        <div className="px-4 py-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Membros ({memberCount})</p>
        </div>
        <ScrollArea className="max-h-[60vh]">
          <div className="px-4 pb-3 space-y-1.5">
            {members.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum membro.</p>
            ) : (
              members.map((m: any) => (
                <div key={m.user_id} className="flex items-center gap-2 py-1">
                  <Avatar className="h-7 w-7">
                    {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                    <AvatarFallback className="text-[9px]">{getInitials(m.full_name)}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium truncate">{m.full_name || 'Usuário'}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default GroupMembersSidebar;
