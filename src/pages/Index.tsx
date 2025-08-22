import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { ShieldCheck, Zap, LineChart, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="bg-white text-gray-800">
      <Header />

      <main>
        {/* === Seção Hero === */}
        <section className="bg-violet-600 text-white">
          <div className="container mx-auto px-6 py-20 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">
            {/* Coluna de Texto */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Transforme suas ideias em lucro.
              </h1>
              <p className="text-lg md:text-xl text-violet-200 mb-8 max-w-xl mx-auto lg:mx-0">
                Tudo para você vender mais na internet. Crie, gerencie e escale seu negócio digital sem complicações.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button asChild size="lg" className="bg-white text-violet-600 hover:bg-violet-100 px-8 py-3 text-base font-semibold">
                  <Link to="/register">Criar minha conta grátis</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-violet-600 px-8 py-3 text-base font-semibold">
                  <Link to="/features">Ver funcionalidades</Link>
                </Button>
              </div>
            </div>
            {/* Coluna da Imagem */}
            <div className="flex justify-center">
              <img 
                src="https://img.freepik.com/fotos-premium/a-mao-de-uma-mulher-esta-segurando-um-cartao-de-credito-na-frente-de-um-laptop_902848-89.jpg" 
                alt="Dashboard do DiyPay"
                className="rounded-lg shadow-2xl w-full max-w-md"
              />
            </div>
          </div>
        </section>

        {/* === Seção de Parceiros (Opcional, mas recomendado) === */}
        <div className="py-8 bg-slate-50">
            <div className="container mx-auto px-6">
                <p className="text-center text-sm text-slate-500 font-semibold uppercase tracking-wider">
                    Integrado com os melhores gateways do mercado
                </p>
                <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 mt-4 opacity-60">
                    {/* Substituir pelos logos reais dos seus gateways */}
                    <p className="font-bold text-xl">Asaas</p>
                    <p className="font-bold text-xl">Iugu</p>
                    <p className="font-bold text-xl">Stripe</p>
                </div>
            </div>
        </div>

        {/* === Seção de Benefícios Chave === */}
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Nossos Benefícios Chave
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              {/* Benefício 1 */}
              <div className="text-center">
                <div className="inline-block p-4 bg-violet-100 rounded-full mb-4">
                  <LineChart className="h-8 w-8 text-violet-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Venda o que quiser, como quiser</h3>
                <p className="text-gray-600">
                  Cursos, eventos, assinaturas ou doações. Crie seu produto e comece a vender em minutos com nosso checkout de alta conversão.
                </p>
              </div>
              {/* Benefício 2 */}
              <div className="text-center">
                <div className="inline-block p-4 bg-violet-100 rounded-full mb-4">
                  <ShieldCheck className="h-8 w-8 text-violet-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Segurança e Estabilidade</h3>
                <p className="text-gray-600">
                  Processamento de pagamentos robusto com os maiores gateways do mercado, garantindo que você nunca perca uma venda.
                </p>
              </div>
              {/* Benefício 3 */}
              <div className="text-center">
                <div className="inline-block p-4 bg-violet-100 rounded-full mb-4">
                  <Zap className="h-8 w-8 text-violet-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Tudo na palma da sua mão</h3>
                <p className="text-gray-600">
                  Gerencie suas vendas, assinaturas e finanças em um dashboard simples e poderoso, acessível de qualquer lugar.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* === Novo Rodapé === */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Coluna da Logo e Newsletter */}
            <div className="lg:col-span-2">
              <img src="/logo-diypay.png" alt="Logo DiyPay" className="h-10 mb-4" />
              <p className="text-gray-400 max-w-sm mb-6">
                Junte-se a nossa newsletter para receber as últimas notícias e atualizações.
              </p>
              <form className="flex">
                <Input type="email" placeholder="Seu email" className="bg-gray-800 border-gray-700 text-white rounded-r-none" />
                <Button type="submit" className="bg-violet-600 hover:bg-violet-700 rounded-l-none">
                  Inscrever-se
                </Button>
              </form>
            </div>
            {/* Coluna de Menu */}
            <div>
              <h3 className="font-semibold mb-4">Menu</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/features" className="hover:text-white">Funcionalidades</Link></li>
                <li><Link to="/pricing" className="hover:text-white">Preços</Link></li>
                <li><Link to="/login" className="hover:text-white">Login</Link></li>
              </ul>
            </div>
            {/* Coluna de Ajuda */}
            <div>
              <h3 className="font-semibold mb-4">Ajuda</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/p/termos-de-uso" className="hover:text-white">Termos de Uso</Link></li>
                <li><Link to="/p/politicas-de-privacidade" className="hover:text-white">Políticas de Privacidade</Link></li>
                <li><Link to="/p/contato" className="hover:text-white">Contato</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            <p>Copyright © DiyPay 2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
