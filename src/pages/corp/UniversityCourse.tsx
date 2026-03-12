import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle2, Circle, Play, FileText, BookOpen, Clock } from 'lucide-react';
import {
  useUniversityCourse,
  useUniversityModules,
  useMyEnrollments,
  useModuleProgress,
  useMarkModuleComplete,
  useUpdateEnrollmentStatus,
  useIssueCertificate,
} from '@/hooks/useUniversity';
import { useAuth } from '@/contexts/AuthContext';

const UniversityCourse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: course } = useUniversityCourse(id);
  const { data: modules } = useUniversityModules(id);
  const { data: enrollments } = useMyEnrollments();
  const enrollment = enrollments?.find(e => e.course_id === id);
  const { data: progress } = useModuleProgress(enrollment?.id);
  const markComplete = useMarkModuleComplete();
  const updateStatus = useUpdateEnrollmentStatus();
  const issueCert = useIssueCertificate();
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const completedModules = progress?.filter(p => p.completed)?.length || 0;
  const totalModules = modules?.length || 0;
  const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const isModuleCompleted = (moduleId: string) => progress?.some(p => p.module_id === moduleId && p.completed);

  const currentModule = modules?.find(m => m.id === activeModule);

  // Auto-start enrollment
  useEffect(() => {
    if (enrollment && enrollment.status === 'not_started' && activeModule) {
      updateStatus.mutate({ id: enrollment.id, status: 'in_progress' });
    }
  }, [activeModule, enrollment]);

  // Auto-complete enrollment & issue certificate
  useEffect(() => {
    if (enrollment && completedModules === totalModules && totalModules > 0 && enrollment.status !== 'completed') {
      updateStatus.mutate({ id: enrollment.id, status: 'completed' });
      issueCert.mutate({ enrollment_id: enrollment.id, user_id: user!.id, course_id: id! });
    }
  }, [completedModules, totalModules]);

  const handleMarkComplete = async (moduleId: string) => {
    if (!enrollment) return;
    await markComplete.mutateAsync({ enrollment_id: enrollment.id, module_id: moduleId });
  };

  if (!course) return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar - Module list */}
        <div className="w-full md:w-80 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{course.title}</CardTitle>
              <Badge variant="outline">{course.category}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{course.description}</p>
              {course.duration_minutes ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {course.duration_minutes} min</p>
              ) : null}

              {enrollment && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">{completedModules}/{totalModules} módulos</p>
                </div>
              )}

              {!enrollment && (
                <p className="text-xs text-amber-600">Você não está matriculado neste curso.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Módulos</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {modules?.map((m, i) => {
                const done = isModuleCompleted(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveModule(m.id)}
                    className={`w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors hover:bg-muted ${activeModule === m.id ? 'bg-muted font-medium' : ''}`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="truncate">{i + 1}. {m.title}</span>
                  </button>
                );
              })}
              {!modules?.length && <p className="text-sm text-muted-foreground">Nenhum módulo</p>}
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {!activeModule ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-20">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Selecione um módulo para começar</p>
              </CardContent>
            </Card>
          ) : currentModule ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{currentModule.title}</CardTitle>
                  <Badge variant="outline">{currentModule.content_type}</Badge>
                </div>
                {currentModule.description && <p className="text-sm text-muted-foreground">{currentModule.description}</p>}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Content Player */}
                {currentModule.content_type === 'video' && currentModule.content_url && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video src={currentModule.content_url} controls className="w-full h-full" />
                  </div>
                )}
                {currentModule.content_type === 'pdf' && currentModule.content_url && (
                  <div className="border rounded-lg overflow-hidden" style={{ height: '70vh' }}>
                    <iframe src={currentModule.content_url} className="w-full h-full" title={currentModule.title} />
                  </div>
                )}
                {currentModule.content_type === 'text' && (
                  <div className="prose max-w-none">
                    <p className="text-foreground whitespace-pre-wrap">{currentModule.content_url || 'Conteúdo não disponível.'}</p>
                  </div>
                )}

                {/* Mark Complete */}
                {enrollment && !isModuleCompleted(currentModule.id) && (
                  <Button onClick={() => handleMarkComplete(currentModule.id)} className="w-full" disabled={markComplete.isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como concluído
                  </Button>
                )}
                {isModuleCompleted(currentModule.id) && (
                  <div className="flex items-center gap-2 text-green-600 justify-center py-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Módulo concluído!</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default UniversityCourse;
