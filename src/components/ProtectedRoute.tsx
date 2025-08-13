
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

  // Handle role-based restrictions (for admin routes)
  if (requiredRole && profile.role !== requiredRole) {
    if (profile.role !== 'producer' && requiredRole === 'producer') {
      return <Navigate to="/members" replace />;
    }
    if (profile.role !== 'admin' && requiredRole === 'admin') {
      return <Navigate to="/members" replace />;
    }
  }

  // Handle view-based restrictions
  if (requiredView && activeView !== requiredView) {
    if (profile.role !== 'producer' && requiredView === 'producer') {
      return <Navigate to="/members" replace />;
    }
    const viewDashboard = activeView === 'producer' ? '/producer-dashboard' : '/members';
    return <Navigate to={viewDashboard} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
