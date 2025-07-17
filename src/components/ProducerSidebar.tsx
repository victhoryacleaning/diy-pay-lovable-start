
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Settings,
  LogOut,
  RefreshCw,
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
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/producer-dashboard") {
      return location.pathname === url;
    }
    return location.pathname.startsWith(url);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "P";
    return name.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar className="bg-[#810ad1]">
      <SidebarHeader className="border-b border-[#4d0782] bg-[#810ad1]">
        <div className="flex items-center gap-3 px-2 py-4">
          <div className="text-lg font-bold text-white">DiyPay</div>
        </div>
        <div className="flex items-center gap-3 px-2 pb-4">
          <Avatar>
            <AvatarFallback className="bg-[#4d0782] text-white">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate text-white">
              {profile?.full_name || "Produtor"}
            </p>
            <p className="text-xs text-purple-200 truncate">
              {profile?.email}
            </p>
          </div>
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
                    isActive={isActive(item.url)}
                    className={`w-full font-semibold ${
                      isActive(item.url) 
                        ? "bg-[#4d0782] text-white hover:bg-[#4d0782] hover:text-white" 
                        : "text-white hover:bg-[#4d0782] hover:text-white"
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
