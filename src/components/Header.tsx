import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, User, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { formatUserName } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "#", label: "Taxa" },
  { href: "#", label: "Blog" },
  { href: "#", label: "Sobre" },
  { href: "#", label: "Suporte" },
];

const Header = () => {
  const { user, profile, signOut } = useAuth();
  
  const isLoggedIn = !!user;
  const currentRole = profile?.role ?? 'user';
  const displayName = profile?.full_name ? formatUserName(profile.full_name) : 'Usuário';

  const getRoleDashboardLink = (role: string) => {
    switch (role) {
      case 'producer': return '/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/members';
    }
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logo-diypay.png" alt="Logo DiyPay" className="h-12" />
          </Link>

          {/* Navegação Principal (Desktop) */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.label} to={link.href} className="font-bold text-base text-violet-700 hover:text-violet-900 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Ações do Usuário (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {!isLoggedIn ? (
              <>
                <Button asChild variant="ghost" className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild className="bg-violet-600 hover:bg-violet-700 font-bold">
                  <Link to="/register">Cadastrar-se</Link>
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span className="font-bold">{displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to={getRoleDashboardLink(currentRole)} className="flex items-center">
                      Painel {profile?.role === 'producer' ? 'Produtor' : 'Membro'}
                    </Link>
                  </DropdownMenuItem>
                  {currentRole === 'producer' && (
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center"><Settings className="mr-2 h-4 w-4" />Configurações</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-600"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Menu Mobile */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {navLinks.map((link) => (
                  <DropdownMenuItem key={link.label} asChild>
                    <Link to={link.href}>{link.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                
                {!isLoggedIn ? (
                  <>
                    <DropdownMenuItem asChild><Link to="/login">Entrar</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/register">Cadastrar-se</Link></DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild><Link to={getRoleDashboardLink(currentRole)}>Painel</Link></DropdownMenuItem>
                    {currentRole === 'producer' && <DropdownMenuItem asChild><Link to="/settings">Configurações</Link></DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-red-600">Sair</DropdownMenuItem>
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
