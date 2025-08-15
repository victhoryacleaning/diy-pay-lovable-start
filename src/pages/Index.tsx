
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CreditCard, 
  Shield, 
  Zap, 
  Users, 
  TrendingUp, 
  CheckCircle,
  ArrowRight 
} from "lucide-react";
import Header from "@/components/Header";
import { R2TestUpload } from "@/components/core/R2TestUpload";

const Index = () => {
  const features = [
    {
      icon: <CreditCard className="h-8 w-8 text-diypay-600" />,
      title: "Pagamentos Simples",
      description: "Integração fácil com PIX, cartão de crédito e débito. Receba em qualquer lugar."
    },
    {
      icon: <Shield className="h-8 w-8 text-diypay-600" />,
      title: "Segurança Total",
      description: "Criptografia de ponta a ponta e conformidade com as normas do Banco Central."
    },
    {
      icon: <Zap className="h-8 w-8 text-diypay-600" />,
      title: "Transferências Rápidas",
      description: "Receba seus pagamentos em D+1 via PIX ou D+30 para cartões."
    },
    {
      icon: <Users className="h-8 w-8 text-diypay-600" />,
      title: "Gestão de Clientes",
      description: "Acompanhe vendas, clientes e histórico de transações em tempo real."
    }
  ];

  const plans = [
    {
      name: "Básico",
      price: "Grátis",
      description: "Para quem está começando",
      features: [
        "Até 10 transações/mês",
        "PIX e cartão de débito",
        "Suporte por email",
        "Dashboard básico"
      ]
    },
    {
      name: "Profissional",
      price: "5%",
      description: "Para negócios em crescimento",
      features: [
        "Transações ilimitadas",
        "Todos os métodos de pagamento",
        "Suporte 24/7",
        "Relatórios avançados",
        "API personalizada"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "Sob consulta",
      description: "Para grandes volumes",
      features: [
        "Tudo do Profissional",
        "Taxas negociáveis",
        "Gerente dedicado",
        "Integrações customizadas",
        "SLA garantido"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 gradient-bg text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 animate-fade-in">
              Pagamentos <span className="text-yellow-300">Simples</span> para Criadores
            </h1>
            <p className="text-xl lg:text-2xl mb-8 opacity-90 animate-fade-in">
              A plataforma de pagamentos que conecta criadores de conteúdo aos seus clientes 
              de forma segura e eficiente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
              <Link to="/register">
                <Button size="lg" className="bg-white text-diypay-600 hover:bg-gray-100 text-lg px-8">
                  Começar Gratuitamente
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
                  Fazer Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* R2 Test Section - Temporário */}
      <section className="py-20 bg-yellow-50 border-t-4 border-yellow-400">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-yellow-800 mb-2">
              🧪 Teste R2 Upload (Desenvolvimento)
            </h2>
            <p className="text-yellow-700">
              Esta seção é para testar a integração com Cloudflare R2
            </p>
          </div>
          <div className="flex justify-center">
            <R2TestUpload />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o DIYPay?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tecnologia de ponta para simplificar seus pagamentos e impulsionar seu negócio
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Planos transparentes
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Escolha o plano ideal para o seu negócio. Sem taxas ocultas.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-diypay-500 shadow-lg scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-diypay-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-diypay-600 mb-2">
                    {plan.price}
                    {plan.price === "5%" && <span className="text-sm text-gray-500"> por transação</span>}
                  </div>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className="block mt-6">
                    <Button 
                      className={`w-full ${plan.popular ? 'gradient-bg text-white' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      Começar Agora
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-bg text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <TrendingUp className="h-16 w-16 mx-auto mb-6 text-yellow-300" />
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Pronto para começar a vender?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Junte-se a milhares de criadores que já escolheram o DIYPay 
              para gerenciar seus pagamentos de forma simples e segura.
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-white text-diypay-600 hover:bg-gray-100 text-lg px-8">
                Criar Conta Gratuitamente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard className="h-8 w-8 text-diypay-500" />
                <span className="text-2xl font-bold">DIYPay</span>
              </div>
              <p className="text-gray-400">
                Simplificando pagamentos para criadores de conteúdo
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Segurança</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentação</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Comunidade</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 DIYPay. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
