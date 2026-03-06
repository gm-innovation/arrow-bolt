import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Camera, Pencil, Check, X, Briefcase, Calendar, Users, MessageCircle, Award, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import FeedUserLevel from '@/components/corp/FeedUserLevel';

const ROLE_LABELS: Record<string, string> = {
  technician: 'Técnico', admin: 'Administrador', hr: 'RH', manager: 'Gerente',
  commercial: 'Comercial', qualidade: 'Qualidade', compras: 'Suprimentos',
  financeiro: 'Financeiro', super_admin: 'Super Admin', director: 'Diretor', corp: 'Corporativo',
};

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');

  const targetUserId = userId || user?.id;
  const isOwnProfile = targetUserId === user?.id;

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId!)
        .single();
      return data;
    },
    enabled: !!targetUserId,
  });

  // Fetch role
  const { data: roleData } = useQuery({
    queryKey: ['user-role', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId!)
        .maybeSingle();
      return data;
    },
    enabled: !!targetUserId,
  });

  // Fetch groups
  const { data: groups = [] } = useQuery({
    queryKey: ['user-groups', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('corp_group_members')
        .select('corp_groups:corp_groups!corp_group_members_group_id_fkey(id, name)')
        .eq('user_id', targetUserId!);
      return (data || []).map((m: any) => ({ id: m.corp_groups?.id, name: m.corp_groups?.name })).filter((g: any) => g.name);
    },
    enabled: !!targetUserId,
  });

  // Fetch badges
  const { data: badges = [] } = useQuery({
    queryKey: ['user-badges', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('corp_badges')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('awarded_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!targetUserId,
  });

  // Fetch recent posts
  const { data: recentPosts = [] } = useQuery({
    queryKey: ['user-posts', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('corp_feed_posts')
        .select('id, content, title, created_at')
        .eq('author_id', targetUserId!)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!targetUserId,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['user-profile-stats', targetUserId],
    queryFn: async () => {
      const [{ count: postsCount }, { count: likesCount }] = await Promise.all([
        supabase.from('corp_feed_posts').select('id', { count: 'exact', head: true }).eq('author_id', targetUserId!),
        supabase.from('corp_feed_likes').select('id', { count: 'exact', head: true })
          .in('post_id', (await supabase.from('corp_feed_posts').select('id').eq('author_id', targetUserId!)).data?.map((p: any) => p.id) || []),
      ]);
      return { posts: postsCount || 0, likes: likesCount || 0 };
    },
    enabled: !!targetUserId,
  });

  // Update bio
  const updateBio = useMutation({
    mutationFn: async (bio: string) => {
      await supabase.from('profiles').update({ bio } as any).eq('id', user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', targetUserId] });
      setEditingBio(false);
      toast({ title: 'Bio atualizada' });
    },
  });

  // Upload cover
  const uploadCover = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `covers/${user!.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('user-avatars').upload(path, file, { upsert: true });
    if (uploadError) { toast({ title: 'Erro ao enviar capa', variant: 'destructive' }); return; }
    const { data: { publicUrl } } = supabase.storage.from('user-avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ cover_url: publicUrl } as any).eq('id', user!.id);
    queryClient.invalidateQueries({ queryKey: ['user-profile', targetUserId] });
    toast({ title: 'Capa atualizada' });
  };

  // Upload avatar
  const uploadAvatar = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `${user!.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('user-avatars').upload(path, file, { upsert: true });
    if (uploadError) { toast({ title: 'Erro ao enviar avatar', variant: 'destructive' }); return; }
    const { data: { publicUrl } } = supabase.storage.from('user-avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user!.id);
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    queryClient.invalidateQueries({ queryKey: ['user-profile', targetUserId] });
    toast({ title: 'Avatar atualizado' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Perfil não encontrado</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  const initials = profile.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const role = roleData?.role;
  const tenure = profile.hire_date ? formatDistanceToNow(new Date(profile.hire_date), { locale: ptBR }) : null;
  const age = profile.birth_date ? differenceInYears(new Date(), new Date(profile.birth_date)) : null;
  const bio = (profile as any).bio || '';
  const coverUrl = (profile as any).cover_url || '';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <Card className="overflow-hidden">
        {/* Cover */}
        <div className="relative h-48 bg-gradient-to-r from-primary/30 to-primary/10">
          {coverUrl && (
            <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
          )}
          {isOwnProfile && (
            <>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-3 right-3 gap-1.5 opacity-80 hover:opacity-100"
                onClick={() => coverInputRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" /> Alterar capa
              </Button>
            </>
          )}
        </div>

        <CardContent className="relative pt-0 px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4">
            <Avatar className="h-28 w-28 ring-4 ring-card">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                <button
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Name & Role */}
          <div className="space-y-1 mb-4">
            <h1 className="text-xl font-bold">{profile.full_name || 'Usuário'}</h1>
            <div className="flex items-center gap-2">
              {role && <Badge variant="secondary" className="text-xs">{ROLE_LABELS[role] || role}</Badge>}
              {profile.company_id && targetUserId && (
                <FeedUserLevel userId={targetUserId} companyId={profile.company_id} />
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="mb-4">
            {editingBio ? (
              <div className="space-y-2">
                <Textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  placeholder="Escreva sobre você..."
                  className="resize-none"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1" onClick={() => updateBio.mutate(bioText)} disabled={updateBio.isPending}>
                    <Check className="h-3.5 w-3.5" /> Salvar
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEditingBio(false)}>
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-sm text-muted-foreground flex-1">
                  {bio || (isOwnProfile ? 'Adicione uma descrição ao seu perfil...' : 'Sem descrição')}
                </p>
                {isOwnProfile && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setBioText(bio); setEditingBio(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-sm">
            {tenure && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4 shrink-0 text-primary/60" />
                <span>Há <span className="font-medium text-foreground">{tenure}</span></span>
              </div>
            )}
            {age !== null && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0 text-primary/60" />
                <span className="font-medium text-foreground">{age} anos</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="h-4 w-4 shrink-0 text-primary/60" />
              <span className="font-medium text-foreground">{stats?.posts ?? 0}</span> posts
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Award className="h-4 w-4 shrink-0 text-primary/60" />
              <span className="font-medium text-foreground">{badges.length}</span> conquistas
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Groups & Badges */}
        <div className="space-y-6">
          {/* Groups */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Users className="h-4 w-4 text-primary/60" /> Grupos
              </h3>
              {groups.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((g: any) => (
                    <Badge key={g.id} variant="outline" className="text-xs cursor-pointer hover:bg-accent" onClick={() => navigate(`/corp/groups/${g.id}`)}>
                      {g.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum grupo</p>
              )}
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Award className="h-4 w-4 text-primary/60" /> Conquistas
              </h3>
              {badges.length > 0 ? (
                <div className="space-y-2">
                  {badges.map((b: any) => (
                    <div key={b.id} className="flex items-center gap-2 text-xs">
                      <span className="text-lg">{b.icon || '🏆'}</span>
                      <div>
                        <p className="font-medium">{b.title}</p>
                        {b.description && <p className="text-muted-foreground">{b.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma conquista ainda</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Recent Posts */}
        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Publicações recentes</h3>
              {recentPosts.length > 0 ? (
                <div className="space-y-3">
                  {recentPosts.map((post: any) => (
                    <div key={post.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                      {post.title && <p className="text-sm font-medium">{post.title}</p>}
                      <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma publicação ainda</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
