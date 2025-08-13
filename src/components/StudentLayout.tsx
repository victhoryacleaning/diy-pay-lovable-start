import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogOut, Repeat } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface StudentLayoutProps {
  children: ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const { signOut, user, profile, toggleView } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleToggleView = () => {
    toggleView();
    navigate('/producer-dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Área do Aluno</h1>
          <div className="flex items-center gap-4">
            {profile?.role === 'producer' && (
              <Button variant="outline" size="sm" onClick={handleToggleView}>
                <Repeat className="h-4 w-4 mr-2" />
                Mudar para painel do produtor
              </Button>
            )}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm">{user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}