import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Plus, Search, BookOpen, Users, Award, Pencil, Trash2, Eye, Upload, Route, X, FileText, Loader2 } from 'lucide-react';
import {
  useUniversityCourses, useCreateCourse, useUpdateCourse, useDeleteCourse,
  useUniversityModules, useCreateModule, useDeleteModule,
  useUniversityTrails, useCreateTrail, useUpdateTrail, useDeleteTrail,
  useTrailCourses, useAddCourseToTrail, useRemoveCourseFromTrail,
  useCertificateUserData,
} from '@/hooks/useUniversity';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import HRUniversityEnrollments from '@/components/university/HRUniversityEnrollments';
import HRUniversityAchievements from '@/components/university/HRUniversityAchievements';
import { pdf } from '@react-pdf/renderer';
import CertificatePDF from '@/components/university/CertificatePDF';
import { PDFCanvasViewer } from '@/components/ui/PDFCanvasViewer';

const CATEGORIES = ['geral', 'onboarding', 'tecnico', 'seguranca', 'compliance', 'lideranca'];

const University = () => {
  const { data: courses, isLoading } = useUniversityCourses();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editCourse, setEditCourse] = useState<any>(null);
  const [modulesDialogCourse, setModulesDialogCourse] = useState<string | null>(null);

  // Create/Edit form state
  const [form, setForm] = useState({ title: '', description: '', category: 'geral', duration_minutes: 0 });

  const filteredCourses = courses?.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await createCourse.mutateAsync(form);
    setShowCreateDialog(false);
    setForm({ title: '', description: '', category: 'geral', duration_minutes: 0 });
  };

  const handleEdit = async () => {
    if (!editCourse) return;
    await updateCourse.mutateAsync({ id: editCourse.id, ...form });
    setEditCourse(null);
    setForm({ title: '', description: '', category: 'geral', duration_minutes: 0 });
  };

  const handleTogglePublish = async (course: any) => {
    await updateCourse.mutateAsync({ id: course.id, is_published: !course.is_published });
  };

  const openEdit = (course: any) => {
    setForm({ title: course.title, description: course.description || '', category: course.category || 'geral', duration_minutes: course.duration_minutes || 0 });
    setEditCourse(course);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Universidade Corporativa</h1>
        </div>
      </div>

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses" className="gap-2"><BookOpen className="h-4 w-4" /> Cursos</TabsTrigger>
          <TabsTrigger value="trails" className="gap-2"><Route className="h-4 w-4" /> Trilhas</TabsTrigger>
          <TabsTrigger value="enrollments" className="gap-2"><Users className="h-4 w-4" /> Matrículas</TabsTrigger>
          <TabsTrigger value="achievements" className="gap-2"><Award className="h-4 w-4" /> Conquistas</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cursos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={() => { setForm({ title: '', description: '', category: 'geral', duration_minutes: 0 }); setShowCreateDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo Curso
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : !filteredCourses?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum curso cadastrado. Clique em "Novo Curso" para começar.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map(course => (
                <Card key={course.id} className="flex flex-col">
                  {course.thumbnail_url && (
                    <div className="h-40 overflow-hidden rounded-t-lg">
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <Badge variant={course.is_published ? 'default' : 'secondary'}>
                        {course.is_published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="w-fit">{course.category}</Badge>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{course.description || 'Sem descrição'}</p>
                    {course.duration_minutes ? <p className="text-xs text-muted-foreground mb-3">⏱ {course.duration_minutes} min</p> : null}
                    <div className="mt-auto flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => openEdit(course)}><Pencil className="h-3 w-3 mr-1" /> Editar</Button>
                      <Button size="sm" variant="outline" onClick={() => setModulesDialogCourse(course.id)}><Eye className="h-3 w-3 mr-1" /> Módulos</Button>
                      <Button size="sm" variant="outline" onClick={() => handleTogglePublish(course)}>
                        {course.is_published ? 'Despublicar' : 'Publicar'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteCourse.mutate(course.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trails">
          <HRTrailsTab />
        </TabsContent>

        <TabsContent value="enrollments">
          <HRUniversityEnrollments />
        </TabsContent>

        <TabsContent value="achievements">
          <HRUniversityAchievements />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <CourseFormDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} form={form} setForm={setForm} onSubmit={handleCreate} title="Novo Curso" loading={createCourse.isPending} />

      {/* Edit Dialog */}
      <CourseFormDialog open={!!editCourse} onOpenChange={v => { if (!v) setEditCourse(null); }} form={form} setForm={setForm} onSubmit={handleEdit} title="Editar Curso" loading={updateCourse.isPending} />

      {/* Modules Dialog */}
      {modulesDialogCourse && (
        <ModulesDialog courseId={modulesDialogCourse} onClose={() => setModulesDialogCourse(null)} />
      )}
    </div>
  );
};

function CourseFormDialog({ open, onOpenChange, form, setForm, onSubmit, title, loading }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duração (minutos)</Label>
            <Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={!form.title || loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModulesDialog({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const { data: modules, isLoading } = useUniversityModules(courseId);
  const createModule = useCreateModule();
  const deleteModule = useDeleteModule();
  const { profile } = useAuth();
  const [newModule, setNewModule] = useState({ title: '', content_type: 'text', content_url: '', duration_minutes: 0 });
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${profile?.company_id}/${courseId}/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from('university-content').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('university-content').getPublicUrl(path);
      setNewModule(prev => ({
        ...prev,
        content_url: publicUrl,
        content_type: file.type.includes('pdf') ? 'pdf' : file.type.includes('video') ? 'video' : 'text',
      }));
      toast({ title: 'Arquivo enviado!' });
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleAddModule = async () => {
    await createModule.mutateAsync({
      course_id: courseId,
      ...newModule,
      sort_order: (modules?.length || 0) + 1,
    });
    setNewModule({ title: '', content_type: 'text', content_url: '', duration_minutes: 0 });
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Módulos do Curso</DialogTitle></DialogHeader>

        {isLoading ? <p>Carregando...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules?.map((m, i) => (
                <TableRow key={m.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{m.title}</TableCell>
                  <TableCell><Badge variant="outline">{m.content_type}</Badge></TableCell>
                  <TableCell>{m.duration_minutes} min</TableCell>
                  <TableCell>
                    <Button size="sm" variant="destructive" onClick={() => deleteModule.mutate(m.id)}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!modules?.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum módulo</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <div className="border-t pt-4 space-y-3">
          <h4 className="font-medium">Adicionar Módulo</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Título</Label>
              <Input value={newModule.title} onChange={e => setNewModule({ ...newModule, title: e.target.value })} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newModule.content_type} onValueChange={v => setNewModule({ ...newModule, content_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Arquivo ou URL do conteúdo</Label>
            <div className="flex gap-2">
              <Input value={newModule.content_url} onChange={e => setNewModule({ ...newModule, content_url: e.target.value })} placeholder="URL ou faça upload" className="flex-1" />
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById('module-upload')?.click()}>
                <Upload className="h-4 w-4 mr-1" /> {uploading ? 'Enviando...' : 'Upload'}
              </Button>
              <input id="module-upload" type="file" className="hidden" accept="video/*,.pdf" onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
            </div>
          </div>
          <div>
            <Label>Duração (min)</Label>
            <Input type="number" value={newModule.duration_minutes} onChange={e => setNewModule({ ...newModule, duration_minutes: parseInt(e.target.value) || 0 })} className="w-32" />
          </div>
          <Button onClick={handleAddModule} disabled={!newModule.title || createModule.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Módulo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- TRAILS TAB ----

function HRTrailsTab() {
  const { data: trails, isLoading } = useUniversityTrails();
  const createTrail = useCreateTrail();
  const updateTrail = useUpdateTrail();
  const deleteTrail = useDeleteTrail();
  const [showCreate, setShowCreate] = useState(false);
  const [editTrail, setEditTrail] = useState<any>(null);
  const [manageTrailId, setManageTrailId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });

  const handleCreate = async () => {
    await createTrail.mutateAsync(form);
    setShowCreate(false);
    setForm({ title: '', description: '' });
  };

  const handleEdit = async () => {
    if (!editTrail) return;
    await updateTrail.mutateAsync({ id: editTrail.id, ...form });
    setEditTrail(null);
    setForm({ title: '', description: '' });
  };

  const openEdit = (t: any) => {
    setForm({ title: t.title, description: t.description || '' });
    setEditTrail(t);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ title: '', description: '' }); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Trilha
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : !trails?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma trilha cadastrada.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trails.map(trail => (
            <Card key={trail.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{trail.title}</CardTitle>
                  <Badge variant={trail.is_published ? 'default' : 'secondary'}>
                    {trail.is_published ? 'Publicada' : 'Rascunho'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{trail.description || 'Sem descrição'}</p>
                <div className="mt-auto flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(trail)}><Pencil className="h-3 w-3 mr-1" /> Editar</Button>
                  <Button size="sm" variant="outline" onClick={() => setManageTrailId(trail.id)}><Eye className="h-3 w-3 mr-1" /> Cursos</Button>
                  <Button size="sm" variant="outline" onClick={() => updateTrail.mutate({ id: trail.id, is_published: !trail.is_published })}>
                    {trail.is_published ? 'Despublicar' : 'Publicar'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteTrail.mutate(trail.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Trilha</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={!form.title || createTrail.isPending}>{createTrail.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTrail} onOpenChange={v => { if (!v) setEditTrail(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Trilha</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleEdit} disabled={!form.title || updateTrail.isPending}>{updateTrail.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Courses Dialog */}
      {manageTrailId && <TrailCoursesDialog trailId={manageTrailId} onClose={() => setManageTrailId(null)} />}
    </div>
  );
}

function TrailCoursesDialog({ trailId, onClose }: { trailId: string; onClose: () => void }) {
  const { data: trailCourses, isLoading } = useTrailCourses(trailId);
  const { data: allCourses } = useUniversityCourses();
  const addCourse = useAddCourseToTrail();
  const removeCourse = useRemoveCourseFromTrail();
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const availableCourses = allCourses?.filter(c => !trailCourses?.some(tc => tc.course_id === c.id));

  const handleAdd = async () => {
    if (!selectedCourseId) return;
    await addCourse.mutateAsync({ trail_id: trailId, course_id: selectedCourseId, sort_order: (trailCourses?.length || 0) + 1 });
    setSelectedCourseId('');
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cursos da Trilha</DialogTitle></DialogHeader>

        {isLoading ? <p>Carregando...</p> : (
          <div className="space-y-2">
            {trailCourses?.map((tc, i) => (
              <div key={tc.id} className="flex items-center justify-between p-2 border rounded-md">
                <span className="text-sm">{i + 1}. {tc.course?.title}</span>
                <Button size="sm" variant="ghost" onClick={() => removeCourse.mutate(tc.id)}><X className="h-3 w-3" /></Button>
              </div>
            ))}
            {!trailCourses?.length && <p className="text-sm text-muted-foreground text-center py-4">Nenhum curso na trilha</p>}
          </div>
        )}

        <div className="border-t pt-4 flex gap-2">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um curso" /></SelectTrigger>
            <SelectContent>
              {availableCourses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!selectedCourseId || addCourse.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default University;
