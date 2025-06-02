
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

interface HeaderProps {
  isAuthenticated?: boolean;
  userRole?: 'user' | 'producer' | 'admin';
  userName?: string;
  onLogout?: () => void;
}

const Header = ({ 
  isAuthenticated = false, 
  userRole = 'user', 
  userName = 'Usuário',
  onLogout 
}: HeaderProps) => {
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'producer': return 'Produtor';
      case 'admin': return 'Administrador';
      default: return 'Membro';
    }
  };

  const getRoleDashboardLink = (role: string) => {
    switch (role) {
      case 'producer': return '/producer-dashboard';
      case 'admin': return '/admin-dashboard';
      default: return '/member-area';
    }
  };

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <CreditCard className="h-8 w-8 text-diypay-600" />
            <span className="text-2xl font-bold text-diypay-700">DIYPay</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {!isAuthenticated ? (
              <>
                <Link to="/about" className="text-gray-600 hover:text-diypay-600 transition-colors">
                  Sobre
                </Link>
                <Link to="/pricing" className="text-gray-600 hover:text-diypay-600 transition-colors">
                  Preços
                </Link>
                <Link to="/login">
                  <Button variant="ghost" className="text-diypay-600">
                    Entrar
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="gradient-bg text-white hover:opacity-90">
                    Cadastrar-se
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to={getRoleDashboardLink(userRole)} 
                  className="text-gray-600 hover:text-diypay-600 transition-colors"
                >
                  Painel {getRoleDisplayName(userRole)}
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{userName}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Configurações
                      </Link>
                    </DropdownMenuItem>
                    {userRole === 'producer' && (
                      <DropdownMenuItem asChild>
                        <Link to="/complete-producer-profile" className="flex items-center">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Dados Bancários
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </nav>

          {/* Mobile menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {!isAuthenticated ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/about">Sobre</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/pricing">Preços</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/login">Entrar</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/register">Cadastrar-se</Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to={getRoleDashboardLink(userRole)}>
                        Painel {getRoleDisplayName(userRole)}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile">Configurações</Link>
                    </DropdownMenuItem>
                    {userRole === 'producer' && (
                      <DropdownMenuItem asChild>
                        <Link to="/complete-producer-profile">Dados Bancários</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-red-600">
                      Sair
                    </DropdownMenuItem>
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
