import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const CATEGORIES = [
  { value: 'teamwork', label: '🤝 Trabalho em Equipe', emoji: '🤝' },
  { value: 'innovation', label: '🚀 Inovação', emoji: '🚀' },
  { value: 'leadership', label: '👑 Liderança', emoji: '👑' },
  { value: 'helpfulness', label: '💚 Colaboração', emoji: '💚' },
  { value: 'excellence', label: '⭐ Excelência', emoji: '⭐' },
];

interface Props {
  companyId: string;
}

const FeedKudosDialog = ({ companyId }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [toUserId, setToUserId] = useState('');
  const [category, setCategory] = useState('teamwork');
  const [message, setMessage] = useState('');

  const { data: colleagues = [] } = useQuery({
    queryKey: ['colleagues', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('company_id', companyId)
        .neq('id', user!.id)
        .order('full_name');
      return data || [];
    },
    enabled: !!companyId && open,
  });

  const sendKudos = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('corp_kudos')
        .insert({ company_id: companyId, from_user_id: user!.id, to_user_id: toUserId, category, message: message || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
      queryClient.invalidateQueries({ queryKey: ['corp-kudos'] });
      toast({ title: 'Kudos enviado! 🎉' });
      setOpen(false);
      setToUserId('');
      setMessage('');
      setCategory('teamwork');
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <Award className="h-4 w-4 text-amber-500" />
          <span className="hidden sm:inline">Kudos</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Enviar Kudos
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Para quem?</Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger><SelectValue placeholder="Selecione um colega" /></SelectTrigger>
              <SelectContent>
                {colleagues.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mensagem (opcional)</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Por que essa pessoa merece este reconhecimento?" rows={2} />
          </div>
          <Button onClick={() => sendKudos.mutate()} disabled={!toUserId || sendKudos.isPending} className="w-full">
            {sendKudos.isPending ? 'Enviando...' : 'Enviar Kudos 🏆'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedKudosDialog;
