import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  cpf_cnpj: string | null;
  phone: string | null;
  instagram_handle: string | null;
  role: 'user' | 'producer' | 'admin';
  iugu_customer_id: string | null;
  created_at: string;
  updated_at: string;
  verification_status: 'pending_submission' | 'pending_approval' | 'approved' | 'rejected';
  person_type: 'PF' | 'PJ' | null;
  cpf: string | null;
  birth_date: string | null;
  cnpj: string | null;
  company_name: string | null;
  trading_name: string | null;
  opening_date: string | null;
  company_phone: string | null;
  responsible_name: string | null;
  responsible_cpf: string | null;
  responsible_birth_date: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  social_contract_url: string | null;
}

type ActiveView = 'producer' | 'student';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isGoogleUser: boolean;
  activeView: ActiveView;
  toggleView: () => void;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('producer');
  const navigate = useNavigate();
  const location = useLocation();

  const user = session?.user ?? null;
  const isGoogleUser = user?.app_metadata?.provider === 'google';

  const fetchUserProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;

      setProfile(data as Profile);
      if (data.role === 'producer') {
        setActiveView('producer');
      } else {
        setActiveView('student');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null); // Garante que o perfil seja nulo em caso de erro
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setLoading(true);
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          if (newSession.user.app_metadata.provider === 'google') {
            const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', newSession.user.id).single();
            if (!existingProfile) {
              await supabase.from('profiles').upsert({
                id: newSession.user.id,
                email: newSession.user.email,
                full_name: newSession.user.user_metadata?.full_name || newSession.user.user_metadata?.name,
                avatar_url: newSession.user.user_metadata?.avatar_url,
                verification_status: 'pending_submission'
              });
            }
          }
          await fetchUserProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          navigate('/login', { replace: true });
        }
        setLoading(false);
      }
    );
    
    // Verificação da sessão inicial
    setLoading(true);
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      await fetchUserProfile(initialSession?.user?.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, navigate]);

  // Efeito para redirecionar o usuário APÓS o perfil ser carregado
  useEffect(() => {
    if (!loading && profile && (location.pathname === '/login' || location.pathname === '/register')) {
      const roleRedirects = {
        'producer': '/dashboard',
        'admin': '/admin/dashboard',
        'user': '/members'
      };
      navigate(roleRedirects[profile.role] || '/', { replace: true });
    }
  }, [profile, loading, location, navigate]);
  
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Usuário não autenticado' };
    try {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single();
      if (error) throw error;
      setProfile(data as Profile);
      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  };
  
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao fazer logout.');
      console.error('Error signing out:', error);
    }
    // A limpeza de estado e redirecionamento agora é tratada pelo onAuthStateChange
  };

  const signUp = async (email, password, fullName) => { /* ...seu código original... */ };
  const signInWithGoogle = async () => { /* ...seu código original... */ };
  const signIn = async (email, password) => { /* ...seu código original... */ };
  const toggleView = () => { /* ...seu código original... */ };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isGoogleUser, activeView, toggleView, signUp, signIn, signInWithGoogle, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};
