import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Search, Edit, Brush } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StudentLayout } from '@/components/StudentLayout';

const fetchMyCourses = async () => {
  const { data, error } = await supabase.functions.invoke('get-my-courses');
  if (error) throw new Error(error.message);
  return data;
};

export default function MyCoursesPage() {
  const { data: courses, isLoading, isError, error } = useQuery({
    queryKey: ['my-courses'],
    queryFn: fetchMyCourses,
  });

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="p-8">
          <Skeleton className="h-64" />
        </div>
      </StudentLayout>
    );
  }

  if (isError) {
    return (
      <StudentLayout>
        <div className="p-8 text-destructive">
          Erro: {error?.message || 'Erro desconhecido'}
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Meus Cursos</h1>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input type="text" placeholder="Buscar..." />
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {courses.map((course: any) => (
              <Card key={course.id} className="flex flex-col">
                <CardContent className="p-0">
                  {/* Imagem quadrada */}
                  <div className="aspect-square bg-muted rounded-t-lg flex items-center justify-center overflow-hidden">
                    {course.cover_image_url ? (
                      <img 
                        src={course.cover_image_url} 
                        alt={course.name} 
                        className="object-cover w-full h-full" 
                      />
                    ) : (
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Conteúdo */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{course.name}</h3>
                    <div className="text-xs text-muted-foreground mb-3 break-all">
                      diypay.com.br/members/{course.space_slug || 'N/A'}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{course.producer_name}</p>
                    
                    {/* Botões */}
                    <div className="flex flex-col gap-2">
                      <Button asChild size="sm" className="w-full" disabled={!course.space_id}>
                        <Link to={course.space_id ? `/spaces/edit/${course.space_id}` : '#'}>
                          <Edit className="mr-2 h-4 w-4" />
                          Conteúdo
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="w-full" disabled={!course.space_id}>
                        <Link to={course.space_id ? `/personalize/edit/${course.space_id}` : '#'}>
                          <Brush className="mr-2 h-4 w-4" />
                          Personalizar
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold mb-2">Você ainda não possui cursos</h2>
            <p className="text-muted-foreground">
              Explore os cursos disponíveis e comece a aprender!
            </p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}