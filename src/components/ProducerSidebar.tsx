
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
    url: "/settings", // Future implementation
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
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-4">
          <Avatar>
            <AvatarFallback className="bg-diypay-500 text-white">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {profile?.full_name || "Produtor"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="w-full"
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
      
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2" 
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
