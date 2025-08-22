import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { ArrowRight, ShoppingCart, Tv, Store } from "lucide-react";

const Index = () => {
  return (
    <div className="bg-slate-900 text-white">
      <Header />

      <main>
        {/* === Seção Hero === */}
        <section 
          className="relative min-h-screen flex items-center bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop')" }}
        >
          <div className="absolute inset-0 bg-slate-900/40"></div>
          <div className="relative container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            {/* Coluna de Texto */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
                Transforme suas ideias em <span className="text-violet-400">lucro</span>.
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0">
                Tudo para você vender mais na internet e faturar como nunca.
              </p>
            </div>
            {/* Card Flutuante */}
            <div className="flex justify-center relative z-10">
              <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl text-center max-w-sm">
                <h2 className="text-2xl font-bold mb-4">Venda tudo na internet com a DiyPay.</h2>
                <Button asChild size="lg" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 text-base relative z-10">
                  <Link to="/register">Cadastre-se agora <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* === Seção "Venda o que quiser" === */}
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-violet-600/20 border border-violet-500/30 p-6 rounded-2xl text-center">
                <ShoppingCart className="h-10 w-10 mx-auto mb-4 text-violet-400" />
                <h3 className="font-bold text-lg">Produtos Físicos</h3>
              </div>
              <div className="bg-violet-600/20 border border-violet-500/30 p-6 rounded-2xl text-center">
                <Tv className="h-10 w-10 mx-auto mb-4 text-violet-400" />
                <h3 className="font-bold text-lg">Produtos Digitais</h3>
              </div>
              <div className="bg-violet-600/20 border border-violet-500/30 p-6 rounded-2xl text-center col-span-2">
                <Store className="h-10 w-10 mx-auto mb-4 text-violet-400" />
                <h3 className="font-bold text-lg">Eventos e Ingressos</h3>
              </div>
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Venda o que quiser no digital.</h2>
              <p className="text-slate-300 text-lg">
                Seja você produtor, coprodutor ou gerente de afiliados, nossa plataforma oferece infinitas oportunidades para monetizar seus produtos e serviços.
              </p>
            </div>
          </div>
        </section>

        {/* === Seção "Tecnologia" === */}
        <section 
          className="py-20 lg:py-32 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618172193622-ae2d025f4032?q=80&w=2070&auto=format&fit=crop')" }}
        >
          <div className="absolute inset-0 bg-slate-900/80"></div>
          <div className="relative container mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Tecnologia que te faz vender mais.</h2>
            <p className="text-xl text-slate-300 mb-12">Do primeiro passo ao sucesso milionário.</p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl">Maior conversão, maior faturamento.</div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl">Escala e recuperação de vendas.</div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl">Mais vendas com afiliados e influencers.</div>
            </div>
          </div>
        </section>

        {/* === Seção "Tudo na palma da mão" === */}
        <section className="py-20 lg:py-28">
            <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                <div>
                    <h2 className="text-3xl lg:text-4xl font-bold mb-4">Como um clique, tenha tudo na palma da mão.</h2>
                    <p className="text-slate-300 text-lg mb-6">
                        Para garantir uma jornada de milhões, integre processos e ferramentas, gerencie resultados em tempo real por meio de um Dashboard completo, painéis personalizados e relatórios.
                    </p>
                    <Link to="/features" className="text-violet-400 font-semibold hover:text-violet-300">
                        Conheça todas as funcionalidades <ArrowRight className="inline h-5 w-5" />
                    </Link>
                </div>
                <div>
                    <img src="/placeholder-dashboard-mobile.png" alt="Dashboard DiyPay no celular" className="rounded-2xl shadow-2xl" />
                </div>
            </div>
        </section>
        
        {/* === Seção Depoimentos === */}
        <section className="py-20 lg:py-28 bg-slate-800/50">
            <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                <div>
                    <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop" alt="Produtor de sucesso" className="rounded-2xl shadow-2xl object-cover h-full w-full" />
                </div>
                <div>
                    <h2 className="text-3xl lg:text-4xl font-bold mb-4">Vibramos com suas conquistas.</h2>
                    <p className="text-slate-300 text-lg mb-8">
                        Estamos ao seu lado para te apoiar na rota dos milhões. Quanto mais faturamento, maior seu reconhecimento.
                    </p>
                    <div className="bg-violet-600/20 border border-violet-500/30 p-8 rounded-2xl">
                        <p className="text-lg italic mb-6">"Eu já recebi convite de várias plataformas, mas ninguém tem o atendimento da DiyPay. Sempre tem uma solução para qualquer coisa e eu sinto uma evolução mensal no atendimento."</p>
                        <p className="font-bold">Luan Aires</p>
                        <p className="text-violet-400">Produtor fatura + de R$ 3 mi em 1 ano</p>
                    </div>
                </div>
            </div>
        </section>
      </main>

      {/* === Rodapé === */}
      <footer className="bg-slate-900 border-t border-slate-800">
        <div className="container mx-auto px-6 py-12">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
                <div>
                    <h3 className="font-bold text-lg mb-4">DIYPAY</h3>
                    <ul className="space-y-2 text-slate-400">
                        <li><Link to="/about" className="hover:text-white">A empresa</Link></li>
                        <li><Link to="/affiliates" className="hover:text-white">Seja um Afiliado</Link></li>
                        <li><Link to="/support" className="hover:text-white">Suporte</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-4">SOLUÇÕES</h3>
                     <ul className="space-y-2 text-slate-400">
                        <li><Link to="/features/digital-products" className="hover:text-white">Produto Digital</Link></li>
                        <li><Link to="/features/subscriptions" className="hover:text-white">Assinaturas</Link></li>
                        <li><Link to="/features/events" className="hover:text-white">Eventos</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-4">POLÍTICA E TERMOS</h3>
                    <ul className="space-y-2 text-slate-400">
                        <li><Link to="/p/politicas-de-privacidade" className="hover:text-white">Política de privacidade</Link></li>
                        <li><Link to="/p/termos-de-uso" className="hover:text-white">Termos e condições de uso</Link></li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
                <p>Copyright © DiyPay 2025. Todos os direitos reservados.</p>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;