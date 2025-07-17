import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { User, Webhook, Code, ArrowLeft } from 'lucide-react';

export default function SettingsHubPage() {
  const settingsItems = [
    {
      icon: User,
      title: "Minha Conta",
      description: "Gerencie suas informações pessoais",
      link: "/settings/account"
    },
    {
      icon: Webhook,
      title: "Webhooks",
      description: "Configure notificações automáticas",
      link: "/settings/webhooks"
    },
    {
      icon: Code,
      title: "API",
      description: "Gerencie suas chaves de API",
      link: "/settings/api"
    }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/producer-dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold">Configurações</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsItems.map((item) => (
          <Link key={item.title} to={item.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}