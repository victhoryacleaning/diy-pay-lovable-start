
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: 'user' | 'producer' | 'admin';
  redirectTo?: string;
}

const ProtectedRoute = ({ 
  children, 
  requiredRole,
  redirectTo = '/login' 
}: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-diypay-600" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (requiredRole && profile.role !== requiredRole) {
    // Redirect based on user role
    const roleRedirects = {
      'producer': '/producer-dashboard',
      'admin': '/admin-dashboard',
      'user': '/member-area'
    };
    
    return <Navigate to={roleRedirects[profile.role]} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
