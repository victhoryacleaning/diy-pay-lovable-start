import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import VideoPlayer from '@/components/core/VideoPlayer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

// Define os tipos de dados para clareza
interface Lesson {
  id: string;
  title: string;
  content_url: string;
  is_completed: boolean;
}
interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}
interface CourseData {
  id: string;
  name: string;
  modules: Module[];
}

const CoursePlayerPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const queryClient = useQueryClient();

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  // Query para buscar os dados do curso e progresso
  const { data: course, isLoading, error } = useQuery<CourseData>({
    queryKey: ['courseData', productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-course-player-data', {
        body: { product_id: productId },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!productId,
  });

  // Encontra a primeira aula não concluída para iniciar
  useEffect(() => {
    if (course && !activeLesson) {
      const firstUncompletedLesson = course.modules.flatMap(m => m.lessons).find(l => !l.is_completed);
      setActiveLesson(firstUncompletedLesson || course.modules[0]?.lessons[0] || null);
    }
  }, [course, activeLesson]);

  // Mutação para atualizar o progresso da aula
  const { mutate: updateProgress } = useMutation({
    mutationFn: async ({ lessonId, isCompleted }: { lessonId: string; isCompleted: boolean }) => {
      const { error } = await supabase.functions.invoke('update-lesson-progress', {
        body: { lesson_id: lessonId, product_id: productId, is_completed: isCompleted },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Progresso atualizado!');
      queryClient.invalidateQueries({ queryKey: ['courseData', productId] }); // Revalida os dados para atualizar a UI
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar progresso: ${err.message}`);
    }
  });

  if (isLoading) return <div className="p-8">Carregando curso...</div>;
  if (error) return <div className="p-8 text-destructive">Erro ao carregar curso: {error.message}</div>;
  if (!course) return <div className="p-8">Curso não encontrado.</div>;

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Coluna Esquerda: Player e Informações */}
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-4">{activeLesson?.title || course.name}</h1>
        {activeLesson ? (
          <>
            <VideoPlayer 
              url={activeLesson.content_url}
              onEnded={() => updateProgress({ lessonId: activeLesson.id, isCompleted: true })}
            />
            <div className="mt-4">
              <Button onClick={() => updateProgress({ lessonId: activeLesson.id, isCompleted: !activeLesson.is_completed })}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {activeLesson.is_completed ? 'Marcar como não concluída' : 'Marcar como concluída'}
              </Button>
            </div>
            {/* Aqui podem entrar mais informações da aula: descrição, downloads, etc. */}
          </>
        ) : (
          <div className="text-center p-10">Selecione uma aula para começar.</div>
        )}
      </main>

      {/* Coluna Direita: Syllabus (Índice) */}
      <aside className="w-80 bg-muted p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{course.name}</h2>
        <Accordion type="single" collapsible defaultValue={`module-${course.modules[0]?.id}`}>
          {course.modules.map((module) => (
            <AccordionItem value={`module-${module.id}`} key={module.id}>
              <AccordionTrigger>{module.title}</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {module.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson)}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                        activeLesson?.id === lesson.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <span className="flex items-center">
                        {lesson.is_completed ? 
                          <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> : 
                          <PlayCircle className="h-4 w-4 mr-2" />
                        }
                        {lesson.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </aside>
    </div>
  );
};

export default CoursePlayerPage;