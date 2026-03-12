import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Search, BookOpen, Clock, Play, Route } from 'lucide-react';
import { useUniversityCourses, useUniversityTrails, useTrailCourses } from '@/hooks/useUniversity';

const University = () => {
  const { data: courses, isLoading } = useUniversityCourses(true);
  const { data: trails, isLoading: trailsLoading } = useUniversityTrails(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filteredCourses = courses?.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredTrails = trails?.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Universidade Corporativa</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" onClick={() => navigate('/corp/university/my-learning')}>
          <BookOpen className="h-4 w-4 mr-2" /> Meu Aprendizado
        </Button>
      </div>

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses" className="gap-2"><BookOpen className="h-4 w-4" /> Cursos</TabsTrigger>
          <TabsTrigger value="trails" className="gap-2"><Route className="h-4 w-4" /> Trilhas</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando catálogo...</div>
          ) : !filteredCourses?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum curso disponível no momento.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map(course => (
                <Card key={course.id} className="group cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/corp/university/course/${course.id}`)}>
                  {course.thumbnail_url && (
                    <div className="h-40 overflow-hidden rounded-t-lg">
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <Badge variant="outline" className="w-fit">{course.category}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{course.description || 'Sem descrição'}</p>
                    <div className="flex items-center justify-between">
                      {course.duration_minutes ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {course.duration_minutes} min
                        </span>
                      ) : <span />}
                      <Button size="sm" variant="ghost" className="gap-1">
                        <Play className="h-3 w-3" /> Iniciar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trails">
          {trailsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando trilhas...</div>
          ) : !filteredTrails?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma trilha disponível no momento.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTrails.map(trail => (
                <TrailCard key={trail.id} trail={trail} onClick={() => navigate(`/corp/university/trail/${trail.id}`)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function TrailCard({ trail, onClick }: { trail: any; onClick: () => void }) {
  const { data: trailCourses } = useTrailCourses(trail.id);
  const totalDuration = trailCourses?.reduce((sum, tc) => sum + (tc.course?.duration_minutes || 0), 0) || 0;

  return (
    <Card className="group cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          {trail.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{trail.description || 'Sem descrição'}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{trailCourses?.length || 0} cursos</span>
          {totalDuration > 0 && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {totalDuration} min</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default University;
