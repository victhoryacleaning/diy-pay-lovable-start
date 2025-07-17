
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AwardsModal } from '@/components/AwardsModal';
import { 
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Settings,
  LogOut,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

const menuItems = [
  {
    title: "Dashboard",
    url: "/producer-dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Produtos",
    url: "/products",
    icon: Package,
  },
  {
    title: "Vendas",
    url: "/sales", // Future implementation
    icon: ShoppingCart,
  },
  {
    title: "Assinaturas",
    url: "/producer/subscriptions",
    icon: RefreshCw,
  },
  {
    title: "Financeiro",
    url: "/financials",
    icon: CreditCard,
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
];

export function ProducerSidebar() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Fetch dashboard data for progress bar
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-producer-dashboard-v2', {
          body: { date_filter: 'last_30_days' }
        });
        
        if (!error && data) {
          setDashboardData(data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data for sidebar:', error);
      }
    };

    fetchDashboardData();
  }, []);

  const isActive = (url: string) => {
    if (url === "/producer-dashboard") {
      return location.pathname === url || location.pathname === "/";
    }
    return location.pathname.startsWith(url);
  };

  const formatRevenue = (cents: number) => {
    const reais = cents / 100;
    if (reais >= 1000000) return `${(reais / 1000000).toFixed(1)}M`;
    if (reais >= 1000) return `${(reais / 1000).toFixed(0)}K`;
    return `${reais.toFixed(0)}`;
  };

  return (
    <Sidebar className="bg-[#810ad1]">
      <SidebarHeader className="border-b border-[#4d0782] bg-[#810ad1]">
        <div className="flex items-center gap-3 px-2 py-4">
          <div className="text-lg font-bold text-white">DiyPay</div>
        </div>
        
        {/* Progress Bar Section */}
        {dashboardData && (
          <div className="px-2 pb-4">
            <AwardsModal currentRevenue={dashboardData.currentRevenue || 0}>
              <div className="cursor-pointer p-3 rounded-lg bg-[#4d0782] hover:bg-[#3d0564] transition-all duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-white" />
                  <span className="text-xs font-medium text-white">Meta de Faturamento</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white">
                    <span>R$ {formatRevenue(dashboardData.currentRevenue || 0)}</span>
                    <span>R$ {formatRevenue(dashboardData.currentMilestone || 1000000)}</span>
                  </div>
                  
                  <Progress 
                    value={dashboardData.progressPercentage || 0} 
                    className="h-2"
                  />
                  
                  <div className="text-xs text-purple-200 text-center">
                    {Math.round(dashboardData.progressPercentage || 0)}% concluído
                  </div>
                </div>
              </div>
            </AwardsModal>
          </div>
        )}
      </SidebarHeader>
      
      <SidebarContent className="bg-[#810ad1]">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                   <SidebarMenuButton 
                     asChild 
                     className={`w-full font-semibold transition-colors ${
                       isActive(item.url) 
                         ? "bg-[#4d0782] text-white hover:bg-[#4d0782]" 
                         : "text-white hover:bg-[#6b1b94] hover:text-white"
                     }`}
                   >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-[#4d0782] bg-[#810ad1]">
        <SidebarMenu>
          <SidebarMenuItem>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2 text-white hover:bg-[#4d0782] hover:text-white" 
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
