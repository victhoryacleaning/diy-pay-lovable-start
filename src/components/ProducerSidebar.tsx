
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
import { Skeleton } from '@/components/ui/skeleton';
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

interface ProducerSidebarProps {
  dashboardData?: any;
  isLoading?: boolean;
}

export function ProducerSidebar({ dashboardData, isLoading }: ProducerSidebarProps) {
  const { signOut } = useAuth();
  const location = useLocation();

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
        <div className="px-2 pb-4">
          {isLoading ? (
            <div className="p-3 rounded-lg bg-[#4d0782]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-white" />
                <span className="text-xs font-medium text-white">Meta de Faturamento</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-8 bg-[#3d0564]" />
                  <Skeleton className="h-3 w-8 bg-[#3d0564]" />
                </div>
                <Skeleton className="h-2 w-full bg-[#3d0564]" />
                <div className="text-center">
                  <Skeleton className="h-3 w-16 bg-[#3d0564] mx-auto" />
                </div>
              </div>
            </div>
          ) : dashboardData ? (
            <AwardsModal currentRevenue={dashboardData.currentRevenue || dashboardData.kpiValorLiquido || 0}>
              <div className="cursor-pointer p-3 rounded-lg bg-[#4d0782] hover:bg-[#3d0564] transition-all duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-white" />
                  <span className="text-xs font-medium text-white">Meta de Faturamento</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white">
                    <span>R$ {formatRevenue(dashboardData.currentRevenue || dashboardData.kpiValorLiquido || 0)}</span>
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
          ) : null}
        </div>
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
