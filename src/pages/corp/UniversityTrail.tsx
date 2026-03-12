import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Route, Clock, CheckCircle2 } from 'lucide-react';
import { useUniversityTrail, useTrailCourses, useMyEnrollments } from '@/hooks/useUniversity';
import { useUniversityCompletion } from '@/hooks/useUniversityCompletion';

const UniversityTrail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: trail } = useUniversityTrail(id);
  const { data: trailCourses, isLoading } = useTrailCourses(id);
  const { data: enrollments } = useMyEnrollments();
  const { publishTrailCompletion } = useUniversityCompletion();
  const completionPostedRef = useRef(false);

  const getEnrollment = (courseId: string) => enrollments?.find(e => e.course_id === courseId);
  const completedCourses = trailCourses?.filter(tc => getEnrollment(tc.course_id)?.status === 'completed').length || 0;
  const totalCourses = trailCourses?.length || 0;
  const progressPercent = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  // Auto-post + badge when trail is 100% complete
  useEffect(() => {
    if (trail && completedCourses === totalCourses && totalCourses > 0 && !completionPostedRef.current) {
      completionPostedRef.current = true;
      publishTrailCompletion(trail.title);
    }
  }, [completedCourses, totalCourses, trail]);

  if (!trail) return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Route className="h-6 w-6 text-primary" />
            {trail.title}
          </CardTitle>
          {trail.description && <p className="text-sm text-muted-foreground">{trail.description}</p>}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso da Trilha</span>
              <span className="font-medium">{completedCourses}/{totalCourses} cursos — {progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando cursos...</div>
      ) : (
        <div className="space-y-3">
          {trailCourses?.map((tc, i) => {
            const enrollment = getEnrollment(tc.course_id);
            const isCompleted = enrollment?.status === 'completed';
            const isInProgress = enrollment?.status === 'in_progress';

            return (
              <Card
                key={tc.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/corp/university/course/${tc.course_id}`)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-sm font-bold shrink-0">
                    {isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{tc.course?.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{tc.course?.description || 'Sem descrição'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {tc.course?.duration_minutes ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {tc.course.duration_minutes} min
                      </span>
                    ) : null}
                    <Badge variant={isCompleted ? 'default' : isInProgress ? 'secondary' : 'outline'}>
                      {isCompleted ? 'Concluído' : isInProgress ? 'Em andamento' : 'Iniciar'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UniversityTrail;
