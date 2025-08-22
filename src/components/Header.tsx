import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreditCard, LogOut, Menu, User, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { formatUserName } from "@/lib/utils";

interface HeaderProps {
  isAuthenticated?: boolean;
  userRole?: 'user' | 'producer' | 'admin';
  userName?: string;
}

const Header = ({ 
  isAuthenticated, 
  userRole, 
  userName 
}: HeaderProps) => {
  const { user, profile, signOut } = useAuth();
  
  const isLoggedIn = isAuthenticated ?? !!user;
  const currentRole = userRole ?? profile?.role ?? 'user';
  const displayName = userName ? formatUserName(userName) : (profile?.full_name ? formatUserName(profile.full_name) : 'Usuário');

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'producer': return 'Produtor';
      case 'admin': return 'Administrador';
      default: return 'Membro';
    }
  };

  const getRoleDashboardLink = (role: string) => {
    switch (role) {
      case 'producer': return '/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/members'; // CORREÇÃO AQUI: de /member-area para /members
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo-diypay.png" alt="Logo DiyPay" className="h-8" />
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            {!isLoggedIn ? (
              <>
                <Link to="/login"><Button variant="ghost">Entrar</Button></Link>
                <Link to="/register"><Button>Cadastrar-se</Button></Link>
              </>
            ) : (
              <>
                <Link 
                  to={getRoleDashboardLink(currentRole)} 
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Painel {getRoleDisplayName(currentRole)}
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{displayName}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* CORREÇÃO AQUI: Link de configurações contextual */}
                    {currentRole === 'producer' && (
                       <DropdownMenuItem asChild>
                        <Link to="/settings" className="flex items-center"><Settings className="mr-2 h-4 w-4" />Configurações</Link>
                      </DropdownMenuItem>
                    )}
                    {currentRole === 'producer' && (
                      <DropdownMenuItem asChild>
                        <Link to="/complete-producer-profile" className="flex items-center"><CreditCard className="mr-2 h-4 w-4" />Dados Bancários</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </nav>

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {!isLoggedIn ? (
                  <>
                    <DropdownMenuItem asChild><Link to="/login">Entrar</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/register">Cadastrar-se</Link></DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild><Link to={getRoleDashboardLink(currentRole)}>Painel {getRoleDisplayName(currentRole)}</Link></DropdownMenuItem>
                    {currentRole === 'producer' && (
                      <DropdownMenuItem asChild><Link to="/settings">Configurações</Link></DropdownMenuItem>
                    )}
                    {currentRole === 'producer' && (
                      <DropdownMenuItem asChild><Link to="/complete-producer-profile">Dados Bancários</Link></DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">Sair</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
