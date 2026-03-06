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
import { Camera, Pencil, Check, X, Briefcase, Calendar, MessageCircle, Award, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import FeedUserLevel from '@/components/corp/FeedUserLevel';
import UserProfileLeftSidebar from '@/components/corp/UserProfileLeftSidebar';
import UserProfileSharedPosts from '@/components/corp/UserProfileSharedPosts';

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

  // Upload cover — same logic as avatar
  const uploadCover = async (file: File) => {
    const ext = file.name.split('.').pop();
    const timestamp = Date.now();
    const path = `${user!.id}/cover-${timestamp}.${ext}`;

    try {
      // Delete old cover files
      const { data: oldFiles } = await supabase.storage.from('user-avatars').list(user!.id, { search: 'cover-' });
      if (oldFiles?.length) {
        await supabase.storage.from('user-avatars').remove(oldFiles.map(f => `${user!.id}/${f.name}`));
      }

      const { error: uploadError } = await supabase.storage.from('user-avatars').upload(path, file, {
        upsert: true,
        cacheControl: '0',
      });

      if (uploadError) {
        toast({ title: 'Erro ao enviar capa', description: uploadError.message, variant: 'destructive' });
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('user-avatars').getPublicUrl(path);
      const versionedUrl = `${publicUrl}?v=${timestamp}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_url: versionedUrl } as any)
        .eq('id', user!.id);

      if (updateError) {
        toast({ title: 'Erro ao salvar capa', description: updateError.message, variant: 'destructive' });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['user-profile', targetUserId] });
      toast({ title: 'Capa atualizada' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar capa', description: err?.message || 'Erro desconhecido', variant: 'destructive' });
    }
  };

  // Upload avatar
  const uploadAvatar = async (file: File) => {
    const ext = file.name.split('.').pop();
    const timestamp = Date.now();
    const path = `${user!.id}/avatar-${timestamp}.${ext}`;

    // Delete old avatar files
    const { data: oldFiles } = await supabase.storage.from('user-avatars').list(user!.id, { search: 'avatar-' });
    if (oldFiles?.length) {
      await supabase.storage.from('user-avatars').remove(oldFiles.map(f => `${user!.id}/${f.name}`));
    }

    const { error: uploadError } = await supabase.storage.from('user-avatars').upload(path, file, { upsert: true, cacheControl: '0' });
    if (uploadError) {
      toast({ title: 'Erro ao enviar avatar', description: uploadError.message, variant: 'destructive' });
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('user-avatars').getPublicUrl(path);
    const versionedUrl = `${publicUrl}?v=${timestamp}`;
    await supabase.from('profiles').update({ avatar_url: versionedUrl }).eq('id', user!.id);
    await supabase.auth.updateUser({ data: { avatar_url: versionedUrl } });
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
    <div className="max-w-[1100px] mx-auto space-y-6 pb-8 px-2">
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
              <input
                id="cover-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) uploadCover(e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <label
                htmlFor="cover-file-input"
                className="absolute bottom-3 right-3 h-8 px-3 rounded-md bg-secondary text-secondary-foreground flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" /> Alterar capa
              </label>
            </>
          )}
        </div>

        <CardContent className="relative pt-0 px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4 w-fit">
            <Avatar className="h-28 w-28 ring-4 ring-card">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) uploadAvatar(e.target.files[0]); e.target.value = ''; }} />
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
              <span className="font-medium text-foreground">0</span> conquistas
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Left column */}
        <UserProfileLeftSidebar targetUserId={targetUserId!} />

        {/* Center column: shared posts */}
        <UserProfileSharedPosts targetUserId={targetUserId!} />
      </div>
    </div>
  );
};

export default UserProfile;
