import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredView?: 'producer' | 'student';
  requiredRole?: 'user' | 'producer' | 'admin';
}

const ProtectedRoute = ({ 
  children, 
  requiredView,
  requiredRole
}: ProtectedRouteProps) => {
  const { user, profile, loading, activeView } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle role-based restrictions
  if (requiredRole && profile.role !== requiredRole) {
    // Se a rota exige admin mas o usuário não é, redireciona para o dashboard apropriado
    if (profile.role === 'producer') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/members" replace />;
  }

  // Handle view-based restrictions
  if (requiredView && activeView !== requiredView) {
    // Se a rota exige a visão de produtor e o usuário não é um, não tem acesso
    if (requiredView === 'producer' && profile.role !== 'producer') {
      return <Navigate to="/members" replace />;
    }
    // Se a visão ativa não corresponde à exigida, redireciona para a home da visão correta
    const viewDashboard = activeView === 'producer' ? '/dashboard' : '/members';
    return <Navigate to={viewDashboard} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
