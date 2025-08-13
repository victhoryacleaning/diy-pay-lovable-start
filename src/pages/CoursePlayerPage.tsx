import { useParams } from 'react-router-dom';
import { StudentLayout } from '@/components/StudentLayout';

export default function CoursePlayerPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <StudentLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-4">Player do Curso</h1>
        <p className="text-muted-foreground">
          Esta é uma página placeholder para o curso: <strong>{slug}</strong>
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          O player completo será implementado nas próximas iterações.
        </p>
      </div>
    </StudentLayout>
  );
}