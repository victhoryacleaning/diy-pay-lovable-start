import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StudentLayout } from '@/components/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen } from 'lucide-react';

const MembersHubPage = () => {
  const { spaceId } = useParams<{ spaceId: string }>();

  const { data: hubData, isLoading, isError, error } = useQuery({
    queryKey: ['membersHub', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-members-hub-data', {
        body: { space_id: spaceId },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!spaceId,
  });

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="p-8 space-y-8">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-8 w-1/4" />
          <div className="flex space-x-4">
            <Skeleton className="h-48 w-1/3" />
            <Skeleton className="h-48 w-1/3" />
            <Skeleton className="h-48 w-1/3" />
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (isError) return <StudentLayout><div className="p-8 text-destructive">Erro: {error.message}</div></StudentLayout>;

  return (
    <StudentLayout>
      <div className="w-full" style={{ backgroundColor: hubData?.background_color || 'transparent' }}>
        {/* Hero Banner */}
        {hubData?.banner_image_url && (
          <div className="w-full h-64 md:h-96 bg-cover bg-center" style={{ backgroundImage: `url(${hubData.banner_image_url})` }}>
            {/* Pode ter conteúdo sobre o banner aqui se necessário */}
          </div>
        )}

        {/* Containers como Carrosséis */}
        <div className="p-4 md:p-8 space-y-8">
          {hubData?.space_containers.map((container) => (
            <div key={container.id}>
              <h2 className="text-2xl font-bold mb-4">{container.title}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {container.space_products.map(({ product }) => (
                  <Link to={`/members/courses/${product.id}`} key={product.id}>
                    <Card className="hover:scale-105 transition-transform duration-200">
                      <CardContent className="p-0">
                        <div className="aspect-square bg-muted rounded-t-lg flex items-center justify-center overflow-hidden">
                          {product.cover_image_url ? (
                            <img 
                              src={product.cover_image_url} 
                              alt={product.name} 
                              className="object-cover w-full h-full" 
                            />
                          ) : (
                            <BookOpen className="h-12 w-12 text-muted-foreground" />
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </StudentLayout>
  );
};

export default MembersHubPage;