import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar, Briefcase, Users, Clock } from 'lucide-react';
import { formatDistanceToNow, differenceInYears, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReactNode } from 'react';

const ROLE_LABELS: Record<string, string> = {
  technician: 'Técnico',
  admin: 'Administrador',
  hr: 'RH',
  manager: 'Gerente',
  commercial: 'Comercial',
  qualidade: 'Qualidade',
  compras: 'Suprimentos',
  financeiro: 'Financeiro',
  super_admin: 'Super Admin',
  director: 'Diretor',
  corp: 'Corporativo',
};

interface FeedUserProfileCardProps {
  children: ReactNode;
  author: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    hire_date?: string;
    birth_date?: string;
  };
  role?: string;
  groups?: { name: string }[];
}

const FeedUserProfileCard = ({ children, author, role, groups = [] }: FeedUserProfileCardProps) => {
  const initials = author.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const tenure = author.hire_date
    ? formatDistanceToNow(new Date(author.hire_date), { locale: ptBR })
    : null;

  const age = author.birth_date
    ? differenceInYears(new Date(), new Date(author.birth_date))
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              {author.avatar_url && <AvatarImage src={author.avatar_url} />}
              <AvatarFallback className="text-base font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{author.full_name || 'Desconhecido'}</p>
              {role && (
                <Badge variant="secondary" className="text-[10px] h-5 mt-0.5">
                  {ROLE_LABELS[role] || role}
                </Badge>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-1.5 text-xs text-muted-foreground">
            {tenure && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span>Na empresa há {tenure}</span>
              </div>
            )}
            {age !== null && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{age} anos{author.birth_date && ` • ${format(new Date(author.birth_date), 'dd/MM')}`}</span>
              </div>
            )}
            {author.hire_date && (
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Admissão: {format(new Date(author.hire_date), 'dd/MM/yyyy')}</span>
              </div>
            )}
          </div>

          {/* Groups */}
          {groups.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Grupos</p>
              <div className="flex flex-wrap gap-1">
                {groups.map(g => (
                  <Badge key={g.name} variant="outline" className="text-[10px] h-5 gap-1">
                    <Users className="h-2.5 w-2.5" />
                    {g.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FeedUserProfileCard;
