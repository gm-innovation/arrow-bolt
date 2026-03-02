import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const BADGE_TYPES = [
  { value: 'goal_achieved', label: '🎯 Meta Alcançada', icon: '🎯' },
  { value: 'project_completed', label: '🚀 Projeto Finalizado', icon: '🚀' },
  { value: 'course_completed', label: '📚 Curso Finalizado', icon: '📚' },
  { value: 'custom', label: '⭐ Personalizada', icon: '⭐' },
];

const EMOJI_OPTIONS = ['⭐', '🏆', '🎯', '🚀', '💎', '🔥', '👑', '✨', '💡', '🎖️', '🥇', '🏅', '🎉', '💪', '🌟'];

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

  const selectedType = BADGE_TYPES.find(b => b.value === badgeType);

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
      const icon = badgeType === 'custom' ? customIcon : selectedType?.icon || '⭐';
      const { error } = await (supabase as any)
        .from('corp_badges')
        .insert({
          company_id: companyId,
          user_id: userId,
          badge_type: badgeType,
          title: title || selectedType?.label || 'Conquista',
          description: description || null,
          icon,
          awarded_by: user!.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-badges-recent'] });
      toast({ title: 'Conquista concedida! 🏆' });
      setOpen(false);
      setUserId('');
      setTitle('');
      setDescription('');
      setBadgeType('custom');
      setCustomIcon('⭐');
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
      <DialogContent>
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
            <Label>Tipo</Label>
            <Select value={badgeType} onValueChange={setBadgeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BADGE_TYPES.map(b => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
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
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={selectedType?.label || 'Título da conquista'} />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Motivo ou detalhes da conquista" rows={2} />
          </div>
          <Button onClick={() => award.mutate()} disabled={!userId || award.isPending} className="w-full">
            {award.isPending ? 'Concedendo...' : 'Conceder Conquista'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AwardBadgeDialog;
