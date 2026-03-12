import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Search, BookOpen, Clock, Play } from 'lucide-react';
import { useUniversityCourses } from '@/hooks/useUniversity';

const University = () => {
  const { data: courses, isLoading } = useUniversityCourses(true); // published only
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const categories = [...new Set(courses?.map(c => c.category || 'geral') || [])];
  const filtered = courses?.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
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
          <Input placeholder="Buscar cursos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" onClick={() => navigate('/corp/university/my-learning')}>
          <BookOpen className="h-4 w-4 mr-2" /> Meu Aprendizado
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando catálogo...</div>
      ) : !filtered?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum curso disponível no momento.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(course => (
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
    </div>
  );
};

export default University;
