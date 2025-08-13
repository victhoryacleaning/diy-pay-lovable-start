import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StudentLayout } from '@/components/StudentLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft } from 'lucide-react';

export default function CoursePlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  // Extrai o ID do slug. Ex: "produto-b-351595" -> "351595"
  const spaceId = slug?.split('-').pop(); 
  const [activeLesson, setActiveLesson] = useState<any>(null);

  const { data: course, isLoading, isError, error } = useQuery({
    queryKey: ['course-player-details', spaceId],
    queryFn: async () => {
      if (!spaceId) return null;
      const { data, error } = await supabase.functions.invoke('get-space-details', { body: { spaceId } });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!spaceId,
  });

  // Define a primeira aula como ativa por padrão
  useEffect(() => {
    if (course?.principal_product?.modules?.[0]?.lessons?.[0]) {
      setActiveLesson(course.principal_product.modules[0].lessons[0]);
    }
  }, [course]);

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="p-8 grid md:grid-cols-4 gap-8">
          <Skeleton className="h-screen md:col-span-1" />
          <Skeleton className="h-screen md:col-span-3" />
        </div>
      </StudentLayout>
    );
  }

  if (isError) {
    return <StudentLayout><div className="p-8 text-destructive">Erro: {error?.message || 'Erro desconhecido'}</div></StudentLayout>;
  }
  
  return (
    <StudentLayout>
      <div className="flex h-full">
        {/* Sidebar de Módulos e Aulas */}
        <aside className="w-1/4 border-r h-full p-4">
          <Link to="/members" className="flex items-center gap-2 text-sm mb-4 p-2 hover:bg-muted rounded">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Meus Cursos
          </Link>
          <h2 className="text-xl font-bold mb-4">{course?.name}</h2>
          <Accordion type="single" collapsible defaultValue={`module-${course?.principal_product?.modules?.[0]?.id}`}>
            {course?.principal_product?.modules?.map((module: any) => (
              <AccordionItem key={module.id} value={`module-${module.id}`}>
                <AccordionTrigger>{module.title}</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1">
                    {module.lessons.map((lesson: any) => (
                      <li 
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson)}
                        className={`p-2 rounded cursor-pointer ${activeLesson?.id === lesson.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      >
                        {lesson.title}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </aside>

        {/* Área de Conteúdo da Aula */}
        <main className="w-3/4 p-8">
          {activeLesson ? (
            <div>
              <h1 className="text-3xl font-bold mb-4">{activeLesson.title}</h1>
              {activeLesson.content_type === 'video' && (
                <div className="aspect-video bg-muted rounded-md">
                  {/* Player de vídeo será embutido aqui */}
                  <p className="p-4">Player do vídeo para: {activeLesson.content_url || 'Vídeo não disponível'}</p>
                </div>
              )}
              <div className="prose mt-8" dangerouslySetInnerHTML={{ __html: activeLesson.content_text || '' }} />
            </div>
          ) : (
            <div className="text-center">
              <p>Selecione uma aula para começar.</p>
            </div>
          )}
        </main>
      </div>
    </StudentLayout>
  );
}