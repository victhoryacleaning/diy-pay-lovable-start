
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ProducerSidebar } from "@/components/ProducerSidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, RotateCcw, Ticket, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SelectProductTypePage = () => {
  const navigate = useNavigate();

  const productTypes = [
    {
      type: 'single_payment',
      title: 'Pagamento Único',
      description: 'Venda e-books, arquivos, cursos ou qualquer produto com um único pagamento.',
      icon: Package,
      color: 'text-blue-600'
    },
    {
      type: 'subscription',
      title: 'Assinatura Recorrente',
      description: 'Crie planos com cobrança semanal, mensal, anual, etc.',
      icon: RotateCcw,
      color: 'text-green-600'
    },
    {
      type: 'event',
      title: 'Evento Presencial',
      description: 'Venda ingressos para seus eventos, workshops ou palestras.',
      icon: Ticket,
      color: 'text-purple-600'
    },
    {
      type: 'donation',
      title: 'Doação',
      description: 'Receba contribuições e ofertas com valor definido pelo doador.',
      icon: Heart,
      color: 'text-red-600'
    }
  ];

  const handleTypeSelect = (type: string) => {
    navigate(`/products/create?type=${type}`);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProducerSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
            <div className="flex items-center gap-2 px-4 py-2 border-b">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">Criar Novo Produto</h1>
            </div>
            
            <div className="container mx-auto px-4 py-8 max-w-4xl">
              {/* Header with back button */}
              <div className="flex items-center gap-4 mb-8">
                <Button
                  variant="outline"
                  onClick={() => navigate('/products')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Que tipo de produto você quer criar?
                  </h2>
                  <p className="text-gray-600">
                    Escolha o tipo que melhor se adapta ao seu produto
                  </p>
                </div>
              </div>

              {/* Product type cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {productTypes.map((productType) => {
                  const IconComponent = productType.icon;
                  return (
                    <Card 
                      key={productType.type}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-diypay-300"
                      onClick={() => handleTypeSelect(productType.type)}
                    >
                      <CardHeader className="text-center pb-4">
                        <div className="flex justify-center mb-4">
                          <div className="p-4 bg-gray-50 rounded-full">
                            <IconComponent className={`h-8 w-8 ${productType.color}`} />
                          </div>
                        </div>
                        <CardTitle className="text-xl">{productType.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <CardDescription className="text-sm leading-relaxed">
                          {productType.description}
                        </CardDescription>
                        <Button 
                          className="mt-4 w-full bg-diypay-600 hover:bg-diypay-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTypeSelect(productType.type);
                          }}
                        >
                          Criar {productType.title}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default SelectProductTypePage;
