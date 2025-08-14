import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Search } from 'lucide-react';
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => (
              <Card key={course.id}>
                <CardHeader>
                  <div className="aspect-[16/9] bg-muted rounded-md flex items-center justify-center">
                    {course.checkout_image_url ? (
                      <img 
                        src={course.checkout_image_url} 
                        alt={course.name} 
                        className="object-cover w-full h-full rounded-md" 
                      />
                    ) : (
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <CardTitle className="pt-4">{course.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{course.producer_name}</p>
                  {/* Barra de progresso será adicionada aqui */}
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to={`/members/courses/${course.id}`}>Começar</Link>
                  </Button>
                </CardFooter>
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