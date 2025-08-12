// src/pages/PersonalizeSpacePage.tsx
import { useParams } from 'react-router-dom';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PersonalizeSpacePage() {
  const { spaceId } = useParams();
  return (
    <ProducerLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Personalizar Área de Membros</h1>
        <Card>
          <CardHeader>
            <CardTitle>Página de Personalização</CardTitle>
          </CardHeader>
          <CardContent>
            <p>O ID do Space a ser personalizado é: <strong>{spaceId}</strong></p>
            <p className="mt-4 text-muted-foreground">(Funcionalidades de edição de título, URL, produtos e containers serão adicionadas aqui.)</p>
          </CardContent>
        </Card>
      </div>
    </ProducerLayout>
  );
}