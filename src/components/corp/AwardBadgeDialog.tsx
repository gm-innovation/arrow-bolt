import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const BADGE_CATEGORIES = [
  {
    category: 'manual',
    label: '🏅 Reconhecimento',
    items: [
      { value: 'goal_achieved', label: 'Meta Alcançada', icon: '🎯', defaultXp: 15 },
      { value: 'project_completed', label: 'Projeto Finalizado', icon: '🚀', defaultXp: 25 },
      { value: 'course_completed', label: 'Curso Concluído', icon: '📚', defaultXp: 15 },
      { value: 'custom', label: 'Personalizada', icon: '⭐', defaultXp: 10 },
    ],
  },
  {
    category: 'engagement',
    label: '💬 Engajamento',
    items: [
      { value: 'communicator', label: 'Comunicador Ativo', icon: '✍️', defaultXp: 10 },
      { value: 'influencer', label: 'Influenciador', icon: '❤️', defaultXp: 15 },
      { value: 'debater', label: 'Debatedor', icon: '💬', defaultXp: 10 },
    ],
  },
  {
    category: 'attendance',
    label: '✅ Presença',
    items: [
      { value: 'monthly_attendance', label: 'Assiduidade Mensal', icon: '✅', defaultXp: 10 },
      { value: 'attendance_streak', label: 'Sequência de Presença', icon: '🔥', defaultXp: 25 },
    ],
  },
];

const ALL_BADGE_ITEMS = BADGE_CATEGORIES.flatMap(c => c.items.map(i => ({ ...i, category: c.category })));

const EMOJI_OPTIONS = ['⭐', '🏆', '🎯', '🚀', '💎', '🔥', '👑', '✨', '💡', '🎖️', '🥇', '🏅', '🎉', '💪', '🌟'];
const XP_OPTIONS = [5, 10, 15, 25, 50];

interface Props {
  companyId: string;
}

const AwardBadgeDialog = ({ companyId }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [badgeType, setBadgeType] = useState('custom');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customIcon, setCustomIcon] = useState('⭐');
  const [xpValue, setXpValue] = useState(10);

  const selectedItem = ALL_BADGE_ITEMS.find(b => b.value === badgeType);

  const handleBadgeTypeChange = (value: string) => {
    setBadgeType(value);
    const item = ALL_BADGE_ITEMS.find(b => b.value === value);
    if (item) {
      setXpValue(item.defaultXp);
      if (value !== 'custom') setCustomIcon(item.icon);
    }
  };

  const { data: colleagues = [] } = useQuery({
    queryKey: ['colleagues', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('company_id', companyId)
        .order('full_name');
      return data || [];
    },
    enabled: !!companyId && open,
  });

  const award = useMutation({
    mutationFn: async () => {
      const icon = badgeType === 'custom' ? customIcon : selectedItem?.icon || '⭐';
      const category = selectedItem?.category || 'manual';
      const { error } = await (supabase as any)
        .from('corp_badges')
        .insert({
          company_id: companyId,
          user_id: userId,
          badge_type: badgeType,
          title: title || selectedItem?.label || 'Conquista',
          description: description || null,
          icon,
          awarded_by: user!.id,
          xp_value: xpValue,
          category,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-badges-recent'] });
      queryClient.invalidateQueries({ queryKey: ['user-xp'] });
      toast({ title: 'Conquista concedida! 🏆' });
      setOpen(false);
      setUserId(''); setTitle(''); setDescription('');
      setBadgeType('custom'); setCustomIcon('⭐'); setXpValue(10);
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
          <Award className="h-3.5 w-3.5 text-amber-500" />
          Conceder Conquista
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Conceder Conquista
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Colaborador</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {colleagues.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Categoria / Tipo</Label>
            <Select value={badgeType} onValueChange={handleBadgeTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BADGE_CATEGORIES.map(cat => (
                  <div key={cat.category}>
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {cat.label}
                    </div>
                    {cat.items.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.icon} {item.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {badgeType === 'custom' && (
            <div>
              <Label>Ícone</Label>
              <div className="grid grid-cols-8 gap-1.5 mt-1.5">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setCustomIcon(emoji)}
                    className={cn(
                      'h-9 w-9 rounded-md text-lg flex items-center justify-center border transition-all',
                      customIcon === emoji
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30 scale-110'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>XP da Conquista</Label>
            <div className="flex gap-1.5 mt-1.5">
              {XP_OPTIONS.map(xp => (
                <button
                  key={xp}
                  type="button"
                  onClick={() => setXpValue(xp)}
                  className={cn(
                    'flex-1 h-9 rounded-md text-xs font-semibold border transition-all',
                    xpValue === xp
                      ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/50 hover:bg-accent text-muted-foreground'
                  )}
                >
                  +{xp}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={selectedItem?.label || 'Título da conquista'} />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Motivo ou detalhes da conquista" rows={2} />
          </div>
          <Button onClick={() => award.mutate()} disabled={!userId || award.isPending} className="w-full">
            {award.isPending ? 'Concedendo...' : `Conceder Conquista (+${xpValue} XP)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AwardBadgeDialog;
