
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  CreditCard,
  LogOut 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const ProducerSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/producer' },
    { icon: Package, label: 'Produtos', path: '/producer/products' },
    { icon: ShoppingCart, label: 'Vendas', path: '/producer/sales' },
    { icon: Users, label: 'Assinaturas', path: '/producer/subscriptions' },
    { icon: CreditCard, label: 'Financeiro', path: '/producer/financials' },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="w-64 bg-white shadow-lg h-screen flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-gray-800">Painel do Produtor</h2>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t">
        <Button 
          onClick={handleSignOut}
          variant="ghost" 
          className="w-full justify-start text-gray-600 hover:text-red-600"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default ProducerSidebar;
